import { useId, useEffect } from 'react';
import { map } from './core/MapView';
import { findFonts } from './core/mapUtil';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useAttributePreference } from '../common/util/preferences';
import { mapIcons } from './core/preloadImages';
import { formatSpeed } from '../common/util/formatter';
import { prefixString } from '../common/util/stringUtils';


const MapEventsPoints = ({ events }) => {
    const id = useId();
    const eventsId = `${id}-events`;
    const t = useTranslation();
    const speedUnit = useAttributePreference('speedUnit');

    useEffect(() => {
        if (!map.hasImage('event-icon')) {
            const img = new Image(30, 30);
            img.src = mapIcons.mapEvent;
            img.onload = () => {
                map.addImage('event-icon', img);
            };
        }

        map.addSource(eventsId, {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
        });

        map.addLayer({
            id: `${eventsId}-icons`,
            type: 'symbol',
            source: eventsId,
            layout: {
                'icon-image': 'event-icon',
                'icon-size': 1.0,
                'icon-allow-overlap': true,
                'icon-offset': [0, -10],
            },
        });

        map.addLayer({
            id: `${eventsId}-labels`,
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

        map.on('mouseenter', `${eventsId}-icons`, () => {
            map.getCanvas().style.cursor = 'pointer';
        });

        map.on('mouseleave', `${eventsId}-icons`, () => {
            map.getCanvas().style.cursor = '';
        });

        map.on('click', `${eventsId}-icons`, (event) => {
            const features = map.queryRenderedFeatures(event.point, {
                layers: [`${eventsId}-icons`],
            });

            if (features.length > 0) {
                const clickedFeature = features[0];

                // Clear all other labels
                events.forEach((event) => {
                    map.setFeatureState(
                        { source: eventsId, id: event.id },
                        { showLabel: false }
                    );
                });

                // Show the label for the clicked feature
                const newShowLabelState = true;
                map.setFeatureState(
                    { source: eventsId, id: clickedFeature.id },
                    { showLabel: newShowLabelState }
                );
            }
        });

        //optional click otherwise hide label
        map.on('click', (event) => {
            const features = map.queryRenderedFeatures(event.point, {
                layers: [`${eventsId}-icons`],
            });
            //console.log('features', features);

            if (features.length === 0) {
                events.forEach((event) => {
                    map.setFeatureState(
                        { source: eventsId, id: event.id },
                        { showLabel: false }
                    );
                });
            }
        });

        return () => {
            map.off('mouseenter', `${eventsId}-icons`);
            map.off('mouseleave', `${eventsId}-icons`);
            map.off('click', `${eventsId}-icons`);
            map.off('click');


            if (map.getLayer(`${eventsId}-icons`)) {
                map.removeLayer(`${eventsId}-icons`);
            }
            if (map.getLayer(`${eventsId}-labels`)) {
                map.removeLayer(`${eventsId}-labels`);
            }
            if (map.getSource(eventsId)) {
                map.removeSource(eventsId);
            }


        };
    }, [events]);

    useEffect(() => {
        map.getSource(eventsId)?.setData({
            type: 'FeatureCollection',
            features: events.map((event, index) => ({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [event.position.longitude, event.position.latitude] },
                properties: {
                    index,
                    id: event.id,
                    type: t(prefixString('event', event.type)),
                    typeTest: String(event.type),
                    speed: formatSpeed(event.position.speed, speedUnit, t),
                },
                id: event.id,
            })),
        });
    }, [events]);

    return null;
};

export default MapEventsPoints;