import { Fragment, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  IconButton,
  Paper,
  Toolbar,
  Typography,
  ListItemButton,
  List,
  Grid,
  Tabs,
  Tab,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import TuneIcon from '@mui/icons-material/Tune';
import RouteIcon from '@mui/icons-material/Route';
import DownloadIcon from '@mui/icons-material/Download';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import FastForwardIcon from '@mui/icons-material/FastForward';
import FastRewindIcon from '@mui/icons-material/FastRewind';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import StopRoundedIcon from '@mui/icons-material/StopRounded';
import PlaceIcon from '@mui/icons-material/Place';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import MapView from '../map/core/MapView';
import MapRoutePath from '../map/MapRoutePathHm';
import MapRoutePoints from '../map/MapRoutePointsHm';
import MapPositions from '../map/MapPositions';
import MapStopsPoints from '../map/MapStopsPoints';
import MapEventsPoints from '../map/MapEventsPoints';
import MapMarkers from '../map/MapMarkers';
import {
  formatAdaptiveDuration,
  formatSpeed,
  formatTime,
  formatDistance,
} from '../common/util/formatter';
import { useTranslation } from '../common/components/LocalizationProvider';
import MapCamera from '../map/MapCamera';
import MapGeofence from '../map/MapGeofence';
import StatusCard from '../common/components/StatusCard';
import MapScale from '../map/MapScale';
import BackIcon from '../common/components/BackIcon';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { useAttributePreference } from '../common/util/preferences';
import { prefixString } from '../common/util/stringUtils';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import * as echarts from 'echarts';
import ArrowLeftIcon from '@mui/icons-material/ArrowLeft';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import Loader from '../common/components/Loader';
import SpeedIcon from '@mui/icons-material/Speed';

const PLAYBACK_SPEED = 1;
const PLAYBACK_TICK_MS = 100;
const MAX_CHART_POINTS = 4000;
const REPORT_EVENT_TYPES = ['alarm', 'deviceOverspeed', 'ignitionOff', 'ignitionOn', 'deviceIdle'];
const TRIP_COLOR = '#1976d2';
const TRIP_LIST_BORDER_COLOR = '#27cb46';
const EVENT_COLORS = {
  alarm: '#d32f2f',
  deviceOverspeed: '#ed6c02',
  ignitionOn: '#2e7d32',
  ignitionOff: '#616161',
  deviceIdle: '#00b5e2',
};
const DEFAULT_EVENT_COLOR = '#9e9e9e';
const STOP_COLOR = '#78909c';
const STOP_LIST_BORDER_COLOR = '#ed2736';
const STOP_ICON_COLOR = '#ed2736';

const hasCoordinates = (latitude, longitude) => latitude != null && longitude != null;

const getReplayMarkLine = (chartIndex) => ({
  symbol: 'none',
  animation: false,
  label: { show: false },
  lineStyle: {
    color: '#000',
    width: 3,
  },
  data: [{ xAxis: chartIndex }],
});

const formatStopDuration = (value, t) => {
  const totalSeconds = Math.max(0, Math.ceil(value / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [];

  if (hours) {
    parts.push(`${hours} ${t('sharedHourAbbreviation')}`);
  }
  if (minutes) {
    parts.push(`${minutes} ${t('sharedMinuteAbbreviation')}`);
  }
  if (seconds || !parts.length) {
    parts.push(`${seconds} ${t('sharedSecondAbbreviation')}`);
  }

  return parts.join(' ');
};

const getPositionIndexAtTime = (positions, time) => {
  const target = dayjs(time).valueOf();
  let low = 0;
  let high = positions.length - 1;
  let result = 0;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const positionTime = dayjs(positions[mid]?.fixTime).valueOf();

    if (positionTime <= target) {
      result = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return result;
};

const useStyles = makeStyles()((theme) => ({
  root: {
    height: '100%',
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    zIndex: 3,
    left: 0,
    top: '2.5%',
    bottom: 0,
    margin: theme.spacing(0),
    width: '33%',
    [theme.breakpoints.down('md')]: {
      width: '100%',
      margin: 0,
      bottom: 0,
      top: '3.5%',
      height: '100%',
    },
  },
  title: {
    flexGrow: 1,
  },
  controls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flashing: {
    animation: 'flashing 2s infinite',
    '@keyframes flashing': {
      '50%, 100%': { opacity: 1 },
      '50%': { opacity: 0.4 },
    },
  },
  replayButton: {
    marginRight: theme.spacing(2),
  },
  replayTime: {
    display: 'flex',
    alignItems: 'center',
    width: '75%',
    fontWeight: 500,
    [theme.breakpoints.down('md')]: {
      width: '70%',
    },
  },
  replayDistance: {
    display: 'flex',
    alignItems: 'center',
    width: '25%',
    fontWeight: 500,
    [theme.breakpoints.down('md')]: {
      width: '30%',
    },
  },
  replayListItem: {
    maxHeight: '75vh',
    overflowY: 'auto',
    marginTop: '10%',
    paddingBottom: '0px',
    [theme.breakpoints.down('md')]: {
      maxHeight: '71vh',
    },
  },
}));

const QReplayPage = () => {
  const t = useTranslation();
  const { classes } = useStyles();
  const navigate = useNavigate();
  const timerRef = useRef();
  const speedChartRef = useRef();
  const speedChartInstanceRef = useRef();
  const [hidden, setHidden] = useState(false);
  const [searchParams] = useSearchParams();

  const defaultDeviceId = useSelector((state) => state.devices.selectedId);

  const [positions, setPositions] = useState([]);
  const [summary, setSummary] = useState([]);
  const [trips, setTrips] = useState([]);
  const [stops, setStops] = useState([]);
  const [topSpeed, setTopSpeed] = useState(0);
  const [reportEvents, setReportEvents] = useState([]);
  const [eventData, setEventData] = useState([]);
  const [index, setIndex] = useState(0);
  const selectedDeviceId = defaultDeviceId || searchParams.get('deviceId');
  const [showCard, setShowCard] = useState(false);
  const [from, setFrom] = useState(() => dayjs().startOf('day').toISOString());
  const [to, setTo] = useState(() => dayjs().toISOString());
  const reportRangeRef = useRef({
    from: dayjs().startOf('day').toISOString(),
    to: dayjs().toISOString(),
  });
  const [noDataMessage, setNoDataMessage] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsLoadedQuery, setEventsLoadedQuery] = useState(null);
  const distanceUnit = useAttributePreference('distanceUnit');
  const speedUnit = useAttributePreference('speedUnit');
  const [replay, setReplay] = useState(false);
  const [showList, setShowList] = useState(true);
  const [open, setOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(null);
  const [reportTab, setReportTab] = useState(0);
  const [selectedMapItem, setSelectedMapItem] = useState(null);
  const hasDateRange = Boolean(from && to);
  const loaded = hasDateRange && !loading;
  const showMap = replay || Boolean(selectedMapItem);
  const currentPosition = positions[index] || null;
  const selectedMapPoint = selectedMapItem?.position || null;
  const replayBoundaryMarkers = useMemo(() => {
    const firstPosition = positions[0];
    const lastPosition = positions[positions.length - 1];

    if (!firstPosition) {
      return [];
    }

    const markers = [
      {
        latitude: firstPosition.latitude,
        longitude: firstPosition.longitude,
        image: 'start-success',
      },
    ];

    if (
      lastPosition &&
      (lastPosition.latitude !== firstPosition.latitude ||
        lastPosition.longitude !== firstPosition.longitude)
    ) {
      markers.push({
        latitude: lastPosition.latitude,
        longitude: lastPosition.longitude,
        image: 'finish-error',
      });
    }

    return markers;
  }, [positions]);
  const reportQuery = useMemo(() => {
    if (!selectedDeviceId || !from || !to) {
      return null;
    }
    return new URLSearchParams({ deviceId: selectedDeviceId, from, to }).toString();
  }, [selectedDeviceId, from, to]);
  const eventsReportQuery = useMemo(() => {
    if (!reportQuery) {
      return null;
    }

    const query = new URLSearchParams(reportQuery);
    REPORT_EVENT_TYPES.forEach((type) => query.append('type', type));
    return query.toString();
  }, [reportQuery]);

  const sampledSpeedData = useMemo(() => {
    if (!positions.length) return [];

    const bucketSize = Math.ceil(positions.length / MAX_CHART_POINTS);

    const result = [];

    for (let i = 0; i < positions.length; i += bucketSize) {
      const bucket = positions.slice(i, i + bucketSize);

      let maxSpeed = 0;
      let maxIndex = i;

      bucket.forEach((p, j) => {
        if ((p.speed || 0) > maxSpeed) {
          maxSpeed = p.speed || 0;
          maxIndex = i + j;
        }
      });

      result.push({
        x: maxIndex,
        speed: maxSpeed,
      });
    }

    return result;
  }, [positions]);

  const speedChartData = useMemo(
    () => sampledSpeedData.map(({ x, speed }) => [x, speed]),
    [sampledSpeedData],
  );

  const formatEventType = useCallback(
    (event) => {
      return t(prefixString('event', event.type));
    },
    [t],
  );

  const formatEventDetails = useCallback(
    (event) => {
      switch (event.type) {
        case 'alarm':
          return event.attributes?.alarm
            ? `${t('eventAlarm')}: ${t(prefixString('alarm', event.attributes.alarm))}`
            : null;
        case 'deviceOverspeed':
          return event.attributes?.speed != null
            ? formatSpeed(event.attributes.speed, speedUnit, t)
            : null;
        case 'deviceIdle':
          return event.attributes?.duration != null
            ? formatAdaptiveDuration(event.attributes.duration, t)
            : null;
        default:
          return null;
      }
    },
    [speedUnit, t],
  );

  const formatEventAddress = useCallback((event) => event.position?.address || null, []);

  const openMapItem = useCallback((item) => {
    setSelectedMapItem(item);
    setReplay(false);
    setPlaying(false);
    setHidden(true);
    setShowList(false);
    setShowCard(false);
  }, []);

  const handleStopClick = useCallback(
    (stop) => {
      if (stop && hasCoordinates(stop.latitude, stop.longitude)) {
        openMapItem({
          type: 'stop',
          position: {
            latitude: stop.latitude,
            longitude: stop.longitude,
          },
          stop,
        });
      }
    },
    [openMapItem],
  );

  const handleEventClick = useCallback(
    (event) => {
      if (hasCoordinates(event.position?.latitude, event.position?.longitude)) {
        openMapItem({
          type: 'event',
          position: event.position,
          event,
        });
      }
    },
    [openMapItem],
  );

  const deviceName = useSelector((state) => {
    if (selectedDeviceId) {
      const device = state.devices.items[selectedDeviceId];
      if (device) {
        return device.name;
      }
    }
    return null;
  });

  useEffect(() => {
    if (!replay || !showList || !positions.length || !speedChartRef.current) {
      return undefined;
    }

    const chart = echarts.init(speedChartRef.current);
    speedChartInstanceRef.current = chart;

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
      speedChartInstanceRef.current = null;
    };
  }, [positions.length, replay, showList]);

  useEffect(() => {
    const chart = speedChartInstanceRef.current;

    if (!chart || !positions.length) {
      return;
    }

    chart.setOption(
      {
        animation: false,
        grid: {
          left: 8,
          right: 8,
          top: 6,
          bottom: 30,
          containLabel: false,
        },
        tooltip: {
          trigger: 'axis',
          confine: true,
          formatter: (params) => {
            const item = params?.[0];
            const chartIndex = Math.round(item?.value?.[0] ?? 0);
            const chartPosition = positions[chartIndex];
            const time = chartPosition?.fixTime
              ? dayjs(chartPosition.fixTime).format('HH:mm:ss')
              : '';
            const speed = formatSpeed(Number(item?.value?.[1]) || 0, 'kmh', t);

            return time ? `${time}<br />${speed}` : speed;
          },
        },
        xAxis: {
          type: 'value',
          min: 0,
          max: Math.max(positions.length - 1, 0),
          show: false,
        },
        yAxis: {
          type: 'value',
          show: false,
        },
        dataZoom: [
          {
            type: 'inside',
            xAxisIndex: 0,
            filterMode: 'none',
            zoomOnMouseWheel: true,
            moveOnMouseMove: true,
            moveOnMouseWheel: false,
          },
          {
            type: 'slider',
            xAxisIndex: 0,
            filterMode: 'none',
            height: 18,
            bottom: 2,
            borderColor: 'transparent',
            fillerColor: 'rgba(25, 118, 210, 0.16)',
            handleSize: '80%',
            showDetail: false,
          },
        ],
        series: [
          {
            type: 'line',
            data: speedChartData,
            showSymbol: false,
            smooth: true,
            sampling: 'lttb',
            lineStyle: {
              color: TRIP_COLOR,
              width: 2,
            },
            areaStyle: {
              color: 'rgba(25, 118, 210, 0.2)',
            },
          },
        ],
      },
      true,
    );
  }, [positions, replay, showList, speedChartData, t]);

  useEffect(() => {
    const chart = speedChartInstanceRef.current;

    if (!chart || !positions.length) {
      return;
    }

    chart.setOption({
      series: [
        {
          markLine: getReplayMarkLine(index),
        },
      ],
    });
  }, [index, positions.length, replay, showList]);

  useEffect(() => {
    const chart = speedChartInstanceRef.current;

    if (!chart || !positions.length) {
      return undefined;
    }

    const handleChartClick = (event) => {
      const point = [event.offsetX, event.offsetY];

      if (!chart.containPixel({ gridIndex: 0 }, point)) {
        return;
      }

      const [chartIndex] = chart.convertFromPixel({ seriesIndex: 0 }, point);
      const nextIndex = Math.max(0, Math.min(Math.round(chartIndex), positions.length - 1));
      const nextPosition = positions[nextIndex];

      if (nextPosition) {
        setIndex(nextIndex);
        setCurrentTime(nextPosition.fixTime || null);
      }
    };

    const chartRenderer = chart.getZr();
    chartRenderer.on('click', handleChartClick);

    return () => chartRenderer.off('click', handleChartClick);
  }, [positions, replay, showList]);

  useEffect(() => {
    if (!from || !to) {
      setPositions([]);
      setStops([]);
      setEventData([]);
      setReportEvents([]);
      setEventsLoadedQuery(null);
      setSelectedMapItem(null);
    }
  }, [from, to]);

  useEffect(() => {
    if (!replay && from && to) {
      reportRangeRef.current = { from, to };
    }
  }, [from, to, replay]);

  useEffect(() => {
    if (!playing || !positions.length) return;

    clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setIndex((prev) => {
        const nextIndex = Math.min(prev + PLAYBACK_SPEED, positions.length - 1);
        setCurrentTime(positions[nextIndex]?.fixTime || null);
        return nextIndex;
      });
    }, PLAYBACK_TICK_MS);

    return () => clearInterval(timerRef.current);
  }, [playing, positions]);

  useEffect(() => {
    if (!currentTime || !positions.length) return;

    const newIndex = getPositionIndexAtTime(positions, currentTime);

    if (newIndex !== index) {
      setIndex(newIndex);
    }
  }, [currentTime, positions, index]);

  useEffect(() => {
    if (index >= positions.length - 1) {
      clearInterval(timerRef.current);
      setPlaying(false);
    }
  }, [index, positions]);

  const onPointClick = useCallback(
    (_, newIndex) => {
      setIndex(newIndex);
      setCurrentTime(positions[newIndex]?.fixTime || null);
    },
    [positions],
  );

  const onMarkerClick = useCallback(
    (positionId) => {
      setShowCard(!!positionId);
    },
    [setShowCard],
  );

  useEffect(() => {
    if (!replay || !reportQuery) {
      return undefined;
    }

    const controller = new AbortController();

    const fetchPositions = async () => {
      setLoading(true);
      setNoDataMessage(false);
      setSelectedMapItem(null);

      try {
        const response = await fetchOrThrow(`/api/positions?${reportQuery}`, {
          signal: controller.signal,
        });
        const newPositions = await response.json();

        setPositions(newPositions);
        setCurrentTime(newPositions[0]?.fixTime || null);
        setIndex(0);
        setPlaying(false);

        if (!newPositions.length) {
          setStops([]);
          setEventData([]);
          setNoDataMessage(true);
          return;
        }

        const [stopsResponse, eventResponse] = await Promise.all([
          fetchOrThrow(`/api/reports/stops?${reportQuery}`, {
            headers: { Accept: 'application/json' },
            signal: controller.signal,
          }),
          fetchOrThrow(`/api/reports/events?${reportQuery}&type=deviceOverspeed`, {
            headers: { Accept: 'application/json' },
            signal: controller.signal,
          }),
        ]);

        const [stopData, overspeedEvents] = await Promise.all([
          stopsResponse.json(),
          eventResponse.json(),
        ]);

        setStops(
          stopData.map((stop, stopIndex) => ({
            ...stop,
            id: stop.id || stopIndex,
          })),
        );

        const positionMap = new Map(newPositions.map((position) => [position.id, position]));

        setEventData(
          overspeedEvents.map((event) => ({
            ...event,
            position: positionMap.get(event.positionId) || null,
          })),
        );
      } catch (error) {
        if (error.name !== 'AbortError') {
          setPositions([]);
          setStops([]);
          setEventData([]);
          setNoDataMessage(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setShowList(true);
        }
      }
    };

    fetchPositions();

    return () => controller.abort();
  }, [replay, reportQuery]);

  useEffect(() => {
    if (!reportQuery || replay) {
      return undefined;
    }

    const controller = new AbortController();

    setLoading(true);
    setNoDataMessage(false);
    setSelectedMapItem(null);
    setReportEvents([]);
    setEventsLoadedQuery(null);
    setEventsLoading(false);

    const fetchReports = async () => {
      try {
        const [tripsResponse, summaryResponse, overspeedEventsResponse] = await Promise.all([
          fetchOrThrow(`/api/reports/trips?${reportQuery}`, {
            headers: { Accept: 'application/json' },
            signal: controller.signal,
          }),
          fetchOrThrow(`/api/reports/summary?${reportQuery}`, {
            headers: { Accept: 'application/json' },
            signal: controller.signal,
          }),
          fetchOrThrow(`/api/reports/events?${reportQuery}&type=deviceOverspeed`, {
            headers: { Accept: 'application/json' },
            signal: controller.signal,
          }),
        ]);

        const [tripData, summaryData, overspeedEvents] = await Promise.all([
          tripsResponse.json(),
          summaryResponse.json(),
          overspeedEventsResponse.json(),
        ]);

        const maxOverspeedSpeed = overspeedEvents.length
          ? Math.max(...overspeedEvents.map((event) => Number(event.attributes?.speed) || 0))
          : 0;

        setTrips(tripData);
        setSummary(summaryData);

        setIndex(0);
        setTopSpeed(maxOverspeedSpeed);
        setNoDataMessage(!tripData.length && !summaryData.length);
      } catch (error) {
        if (error.name !== 'AbortError') {
          setTrips([]);
          setSummary([]);
          setReportEvents([]);
          setTopSpeed(0);
          setNoDataMessage(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setShowList(false);
        }
      }
    };

    fetchReports();

    return () => controller.abort();
  }, [reportQuery, replay]);

  useEffect(() => {
    if (
      !eventsReportQuery ||
      !reportQuery ||
      replay ||
      reportTab !== 1 ||
      eventsLoadedQuery === eventsReportQuery
    ) {
      return undefined;
    }

    const controller = new AbortController();

    setEventsLoading(true);
    setReportEvents([]);

    const fetchEvents = async () => {
      try {
        const [eventsResponse, positionsResponse] = await Promise.all([
          fetchOrThrow(`/api/reports/events?${eventsReportQuery}`, {
            headers: { Accept: 'application/json' },
            signal: controller.signal,
          }),
          fetchOrThrow(`/api/positions?${reportQuery}`, {
            signal: controller.signal,
          }),
        ]);

        const [events, reportPositions] = await Promise.all([
          eventsResponse.json(),
          positionsResponse.json(),
        ]);

        const positionMap = new Map(reportPositions.map((position) => [position.id, position]));
        const eventsWithPositions = events.map((event) => ({
          ...event,
          position: positionMap.get(event.positionId) || null,
        }));

        setReportEvents(eventsWithPositions);
        setEventsLoadedQuery(eventsReportQuery);
      } catch (error) {
        if (error.name !== 'AbortError') {
          setReportEvents([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setEventsLoading(false);
        }
      }
    };

    fetchEvents();

    return () => controller.abort();
  }, [eventsLoadedQuery, eventsReportQuery, reportQuery, replay, reportTab]);

  const handleDownload = () => {
    if (reportQuery) {
      window.location.assign(`/api/positions/kml?${reportQuery}`);
    }
  };

  const handleMapBack = () => {
    const isReplayView = replay;

    setHidden(false);
    setSelectedMapItem(null);
    setReplay(false);
    setShowList(false);
    setPlaying(false);
    setShowCard(false);

    if (isReplayView) {
      const { from: reportFrom, to: reportTo } = reportRangeRef.current;
      setFrom(reportFrom);
      setTo(reportTo);
      setLoading(true);
      setNoDataMessage(false);
    }
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div className={classes.root}>
      {showMap && (
        <MapView>
          <MapGeofence />

          {replay ? (
            <>
              {<MapRoutePath positions={positions} />}
              {<MapRoutePoints positions={positions} onClick={onPointClick} />}
              {<MapStopsPoints stops={stops} />}
              {<MapEventsPoints events={eventData} />}
              {Boolean(replayBoundaryMarkers.length) && (
                <MapMarkers markers={replayBoundaryMarkers} />
              )}
              {currentPosition && (
                <MapPositions
                  positions={[currentPosition]}
                  onMarkerClick={onMarkerClick}
                  isReplay={replay}
                />
              )}
            </>
          ) : (
            <>
              {selectedMapItem?.type === 'stop' && (
                <MapStopsPoints stops={[selectedMapItem.stop]} />
              )}
              {selectedMapItem?.type === 'event' && (
                <MapEventsPoints events={[selectedMapItem.event]} />
              )}
            </>
          )}
        </MapView>
      )}
      <MapScale />

      {selectedMapPoint ? (
        <MapCamera latitude={selectedMapPoint.latitude} longitude={selectedMapPoint.longitude} />
      ) : (
        <MapCamera positions={positions} />
      )}
      <Paper
        elevation={5}
        square
        sx={{
          backgroundColor: '#f5f5f5',
          position: 'fixed',
          zIndex: 5,
          left: 0,
          top: 0,
          width: '100%',
        }}
      >
        <Toolbar>
          {showMap ? (
            <IconButton edge="start" sx={{ mr: 2 }} onClick={handleMapBack}>
              <BackIcon />
            </IconButton>
          ) : (
            <>
              <IconButton edge="start" sx={{ mr: 2 }} onClick={() => navigate(-1)}>
                <BackIcon />
              </IconButton>
            </>
          )}
          <Typography className={classes.title} sx={{ fontWeight: 500 }}>
            {deviceName}
          </Typography>
          {loaded && (
            <>
              {!showList && (
                <IconButton
                  className={classes.replayButton}
                  onClick={() => {
                    const newFrom = dayjs(from).startOf('day').toISOString();
                    const newTo = dayjs(to).endOf('day').toISOString();
                    setFrom(newFrom);
                    setTo(newTo);
                    setSelectedMapItem(null);
                    setLoading(true);
                    setHidden(true);
                    setReplay(true);
                  }}
                >
                  <RouteIcon sx={{ color: '#1976d2' }} className={classes.flashing} />
                </IconButton>
              )}
              <IconButton onClick={handleDownload}>
                <DownloadIcon />
              </IconButton>
              <IconButton
                edge="end"
                onClick={() => {
                  setShowList(true);
                  setLoading(false);
                }}
              >
                <TuneIcon />
              </IconButton>
            </>
          )}
        </Toolbar>
      </Paper>
      <div className={classes.sidebar} style={{ display: hidden ? 'none' : undefined }}>
        {loaded && !showList && (
          <Paper square className={classes.replayListItem}>
            <Tabs
              value={reportTab}
              onChange={(_, value) => setReportTab(value)}
              variant="fullWidth"
              sx={{
                position: 'sticky',
                top: 0,
                zIndex: 1,
                backgroundColor: 'background.paper',
                borderBottom: '1px solid #d4d4d4ff',
              }}
            >
              <Tab label={t('reportTrips')} />
              <Tab label={t('reportEvents')} />
            </Tabs>
            {reportTab === 0 && (
              <List sx={{ padding: '0px' }}>
                {trips.map((trip, index) => {
                  const nextTrip = trips[index + 1];
                  const stopStartTime = trip.endTime;
                  const stopEndTime = nextTrip?.startTime;
                  const hasStop = stopEndTime && dayjs(stopEndTime).isAfter(dayjs(stopStartTime));
                  const stopDuration = hasStop ? dayjs(stopEndTime).diff(dayjs(stopStartTime)) : 0;
                  const stopAddress = trip.endAddress || nextTrip?.startAddress;
                  const stopLatitude = trip.endLat ?? nextTrip?.startLat;
                  const stopLongitude = trip.endLon ?? nextTrip?.startLon;
                  const stopItem = hasStop
                    ? {
                        id: `trip-stop-${index}`,
                        latitude: stopLatitude,
                        longitude: stopLongitude,
                        duration: stopDuration,
                      }
                    : null;
                  const hasStopPoint =
                    stopItem && hasCoordinates(stopItem.latitude, stopItem.longitude);

                  return (
                    <Fragment key={`${trip.startTime}-${trip.endTime}-${index}`}>
                      <ListItemButton
                        sx={{
                          borderBottom: hasStop ? 'none' : '1px solid #d4d4d4ff',
                          borderLeft: `4px solid ${TRIP_LIST_BORDER_COLOR}`,
                          paddingLeft: 1.5,
                          '&.Mui-selected': {
                            backgroundColor: '#d3d3d3',
                          },
                          '&.Mui-selected:hover': {
                            backgroundColor: '#b0b0b0',
                          },
                        }}
                        onClick={() => {
                          setFrom(trip.startTime);
                          setTo(trip.endTime);
                          setReplay(true);
                          setHidden(true);
                          setLoading(true);
                        }}
                      >
                        <Grid container alignItems="center" spacing={0.5} sx={{ width: '100%' }}>
                          <Grid
                            item
                            xs={12}
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              width: '100%',
                            }}
                          >
                            <Typography
                              className={classes.replayTime}
                              variant="subtitle1"
                              align="left"
                              sx={{ color: TRIP_COLOR, fontWeight: 600 }}
                            >
                              <AccessTimeRoundedIcon
                                sx={{ mr: 0.5, color: TRIP_COLOR }}
                                fontSize="small"
                              />
                              {formatTime(trip.startTime, 'time', t)} -{' '}
                              {formatTime(trip.endTime, 'time', t)}
                            </Typography>
                            <Typography
                              className={classes.replayDistance}
                              variant="subtitle1"
                              align="right"
                              sx={{ color: '#607d8b', display: 'flex', alignItems: 'center' }}
                            >
                              <DirectionsCarIcon
                                fontSize="small"
                                sx={{ mr: 0.5, color: '#607d8b' }}
                              />
                              {formatDistance(Math.abs(trip.distance), distanceUnit, t)}
                            </Typography>
                          </Grid>

                          <Grid
                            item
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              width: '100%',
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{
                                color: 'text.secondary',
                                display: 'flex',
                                alignItems: 'center',
                              }}
                            >
                              {' '}
                              <PlayArrowRoundedIcon
                                sx={{ marginRight: '4px', color: '#27cb46' }}
                              />{' '}
                              {trip.startAddress
                                ? `  ${trip.startAddress.slice(0, 40) + '...'}`
                                : ''}
                            </Typography>
                          </Grid>

                          <Grid
                            item
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              width: '100%',
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{
                                color: 'text.secondary',
                                display: 'flex',
                                alignItems: 'center',
                              }}
                            >
                              {' '}
                              <StopRoundedIcon sx={{ marginRight: '4px', color: '#ed2736' }} />{' '}
                              {trip.endAddress ? `${trip.endAddress.slice(0, 40) + '...'}` : ''}
                            </Typography>
                          </Grid>
                        </Grid>
                      </ListItemButton>
                      {hasStop && (
                        <ListItemButton
                          disabled={!hasStopPoint}
                          sx={{
                            borderBottom: '1px solid #d4d4d4ff',
                            borderLeft: `4px solid ${STOP_LIST_BORDER_COLOR}`,
                            backgroundColor: '#fafafa',
                            paddingLeft: 3,
                          }}
                          onClick={() => handleStopClick(stopItem)}
                        >
                          <Grid container alignItems="center" spacing={0.5} sx={{ width: '100%' }}>
                            <Grid
                              item
                              xs={12}
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                width: '100%',
                              }}
                            >
                              <Typography
                                className={classes.replayTime}
                                variant="subtitle1"
                                align="left"
                                sx={{ color: STOP_COLOR, fontWeight: 600 }}
                              >
                                <StopRoundedIcon
                                  sx={{ mr: 0.5, color: STOP_ICON_COLOR }}
                                  fontSize="small"
                                />
                                {t('reportStops')}
                              </Typography>
                              <Typography
                                className={classes.replayDistance}
                                variant="subtitle1"
                                align="right"
                                sx={{
                                  color: STOP_COLOR,
                                  display: 'flex',
                                  alignItems: 'center',
                                  fontWeight: 600,
                                }}
                              >
                                <AccessTimeRoundedIcon
                                  fontSize="small"
                                  sx={{ mr: 0.5, color: STOP_COLOR }}
                                />
                                {formatStopDuration(stopDuration, t)}
                              </Typography>
                            </Grid>
                            {stopAddress && (
                              <Grid
                                item
                                sx={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  width: '100%',
                                }}
                              >
                                <Typography
                                  variant="body2"
                                  sx={{
                                    color: 'text.secondary',
                                    display: 'flex',
                                    alignItems: 'center',
                                  }}
                                >
                                  <PlaceIcon sx={{ mr: 0.5, color: STOP_COLOR }} />
                                  {stopAddress.slice(0, 40) + '...'}
                                </Typography>
                              </Grid>
                            )}
                          </Grid>
                        </ListItemButton>
                      )}
                    </Fragment>
                  );
                })}
              </List>
            )}
            {reportTab === 1 && (
              <List sx={{ padding: '0px' }}>
                {eventsLoading ? (
                  <Loader />
                ) : reportEvents.length ? (
                  reportEvents.map((event) => {
                    const details = formatEventDetails(event);
                    const address = formatEventAddress(event);
                    const eventColor = EVENT_COLORS[event.type] || DEFAULT_EVENT_COLOR;

                    return (
                      <ListItemButton
                        key={event.id}
                        disabled={
                          !hasCoordinates(event.position?.latitude, event.position?.longitude)
                        }
                        sx={{
                          borderBottom: '1px solid #d4d4d4ff',
                          borderLeft: `4px solid ${eventColor}`,
                          paddingLeft: 1.5,
                        }}
                        onClick={() => handleEventClick(event)}
                      >
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4,
                            width: '100%',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              width: '100%',
                            }}
                          >
                            <Typography
                              variant="subtitle1"
                              align="left"
                              sx={{ color: eventColor, fontWeight: 600 }}
                            >
                              {formatEventType(event)}
                            </Typography>
                            <Typography
                              variant="subtitle1"
                              align="right"
                              sx={{
                                color: '#607d8b',
                                display: 'flex',
                                alignItems: 'center',
                                fontWeight: 500,
                              }}
                            >
                              <AccessTimeRoundedIcon
                                sx={{ mr: 0.5, color: '#607d8b' }}
                                fontSize="small"
                              />
                              {formatTime(event.eventTime, 'seconds')}
                            </Typography>
                          </div>
                          {details && (
                            <Typography
                              variant="body2"
                              sx={{
                                color: 'text.secondary',
                                display: 'flex',
                                alignItems: 'center',
                              }}
                            >
                              {event.type === 'deviceOverspeed' && (
                                <SpeedIcon sx={{ mr: 0.5, color: eventColor }} fontSize="small" />
                              )}
                              {details}
                            </Typography>
                          )}
                          {address && (
                            <Typography
                              variant="body2"
                              sx={{
                                color: 'text.secondary',
                                display: 'flex',
                                alignItems: 'center',
                              }}
                            >
                              <PlaceIcon sx={{ mr: 0.5, color: '#78909c' }} fontSize="small" />
                              {address}
                            </Typography>
                          )}
                        </div>
                      </ListItemButton>
                    );
                  })
                ) : (
                  <Typography variant="body2" align="center" sx={{ padding: 2 }}>
                    {t('sharedNoData')}
                  </Typography>
                )}
              </List>
            )}
          </Paper>
        )}

        {loaded && !showList && (
          <>
            <Paper
              sx={{ backgroundColor: '#f5f5f5', width: '100%', padding: '10px', marginTop: '1px' }}
              square
            >
              <div className={classes.controls}>
                {summary.length ? (
                  <Typography
                    variant="subtitle1"
                    align="left"
                    sx={{ display: 'flex', alignItems: 'center', fontWeight: 500 }}
                  >
                    <SpeedIcon sx={{ mr: 0.5, color: '#ed2736' }} fontSize="small" />{' '}
                    {formatSpeed(topSpeed, 'kmh', t)}
                  </Typography>
                ) : null}
                {summary.length ? (
                  <Typography
                    variant="subtitle1"
                    align="right"
                    sx={{ display: 'flex', alignItems: 'center', fontWeight: 500 }}
                  >
                    <DirectionsCarIcon sx={{ mr: 0.5 }} fontSize="small" />{' '}
                    {formatDistance(summary[0]['distance'], 'km', t)}
                  </Typography>
                ) : null}
              </div>
            </Paper>
            <Paper square>
              <Grid container spacing={0} alignItems="center">
                <Grid item sx={{ width: '15%', display: 'flex', justifyContent: 'center' }}>
                  <IconButton
                    color="primary"
                    onClick={() => {
                      const newFrom = dayjs(from).subtract(1, 'day').startOf('day').toISOString();
                      const newTo = dayjs(to).subtract(1, 'day').endOf('day').toISOString();
                      setFrom(newFrom);
                      setTo(newTo);
                      setNoDataMessage(false);
                    }}
                  >
                    <ArrowLeftIcon sx={{ fontSize: 30 }} />
                  </IconButton>
                </Grid>
                <Grid item xs sx={{ width: '70%' }}>
                  <Typography
                    variant="body1"
                    align="center"
                    onClick={() => setOpen(true)}
                    sx={{
                      cursor: 'pointer',
                      marginBottom: '8px',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      padding: '8px 16px',
                      backgroundColor: noDataMessage ? '#f0f0f0' : 'transparent',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      transition: 'background-color 0.3s ease',
                      animation: noDataMessage ? 'blink 1s infinite' : 'none',
                      '@keyframes blink': {
                        '0%': { opacity: 1 },
                        '50%': { opacity: 0.5 },
                        '100%': { opacity: 1 },
                      },
                      '&:hover': {
                        backgroundColor: '#bfe8ffff',
                      },
                    }}
                  >
                    {dayjs(from).format('D MMM, YYYY')}
                  </Typography>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      open={open}
                      onClose={() => setOpen(false)}
                      value={dayjs(from)}
                      onChange={(newDate) => {
                        if (!newDate) {
                          return;
                        }
                        const newFrom = dayjs(newDate).startOf('day').toISOString();
                        const newTo = dayjs(newDate).endOf('day').toISOString();
                        setFrom(newFrom);
                        setTo(newTo);
                        setNoDataMessage(false);
                      }}
                      disableFuture={false}
                      slotProps={{
                        textField: { style: { display: 'none' } },
                        desktopPaper: { style: { marginTop: '70%', marginLeft: '5%' } },
                      }}
                      PopperProps={{
                        disablePortal: true,
                      }}
                    />
                  </LocalizationProvider>
                </Grid>
                <Grid item sx={{ width: '15%', display: 'flex', justifyContent: 'center' }}>
                  <IconButton
                    color="primary"
                    onClick={() => {
                      const newFrom = dayjs(from).add(1, 'day').startOf('day').toISOString();
                      const newTo = dayjs(to).add(1, 'day').endOf('day').toISOString();
                      setFrom(newFrom);
                      setTo(newTo);
                      setNoDataMessage(false);
                    }}
                    disabled={dayjs(to).isSame(dayjs(), 'day')}
                  >
                    <ArrowRightIcon sx={{ fontSize: 30 }} />
                  </IconButton>
                </Grid>
              </Grid>
            </Paper>
          </>
        )}
      </div>
      {showList && (
        <>
          <div>
            <Paper
              sx={{ position: 'fixed', width: '100%', bottom: '0%', zIndex: 1000, padding: '2%' }}
            >
              {replay ? (
                <>
                  <div className={classes.controls}>
                    <Typography variant="subtitle1" align="left">
                      {currentPosition?.fixTime
                        ? formatTime(currentPosition.fixTime, 'seconds')
                        : '-'}
                    </Typography>
                    <Typography variant="subtitle1" align="right">
                      {currentPosition?.speed != null
                        ? formatSpeed(currentPosition.speed, 'kmh', t)
                        : '-'}
                    </Typography>
                  </div>
                  {positions.length ? (
                    <div ref={speedChartRef} style={{ width: '100%', height: 110, marginTop: 8 }} />
                  ) : (
                    <Typography variant="body2" align="center" sx={{ marginTop: 1 }}>
                      {t('sharedNoData')}
                    </Typography>
                  )}
                  <div className={classes.controls}>
                    <IconButton
                      onClick={() => {
                        setIndex((prev) => {
                          const newIndex = Math.max(0, prev - 1);
                          setCurrentTime(positions[newIndex]?.fixTime || null);
                          return newIndex;
                        });
                      }}
                      disabled={index <= 0}
                    >
                      <FastRewindIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => {
                        if (!playing && positions.length) {
                          setCurrentTime(currentPosition?.fixTime || null);
                        }

                        setPlaying((prev) => !prev);
                      }}
                      disabled={index >= positions.length - 1}
                    >
                      {playing ? <PauseIcon /> : <PlayArrowIcon />}
                    </IconButton>
                    <IconButton
                      onClick={() => {
                        setIndex((prev) => {
                          const newIndex = Math.min(positions.length - 1, prev + 1);
                          setCurrentTime(positions[newIndex]?.fixTime || null);
                          return newIndex;
                        });
                      }}
                      disabled={index >= positions.length - 1}
                    >
                      <FastForwardIcon />
                    </IconButton>
                  </div>
                  <div className={classes.controls}>
                    <Typography variant="subtitle1" align="center">
                      {currentPosition?.address ? currentPosition.address.slice(0, 50) : '-'}
                    </Typography>
                  </div>
                </>
              ) : null}
            </Paper>
          </div>
        </>
      )}

      {showCard && currentPosition && (
        <StatusCard
          deviceId={selectedDeviceId}
          position={currentPosition}
          onClose={() => setShowCard(false)}
          disableActions
        />
      )}
    </div>
  );
};

export default QReplayPage;
