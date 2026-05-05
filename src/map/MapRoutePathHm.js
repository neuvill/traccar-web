import { useId, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { map } from './core/MapView';
import { useAttributePreference } from '../common/util/preferences';

const DEFAULT_ROUTE_COLOR = '#0f53ff';

const MapRoutePath = ({ positions }) => {
  const id = useId();

  const reportColor = useSelector((state) => {
    const position = positions?.find(() => true);
    if (position) {
      const attributes = state.devices.items[position.deviceId]?.attributes;
      if (attributes) {
        return attributes['web.reportColor'] || null;
      }
    }
    return null;
  });

  const mapLineWidth = useAttributePreference('mapLineWidth', 10);
  const mapLineOpacity = useAttributePreference('mapLineOpacity', 1);

  useEffect(() => {
    map.addSource(id, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    });
    map.addLayer({
      source: id,
      id: `${id}-line`,
      type: 'line',
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': ['get', 'color'],
        'line-width': ['get', 'width'],
        'line-opacity': ['get', 'opacity'],
      },
    });

    return () => {
      if (map.getLayer(`${id}-line`)) {
        map.removeLayer(`${id}-line`);
      }
      if (map.getSource(id)) {
        map.removeSource(id);
      }
    };
  }, [id]);

  useEffect(() => {
    const features = [];
    for (let i = 0; i < positions.length - 1; i += 1) {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [positions[i].longitude, positions[i].latitude],
            [positions[i + 1].longitude, positions[i + 1].latitude],
          ],
        },
        properties: {
          color: reportColor || DEFAULT_ROUTE_COLOR,
          width: mapLineWidth,
          opacity: mapLineOpacity,
        },
      });
    }

    map.getSource(id)?.setData({
      type: 'FeatureCollection',
      features,
    });
  }, [id, positions, reportColor, mapLineWidth, mapLineOpacity]);

  return null;
};

export default MapRoutePath;
