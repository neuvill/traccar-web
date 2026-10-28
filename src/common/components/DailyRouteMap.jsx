import * as maplibregl from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { CircularProgress, Typography } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { useTranslation } from './LocalizationProvider';
import getSpeedColor from '../util/colors';
import { useAttributePreference } from '../util/preferences';
import useMapStyles from '../../map/core/useMapStyles';

const START_COLOR = '#27cb46';
const END_COLOR = '#ed2736';

const useStyles = makeStyles()((theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius * 2,
    overflow: 'hidden',
    backgroundColor: theme.palette.background.paper,
  },
  body: {
    position: 'relative',
    flex: 1,
  },
  map: {
    position: 'absolute',
    inset: 0,
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.palette.action.hover,
  },
}));

const emptyCollection = { type: 'FeatureCollection', features: [] };

const DailyRouteMap = ({ positions, loading, width = '100%', height = 200 }) => {
  const { classes } = useStyles();
  const t = useTranslation();

  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Always use OpenFreeMap here, independent of the main map's selected style
  const style = useMapStyles().find((s) => s.id === 'openFreeMap');

  const reportColor = useSelector((state) => {
    const deviceId = positions?.[0]?.deviceId;
    return state.devices.items[deviceId]?.attributes?.['web.reportColor'] || null;
  });
  const mapLineWidth = useAttributePreference('mapLineWidth', 2);

  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: style.style,
      interactive: false,
      attributionControl: false,
    });
    map.on('load', () => {
      map.addSource('route', { type: 'geojson', data: emptyCollection });
      map.addSource('endpoints', { type: 'geojson', data: emptyCollection });
      map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['get', 'width'],
        },
      });
      map.addLayer({
        id: 'endpoints',
        type: 'circle',
        source: 'endpoints',
        paint: {
          'circle-radius': 5,
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });
      setMapLoaded(true);
    });
    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(containerRef.current);
    mapRef.current = map;
    return () => {
      resizeObserver.disconnect();
      setMapLoaded(false);
      mapRef.current = null;
      map.remove();
    };
  }, [style.style]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapLoaded || !map || !positions?.length) {
      return;
    }
    const coordinates = positions.map((p) => [p.longitude, p.latitude]);
    const minSpeed = positions.map((p) => p.speed).reduce((a, b) => Math.min(a, b), Infinity);
    const maxSpeed = positions.map((p) => p.speed).reduce((a, b) => Math.max(a, b), -Infinity);
    const features = [];
    for (let i = 0; i < coordinates.length - 1; i += 1) {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [coordinates[i], coordinates[i + 1]],
        },
        properties: {
          color: reportColor || getSpeedColor(positions[i + 1].speed, minSpeed, maxSpeed),
          width: mapLineWidth + 1,
        },
      });
    }
    map.getSource('route').setData({ type: 'FeatureCollection', features });
    map.getSource('endpoints').setData({
      type: 'FeatureCollection',
      features: [
        { coordinates: coordinates[0], color: START_COLOR },
        { coordinates: coordinates[coordinates.length - 1], color: END_COLOR },
      ].map((point) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: point.coordinates },
        properties: { color: point.color },
      })),
    });

    const bounds = coordinates.reduce(
      (result, coordinate) => result.extend(coordinate),
      new maplibregl.LngLatBounds(coordinates[0], coordinates[0]),
    );
    map.fitBounds(bounds, { padding: 20, maxZoom: 16, duration: 0 });
  }, [mapLoaded, positions, reportColor, mapLineWidth]);

  const empty = !loading && !positions?.length;

  return (
    <div className={classes.root} style={{ width, height }}>
      <div className={classes.body}>
        <div ref={containerRef} className={classes.map} />
        {(loading || empty) && (
          <div className={classes.overlay}>
            {loading ? (
              <CircularProgress size={24} />
            ) : (
              <Typography variant="body2" color="textSecondary">
                {t('sharedNoData')}
              </Typography>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyRouteMap;
