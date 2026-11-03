import { useId, useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { map } from './core/MapView';
import { formatTime, getIconStatusColor } from '../common/util/formatter';
import { getDeviceFreshness } from '../common/util/deviceStatus';
import { mapIconKey } from './core/preloadImages';
import { useAttributePreference } from '../common/util/preferences';
import { useCatchCallback } from '../reactHelper';
import { findFonts, fromMapCoordinates, toMapCoordinates } from './core/mapUtil';

// background.svg is a 48px icon whose outer ring sits at radius 4.55 within its 0-10 viewBox.
const MARKER_NATIVE_SIZE = 48;
const MARKER_EDGE_RADIUS_RATIO = 4.55 / 5;
const MARKER_ICON_SCALE = { default: 1, selected: 1.35 };
// direction.svg is rasterized at 100px (10x its viewBox) for sharpness at large
// icon-size values, so these are 10x smaller than the intended apparent scale.
const DIRECTION_ICON_SCALE = { default: 0.33, selected: 0.4 };

// Pixel offset (in the direction icon's own icon-size units) that lands the
// arrow's anchor on the marker's outer ring, independent of iconScale.
const markerEdgeOffset = (state) =>
  (MARKER_EDGE_RADIUS_RATIO * (MARKER_NATIVE_SIZE / 2) * MARKER_ICON_SCALE[state]) /
  DIRECTION_ICON_SCALE[state];

// Devices can go stale without sending anything, so re-check freshness periodically
const STALE_CHECK_INTERVAL_MS = 60 * 1000;

const formatFeatureTitle = (position, device, titleField) => {
  if (!titleField) {
    return device.name;
  }

  const value = position[titleField];
  if (!value) {
    return device.name;
  }

  return titleField === 'fixTime' ? formatTime(value, 'seconds') : value;
};

const getFeatureCacheKey = (position, device, isStale, titleField, showStatus) =>
  [
    position.id,
    position.course,
    position.attributes?.motionStatus,
    isStale,
    device.name,
    device.category,
    titleField,
    titleField ? position[titleField] : null,
    showStatus,
  ].join('|');

const MapPositions = ({
  positions,
  onMapClick,
  onMarkerClick,
  showStatus,
  titleField,
  isReplay,
  disabled,
}) => {
  const id = useId();
  const clusters = `${id}-clusters`;
  const selected = `${id}-selected`;
  const Replay = isReplay || false;
  const prevPositionsRef = useRef({});

  const iconScale = useAttributePreference('iconScale', 0.75);

  const devices = useSelector((state) => state.devices.items);
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);

  const mapCluster = useAttributePreference('mapCluster', true);

  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!showStatus) return undefined;
    const interval = setInterval(() => setNow(Date.now()), STALE_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [showStatus]);

  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const createFeature = useCallback(
    (position, device, isStale) => ({
      id: position.id,
      deviceId: position.deviceId,
      name: formatFeatureTitle(position, device, titleField),
      category: mapIconKey(device.category),
      color:
        !showStatus || isStale ? 'neutral' : getIconStatusColor(position.attributes?.motionStatus),
      rotation: position.course,
      dynamicDirection: position.attributes?.motionStatus === 'moving',
    }),
    [showStatus, titleField],
  );

  const onMouseEnter = useCallback(() => {
    map.getCanvas().style.cursor = 'pointer';
  }, []);

  const onMouseLeave = useCallback(() => {
    map.getCanvas().style.cursor = '';
  }, []);

  const onMapClickCallback = useCallback(
    (event) => {
      if (!event.defaultPrevented && onMapClick) {
        const [longitude, latitude] = fromMapCoordinates(event.lngLat.lng, event.lngLat.lat);
        onMapClick(latitude, longitude);
      }
    },
    [onMapClick],
  );

  const onMarkerClickCallback = useCallback(
    (event) => {
      if (disabledRef.current) return;
      event.preventDefault();
      const feature = event.features[0];
      if (onMarkerClick) {
        onMarkerClick(feature.properties.id, feature.properties.deviceId);
      }
    },
    [onMarkerClick],
  );

  const onClusterClick = useCatchCallback(
    async (event) => {
      if (disabledRef.current) return;
      event.preventDefault();
      const features = map.queryRenderedFeatures(event.point, {
        layers: [clusters],
      });
      const clusterId = features[0].properties.cluster_id;
      const zoom = await map.getSource(id).getClusterExpansionZoom(clusterId);
      map.easeTo({
        center: features[0].geometry.coordinates,
        zoom,
      });
    },
    [clusters, id],
  );

  useEffect(() => {
    map.addSource(id, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
      cluster: mapCluster,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    });
    map.addSource(selected, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    });
    const fonts = findFonts(map);
    [id, selected].forEach((source) => {
      // Selected device lives in its own source, so its size is fixed per layer
      const state = source === selected ? 'selected' : 'default';
      map.addLayer({
        id: source,
        type: 'symbol',
        source,
        filter: ['!has', 'point_count'],
        layout: {
          'icon-image': '{category}-{color}',
          'icon-size': iconScale * MARKER_ICON_SCALE[state],
          'icon-allow-overlap': true,
          'text-field': Replay ? '' : ['get', 'name'],
          'text-allow-overlap': true,
          'text-anchor': 'bottom',
          'text-offset': [0, -2 * iconScale],
          'text-font': fonts,
          'text-size': 15,
          'symbol-sort-key': ['get', 'id'],
        },
        paint: {
          'text-halo-width': 15,
          'text-halo-color': 'rgba(75, 105, 134, 0.9)',
          'text-color': 'white',
        },
      });
      map.addLayer({
        id: `direction-${source}`,
        type: 'symbol',
        source,
        filter: ['all', ['!has', 'point_count'], ['==', 'dynamicDirection', true]],
        layout: {
          'icon-image': 'direction',
          'icon-size': iconScale * DIRECTION_ICON_SCALE[state],
          'icon-offset': [0, -markerEdgeOffset(state)],
          'icon-allow-overlap': true,
          'icon-rotate': ['get', 'rotation'],
          'icon-rotation-alignment': 'map',
        },
      });

      map.on('mouseenter', source, onMouseEnter);
      map.on('mouseleave', source, onMouseLeave);
      map.on('click', source, onMarkerClickCallback);
    });
    map.addLayer({
      id: clusters,
      type: 'symbol',
      source: id,
      filter: ['has', 'point_count'],
      layout: {
        'icon-image': 'backclust',
        'icon-size': iconScale * 0.65,
        'text-field': '{point_count_abbreviated}',
        'text-font': fonts,
        'text-size': 16,
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': 'rgba(255, 255, 255, 0.3)',
        'text-halo-width': 1,
      },
    });

    map.on('mouseenter', clusters, onMouseEnter);
    map.on('mouseleave', clusters, onMouseLeave);
    map.on('click', clusters, onClusterClick);
    map.on('click', onMapClickCallback);

    return () => {
      map.off('mouseenter', clusters, onMouseEnter);
      map.off('mouseleave', clusters, onMouseLeave);
      map.off('click', clusters, onClusterClick);
      map.off('click', onMapClickCallback);

      if (map.getLayer(clusters)) {
        map.removeLayer(clusters);
      }

      [id, selected].forEach((source) => {
        map.off('mouseenter', source, onMouseEnter);
        map.off('mouseleave', source, onMouseLeave);
        map.off('click', source, onMarkerClickCallback);

        if (map.getLayer(source)) {
          map.removeLayer(source);
        }
        if (map.getLayer(`direction-${source}`)) {
          map.removeLayer(`direction-${source}`);
        }
        if (map.getSource(source)) {
          map.removeSource(source);
        }
      });
    };
  }, [
    Replay,
    clusters,
    iconScale,
    id,
    mapCluster,
    onClusterClick,
    onMapClickCallback,
    onMarkerClickCallback,
    onMouseEnter,
    onMouseLeave,
    selected,
  ]);

  useEffect(() => {
    const sourceMain = map.getSource(id);
    const sourceSelected = map.getSource(selected);

    if (!sourceMain || !sourceSelected) return;

    const prev = prevPositionsRef.current;
    const next = {};

    const mainFeatures = [];
    const selectedFeatures = [];

    for (const position of positions) {
      const device = devices[position.deviceId];
      if (!device) continue;

      const { isStale } = getDeviceFreshness(device, position, now);
      const prevPos = prev[position.deviceId];
      const cacheKey = getFeatureCacheKey(position, device, isStale, titleField, showStatus);
      const properties =
        prevPos?.cacheKey === cacheKey
          ? prevPos.properties
          : createFeature(position, device, isStale);

      const feature = {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: toMapCoordinates(position.longitude, position.latitude),
        },
        properties,
      };

      if (position.deviceId === selectedDeviceId) {
        selectedFeatures.push(feature);
      } else {
        mainFeatures.push(feature);
      }

      next[position.deviceId] = { cacheKey, properties };
    }

    sourceMain.setData({
      type: 'FeatureCollection',
      features: mainFeatures,
    });

    sourceSelected.setData({
      type: 'FeatureCollection',
      features: selectedFeatures,
    });

    prevPositionsRef.current = next;
  }, [
    createFeature,
    devices,
    id,
    now,
    positions,
    selected,
    selectedDeviceId,
    showStatus,
    titleField,
  ]);

  return null;
};

export default MapPositions;
