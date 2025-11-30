import { useEffect, useCallback, useId } from 'react';
import { map } from './core/MapView';
import { findFonts } from './core/mapUtil';
import { formatNumericHours } from '../common/util/formatter';
import { useTranslation } from '../common/components/LocalizationProvider';
import { mapIcons } from './core/preloadImages';

const MapStopsPoints = ({ stops }) => {
    const id = useId();
    const t = useTranslation();
    const stopsId = `stops-${id}`;

    useEffect(() => {
        // Preload the SVG icon for stops
        if (!map.hasImage('stop-icon')) {
            const img = new Image(30, 30);
            img.src = mapIcons.stopmap;
            img.onload = () => {
                map.addImage('stop-icon', img);
            };
        }

        // Add source and layer for stops with clustering
        if (map.getSource(stopsId)) {
            map.removeSource(stopsId);
        }
        map.addSource(stopsId, {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
        });

        if (map.getLayer(`${stopsId}-icons`)) {
            map.removeLayer(`${stopsId}-icons`);
        }
        map.addLayer({
            id: `${stopsId}-icons`,
            type: 'symbol',
            source: stopsId,
            filter: ['!has', 'point_count'],
            layout: {
                'icon-image': 'stop-icon',
                'icon-size': 1.0,
                'icon-allow-overlap': true,
                'icon-offset': [0, -12],
            },
        });

        // Add label layer for stops (visibility controlled by feature-state)
        if (map.getLayer(`${stopsId}-labels`)) {
            map.removeLayer(`${stopsId}-labels`);
        }
        map.addLayer({
            id: `${stopsId}-labels`,
            type: 'symbol',
            source: stopsId,
            filter: ['!has', 'point_count'],
            layout: {
                'text-field': ['get', 'duration'], // Show duration as label
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
                'text-opacity': ['case', ['boolean', ['feature-state', 'showLabel'], false], 1, 0], // Control text opacity based on showLabel
            },
        });
        // click handler for stops clusters
        map.on('click', `${stopsId}-clusters`, async (event) => {
            const features = map.queryRenderedFeatures(event.point, {
                layers: [`${stopsId}-clusters`],
            });
            const clusterId = features[0].properties.cluster_id;
            const zoom = await map.getSource(stopsId).getClusterExpansionZoom(clusterId);

            map.easeTo({
                center: features[0].geometry.coordinates,
                zoom,
            });
        });

        map.on('mouseenter', `${stopsId}-clusters`, () => {
            map.getCanvas().style.cursor = 'pointer';
        });

        map.on('mouseleave', `${stopsId}-clusters`, () => {
            map.getCanvas().style.cursor = '';
        });

        map.on('mouseenter', `${stopsId}-icons`, () => {
            map.getCanvas().style.cursor = 'pointer';
        });

        map.on('mouseleave', `${stopsId}-icons`, () => {
            map.getCanvas().style.cursor = '';
        });

        // Click handler for stops
        map.on('click', `${stopsId}-icons`, (event) => {
            const features = map.queryRenderedFeatures(event.point, {
                layers: [`${stopsId}-icons`],
            });

            if (features.length > 0) {
                const clickedFeature = features[0];

                // Clear all other labels
                stops.forEach((stop) => {
                    map.setFeatureState(
                        { source: stopsId, id: stop.id },
                        { showLabel: false }
                    );
                });

                // Show the label for the clicked feature
                const newShowLabelState = true;
                map.setFeatureState(
                    { source: stopsId, id: clickedFeature.id },
                    { showLabel: newShowLabelState }
                );
            }
        });

        // Optional: Hide labels when clicking anywhere else on the map
        map.on('click', (event) => {
            const features = map.queryRenderedFeatures(event.point, {
                layers: [`${stopsId}-icons`],
            });

            if (features.length === 0) {
                stops.forEach((stop) => {
                    map.setFeatureState(
                        { source: stopsId, id: stop.id },
                        { showLabel: false }
                    );
                });
            }
        });

        return () => {
            map.off('click', `${stopsId}-clusters`);
            map.off('mouseenter', `${stopsId}-clusters`);
            map.off('mouseleave', `${stopsId}-clusters`);

            map.off('click', `${stopsId}-icons`);
            map.off('mouseenter', `${stopsId}-icons`);
            map.off('mouseleave', `${stopsId}-icons`);

            map.off('click');

            if (map.getLayer(`${stopsId}-clusters`)) {
                map.removeLayer(`${stopsId}-clusters`);
            }
            if (map.getLayer(`${stopsId}-icons`)) {
                map.removeLayer(`${stopsId}-icons`);
            }
            if (map.getLayer(`${stopsId}-labels`)) {
                map.removeLayer(`${stopsId}-labels`);
            }
            if (map.getSource(stopsId)) {
                map.removeSource(stopsId);
            }
        };
    }, [stops]);

    useEffect(() => {
        // Update stops data
        map.getSource(stopsId)?.setData({
            type: 'FeatureCollection',
            features: stops.map((stop, index) => ({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [stop.longitude, stop.latitude] },
                properties: {
                    index,
                    id: stop.id,
                    duration: formatNumericHours(stop.duration, t),
                },
                id: stop.id, // Ensure the id is set for feature-state
            })),
        });

        // Initialize showLabel state for all stops
        stops.forEach((stop) => {
            map.setFeatureState(
                { source: stopsId, id: stop.id },
                { showLabel: false } // Default to hidden
            );
        });
    }, [stops]);

    return null;
};

export default MapStopsPoints;