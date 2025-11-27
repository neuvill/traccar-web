import { useId, useCallback, useEffect } from 'react';
//import { useTheme } from '@mui/material';
import { map } from './core/MapView';
//import { useTranslation } from '../common/components/LocalizationProvider';
//import { useAttributePreference } from '../common/util/preferences';

const MapRouteStops = ({ stops }) => {
    const id = useId();
    const stopsId = `stops-${id}`;
    /*const theme = useTheme();
    const t = useTranslation();
    const speedUnit = useAttributePreference('speedUnit');*/

    const onMouseEnter = () => map.getCanvas().style.cursor = 'pointer';
    const onMouseLeave = () => map.getCanvas().style.cursor = '';

    /*const onMarkerClick = useCallback((event) => {
        event.preventDefault();
        const feature = event.features[0];
        if (onClick) {
            onClick(feature.properties.id, feature.properties.index);
        }
    }, [onClick]);*/

    useEffect(() => {
        map.addSource(stopsId, {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: [],
            },
        });
        map.addLayer({
            id: stopsId,
            type: 'symbol',
            source: id,
            paint: {
                'text-color': ['get', 'color'],
            },
            layout: {
                //'text-font': findFonts(map),
                'text-size': 20,
                'text-field': '■',
                'text-allow-overlap': true,
                //'text-rotate': ['get', 'rotation'],
            },
        });

        //map.on('mouseenter', id, onMouseEnter);
        //map.on('mouseleave', id, onMouseLeave);
        //map.on('click', id, onMarkerClick);

        return () => {
            //map.off('mouseenter', id, onMouseEnter);
            //map.off('mouseleave', id, onMouseLeave);
            //map.off('click', id, onMarkerClick);

            if (map.getLayer(stopsId)) {
                map.removeLayer(stopsId);
            }
            if (map.getSource(stopsId)) {
                map.removeSource(stopsId);
            }
        };
    }, []);

    useEffect(() => {
        /*const maxSpeed = positions.map((p) => p.speed).reduce((a, b) => Math.max(a, b), -Infinity);
        const minSpeed = positions.map((p) => p.speed).reduce((a, b) => Math.min(a, b), Infinity);

        const control = new SpeedLegendControl(positions, speedUnit, t, maxSpeed, minSpeed);
        if (showSpeedControl) {
            map.addControl(control, theme.direction === 'rtl' ? 'bottom-right' : 'bottom-left');
        }*/

        map.getSource(id)?.setData({
            type: 'FeatureCollection',
            features: stops.map((stop, index) => ({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [stop.longitude, stop.latitude],
                },
                properties: {
                    index,
                    id: stop.id,
                    //rotation: position.course,
                    color: '#e14300ff',
                },
            })),
        });
        //return null;
    }, [stops]);

    return null;
};

export default MapRouteStops;
