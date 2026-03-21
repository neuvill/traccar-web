import { useId, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { map } from './core/MapView';
import { formatTime, getStatusColor, getIconStatusColor } from '../common/util/formatter';
import { mapIconKey } from './core/preloadImages';
import { useAttributePreference } from '../common/util/preferences';
import { useCatchCallback } from '../reactHelper';
import { findFonts } from './core/mapUtil';
import dayjs from 'dayjs';
//import { Color } from 'maplibre-gl';

const MapPositions = ({ positions, onMapClick, onMarkerClick, showStatus, selectedPosition, titleField, isReplay }) => {
  const id = useId();
  const clusters = `${id}-clusters`;
  const selected = `${id}-selected`;
  const Replay = isReplay || false;
  //console.log('positions', positions[0].deviceId);

  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const iconScale = useAttributePreference('iconScale', desktop ? 0.75 : 0.75);

  const devices = useSelector((state) => state.devices.items);
  //console.log('devices', devices[56]);

  const selectedDeviceId = useSelector((state) => state.devices.selectedId);

  const mapCluster = useAttributePreference('mapCluster', true);
  //const directionType = useAttributePreference('mapDirection', 'selected');

  function getLastItemUpdate(item) {
    if (!item.lastUpdate) {
      return false;
    }

    return dayjs().diff(dayjs(item.lastUpdate), 'hour', true) > 3;
  }

  /*function getItemCategory(item) {

    return console.log(item.category);
    ;
  }*/

  const createFeature = (devices, position, selectedPositionId) => {
    const device = devices[position.deviceId];
    /*let showDirection;
    switch (directionType) {
      case 'none':
        showDirection = false;
        break;
      case 'all':
        showDirection = position.course > 0;
        break;
      default:
        showDirection = selectedPositionId === position.id && position.course > 0;
        break;
    }*/
    const isSelected = position.deviceId === selectedDeviceId;
    return {
      id: position.id,
      deviceId: position.deviceId,
      name: device.name,
      fixTime: formatTime(position.fixTime, 'seconds'),
      //category: position ? getLastItemUpdate(device) ? 'still' : mapIconKey(position.attributes.motionStatus) : mapIconKey(device.category), // Map icon depending on device category
      category: mapIconKey(device.category),
      //color: showStatus ? position.attributes.color || getStatusColor(device.status) : 'neutral',
      color: position ? getLastItemUpdate(device) ? 'neutral' : getIconStatusColor(position.attributes.motionStatus) : 'neutral',
      //Color: 'info',
      rotation: position.course,
      //direction: showDirection,
      dynamicDirection: (position.attributes.motionStatus === 'moving'), //show direction for the moving icone and hide the direction layer
      isSelected,
    };
  };

  const onMouseEnter = () => (map.getCanvas().style.cursor = 'pointer');
  const onMouseLeave = () => (map.getCanvas().style.cursor = '');

  const onMapClickCallback = useCallback(
    (event) => {
      if (!event.defaultPrevented && onMapClick) {
        onMapClick(event.lngLat.lat, event.lngLat.lng);
      }
    },
    [onMapClick],
  );

  const onMarkerClickCallback = useCallback(
    (event) => {
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
    [clusters],
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
            iconScale * 1.35, // bigger when selected
            iconScale
          ],
          'icon-allow-overlap': true,
          /*'icon-rotate': [
            'case',
            ['==', ['get', 'dynamicDirection'], true],
            ['get', 'rotation'],
            0
          ],*/

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
          //['==', 'direction', true],
          ['==', 'dynamicDirection', true], // do not show direction for the dynamic category
        ],
        layout: {
          'icon-image': 'direction',
          'icon-size': [
            'case',
            ['==', ['get', 'isSelected'], true],
            iconScale * 1.5, // bigger when selected
            iconScale * 1.15
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
        //'icon-allow-overlap': false,
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
  }, [mapCluster, clusters, onMarkerClickCallback, onClusterClick]);

  useEffect(() => {
    [id, selected].forEach((source) => {
      map.getSource(source)?.setData({
        type: 'FeatureCollection',
        features: positions
          .filter((it) => devices.hasOwnProperty(it.deviceId))
          .filter((it) =>
            source === id ? it.deviceId !== selectedDeviceId : it.deviceId === selectedDeviceId,
          )
          .map((position) => ({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [position.longitude, position.latitude],
            },
            properties: createFeature(devices, position, selectedPosition && selectedPosition.id),
          })),
      });
    });
  }, [mapCluster, clusters, onMarkerClick, onClusterClick, devices, positions, selectedPosition, isReplay, selectedDeviceId]);

  return null;
};

export default MapPositions;
