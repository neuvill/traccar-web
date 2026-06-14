import { useId, useCallback, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import dayjs from 'dayjs';
import { map } from './core/MapView';
import { formatTime, getIconStatusColor } from '../common/util/formatter';
import { mapIconKey } from './core/preloadImages';
import { useAttributePreference } from '../common/util/preferences';
import { useCatchCallback } from '../reactHelper';
import { findFonts, fromMapCoordinates, toMapCoordinates } from './core/mapUtil';

const isDeviceStale = (device) => {
  if (!device.lastUpdate) {
    return false;
  }

  return dayjs().diff(dayjs(device.lastUpdate), 'hour', true) > 3;
};

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

const getFeatureCacheKey = (position, device, selectedDeviceId, titleField, showStatus) =>
  [
    position.id,
    position.latitude,
    position.longitude,
    position.course,
    position.fixTime,
    position.attributes?.motionStatus,
    selectedDeviceId,
    device.name,
    device.category,
    device.lastUpdate,
    titleField,
    titleField ? position[titleField] : null,
    showStatus,
  ].join('|');

const MapPositions = ({
  positions,
  onMapClick,
  onMarkerClick,
  showStatus,
  selectedPosition,
  titleField,
  isReplay,
  disabled,
}) => {
  const id = useId();
  const clusters = `${id}-clusters`;
  const selected = `${id}-selected`;
  const Replay = isReplay || false;
  const prevPositionsRef = useRef({});

  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const iconScale = useAttributePreference('iconScale', desktop ? 0.75 : 0.75);

  const devices = useSelector((state) => state.devices.items);
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);

  const mapCluster = useAttributePreference('mapCluster', true);

  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const createFeature = useCallback(
    (position) => {
      const device = devices[position.deviceId];
      if (!device) return null;

      const isSelected = position.deviceId === selectedDeviceId;

      return {
        id: position.id,
        deviceId: position.deviceId,
        name: formatFeatureTitle(position, device, titleField),
        fixTime: formatTime(position.fixTime, 'seconds'),
        category: mapIconKey(device.category),
        color:
          !showStatus || isDeviceStale(device)
            ? 'neutral'
            : getIconStatusColor(position?.attributes?.motionStatus),
        rotation: position.course,
        dynamicDirection: position?.attributes?.motionStatus === 'moving',
        isSelected,
      };
    },
    [devices, selectedDeviceId, showStatus, titleField],
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
    [id, selected].forEach((source) => {
      map.addLayer({
        id: source,
        type: 'symbol',
        source,
        filter: ['!has', 'point_count'],
        layout: {
          'icon-image': '{category}-{color}',
          'icon-size': [
            'case',
            ['==', ['get', 'isSelected'], true],
            iconScale * 1.35,
            iconScale,
          ],
          'icon-allow-overlap': true,
          'text-field': Replay ? '' : ['get', 'name'],
          'text-allow-overlap': true,
          'text-anchor': 'bottom',
          'text-offset': [0, -2 * iconScale],
          'text-font': findFonts(map),
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
        filter: [
          'all',
          ['!has', 'point_count'],
          ['==', 'dynamicDirection', true],
        ],
        layout: {
          'icon-image': 'direction',
          'icon-size': [
            'case',
            ['==', ['get', 'isSelected'], true],
            iconScale * 1.5,
            iconScale * 1.15,
          ],
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
        'text-font': findFonts(map),
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

      const prevPos = prev[position.deviceId];
      const cacheKey = getFeatureCacheKey(
        position,
        device,
        selectedDeviceId,
        titleField,
        showStatus,
      );
      const changed = prevPos?.cacheKey !== cacheKey;

      const properties = changed ? createFeature(position) : prevPos?.properties;

      if (!properties) continue;

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

      next[position.deviceId] = {
        ...position,
        cacheKey,
        properties,
      };
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
  }, [createFeature, devices, id, positions, selected, selectedDeviceId, showStatus, titleField]);

  return null;
};

export default MapPositions;
