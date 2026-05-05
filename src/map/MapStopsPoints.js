import { useCallback, useEffect, useId } from 'react';
import { map } from './core/MapView';
import { findFonts } from './core/mapUtil';
import { formatNumericHours } from '../common/util/formatter';
import { useTranslation } from '../common/components/LocalizationProvider';
import { mapIcons } from './core/preloadImages';

const STOP_ICON = 'stop-icon';

const MapStopsPoints = ({ stops }) => {
  const id = useId();
  const t = useTranslation();
  const stopsId = `stops-${id}`;
  const iconsLayer = `${stopsId}-icons`;
  const labelsLayer = `${stopsId}-labels`;

  const onMouseEnter = useCallback(() => {
    map.getCanvas().style.cursor = 'pointer';
  }, []);

  const onMouseLeave = useCallback(() => {
    map.getCanvas().style.cursor = '';
  }, []);

  const hideLabels = useCallback(() => {
    stops.forEach((stop) => {
      map.setFeatureState({ source: stopsId, id: stop.id }, { showLabel: false });
    });
  }, [stops, stopsId]);

  const onStopClick = useCallback(
    (event) => {
      event.preventDefault();
      const features = map.queryRenderedFeatures(event.point, {
        layers: [iconsLayer],
      });

      if (features.length > 0) {
        hideLabels();
        map.setFeatureState({ source: stopsId, id: features[0].id }, { showLabel: true });
      }
    },
    [hideLabels, iconsLayer, stopsId],
  );

  const onMapClick = useCallback(
    (event) => {
      const features = map.queryRenderedFeatures(event.point, {
        layers: [iconsLayer],
      });

      if (!features.length) {
        hideLabels();
      }
    },
    [hideLabels, iconsLayer],
  );

  useEffect(() => {
    if (!map.hasImage(STOP_ICON)) {
      const img = new Image(30, 30);
      img.src = mapIcons.stopmap;
      img.onload = () => {
        if (!map.hasImage(STOP_ICON)) {
          map.addImage(STOP_ICON, img);
        }
      };
    }

    map.addSource(stopsId, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });

    map.addLayer({
      id: iconsLayer,
      type: 'symbol',
      source: stopsId,
      layout: {
        'icon-image': STOP_ICON,
        'icon-size': 1.0,
        'icon-allow-overlap': true,
        'icon-offset': [0, -12],
      },
    });

    map.addLayer({
      id: labelsLayer,
      type: 'symbol',
      source: stopsId,
      layout: {
        'text-field': ['get', 'duration'],
        'text-font': findFonts(map),
        'text-size': 15,
        'text-anchor': 'bottom',
        'text-offset': [0, -2],
        'text-allow-overlap': true,
      },
      paint: {
        'text-halo-color': 'black',
        'text-halo-width': 10,
        'text-halo-blur': 30,
        'text-color': 'white',
        'text-opacity': ['case', ['boolean', ['feature-state', 'showLabel'], false], 1, 0],
      },
    });

    return () => {
      if (map.getLayer(iconsLayer)) {
        map.removeLayer(iconsLayer);
      }
      if (map.getLayer(labelsLayer)) {
        map.removeLayer(labelsLayer);
      }
      if (map.getSource(stopsId)) {
        map.removeSource(stopsId);
      }
    };
  }, [iconsLayer, labelsLayer, stopsId]);

  useEffect(() => {
    map.on('mouseenter', iconsLayer, onMouseEnter);
    map.on('mouseleave', iconsLayer, onMouseLeave);
    map.on('click', iconsLayer, onStopClick);
    map.on('click', onMapClick);

    return () => {
      map.off('mouseenter', iconsLayer, onMouseEnter);
      map.off('mouseleave', iconsLayer, onMouseLeave);
      map.off('click', iconsLayer, onStopClick);
      map.off('click', onMapClick);
    };
  }, [iconsLayer, onMapClick, onMouseEnter, onMouseLeave, onStopClick]);

  useEffect(() => {
    if (!map.getSource(stopsId)) {
      return;
    }

    map.getSource(stopsId).setData({
      type: 'FeatureCollection',
      features: stops.map((stop, index) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [stop.longitude, stop.latitude] },
        properties: {
          index,
          id: stop.id,
          duration: formatNumericHours(stop.duration, t),
        },
        id: stop.id,
      })),
    });

    stops.forEach((stop) => {
      map.setFeatureState({ source: stopsId, id: stop.id }, { showLabel: false });
    });
  }, [stops, stopsId, t]);

  return null;
};

export default MapStopsPoints;
