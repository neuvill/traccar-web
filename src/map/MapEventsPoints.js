import { useCallback, useEffect, useId, useMemo } from 'react';
import { map } from './core/MapView';
import { findFonts } from './core/mapUtil';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useAttributePreference } from '../common/util/preferences';
import { mapIcons } from './core/preloadImages';
import { formatSpeed } from '../common/util/formatter';
import { prefixString } from '../common/util/stringUtils';

const EVENT_ICON = 'event-icon';

const hasEventPosition = (event) =>
  event.position?.longitude != null && event.position?.latitude != null;

const MapEventsPoints = ({ events }) => {
  const id = useId();
  const eventsId = `${id}-events`;
  const iconsLayer = `${eventsId}-icons`;
  const labelsLayer = `${eventsId}-labels`;
  const t = useTranslation();
  const speedUnit = useAttributePreference('speedUnit');

  const validEvents = useMemo(() => events.filter(hasEventPosition), [events]);

  const onMouseEnter = useCallback(() => {
    map.getCanvas().style.cursor = 'pointer';
  }, []);

  const onMouseLeave = useCallback(() => {
    map.getCanvas().style.cursor = '';
  }, []);

  const hideLabels = useCallback(() => {
    validEvents.forEach((event) => {
      map.setFeatureState({ source: eventsId, id: event.id }, { showLabel: false });
    });
  }, [eventsId, validEvents]);

  const onEventClick = useCallback(
    (event) => {
      event.preventDefault();
      const features = map.queryRenderedFeatures(event.point, {
        layers: [iconsLayer],
      });

      if (features.length > 0) {
        hideLabels();
        map.setFeatureState({ source: eventsId, id: features[0].id }, { showLabel: true });
      }
    },
    [eventsId, hideLabels, iconsLayer],
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
    if (!map.hasImage(EVENT_ICON)) {
      const img = new Image(30, 30);
      img.src = mapIcons.mapEvent;
      img.onload = () => {
        if (!map.hasImage(EVENT_ICON)) {
          map.addImage(EVENT_ICON, img);
        }
      };
    }

    map.addSource(eventsId, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });

    map.addLayer({
      id: iconsLayer,
      type: 'symbol',
      source: eventsId,
      layout: {
        'icon-image': EVENT_ICON,
        'icon-size': 1.0,
        'icon-allow-overlap': true,
        'icon-offset': [0, -10],
      },
    });

    map.addLayer({
      id: labelsLayer,
      type: 'symbol',
      source: eventsId,
      layout: {
        'text-field': [
          'case',
          ['==', ['get', 'typeTest'], 'deviceOverspeed'],
          ['concat', ['get', 'type'], '  (', ['get', 'speed'], ')'],
          ['get', 'type'],
        ],
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
      if (map.getSource(eventsId)) {
        map.removeSource(eventsId);
      }
    };
  }, [eventsId, iconsLayer, labelsLayer]);

  useEffect(() => {
    map.on('mouseenter', iconsLayer, onMouseEnter);
    map.on('mouseleave', iconsLayer, onMouseLeave);
    map.on('click', iconsLayer, onEventClick);
    map.on('click', onMapClick);

    return () => {
      map.off('mouseenter', iconsLayer, onMouseEnter);
      map.off('mouseleave', iconsLayer, onMouseLeave);
      map.off('click', iconsLayer, onEventClick);
      map.off('click', onMapClick);
    };
  }, [iconsLayer, onEventClick, onMapClick, onMouseEnter, onMouseLeave]);

  useEffect(() => {
    if (!map.getSource(eventsId)) {
      return;
    }

    map.getSource(eventsId).setData({
      type: 'FeatureCollection',
      features: validEvents.map((event, index) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [event.position.longitude, event.position.latitude],
        },
        properties: {
          index,
          id: event.id,
          type: t(prefixString('event', event.type)),
          typeTest: String(event.type),
          speed: formatSpeed(event.position.speed || 0, speedUnit, t),
        },
        id: event.id,
      })),
    });

    validEvents.forEach((event) => {
      map.setFeatureState({ source: eventsId, id: event.id }, { showLabel: false });
    });
  }, [eventsId, speedUnit, t, validEvents]);

  return null;
};

export default MapEventsPoints;
