import {
  useState, useEffect, useRef, useCallback,
} from 'react';
import {
  IconButton, Paper, Slider, Toolbar, Typography, ListItemButton, List, Grid, Box
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import TuneIcon from '@mui/icons-material/Tune';
import DownloadIcon from '@mui/icons-material/Download';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import FastForwardIcon from '@mui/icons-material/FastForward';
import FastRewindIcon from '@mui/icons-material/FastRewind';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded'
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import StopRoundedIcon from '@mui/icons-material/StopRounded'
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import MapView from '../map/core/MapView';
import MapRoutePath from '../map/MapRoutePathHm';
import MapRoutePoints from '../map/MapRoutePointsHm';
import MapPositions from '../map/MapPositions';
import { formatSpeed, formatTime, formatDistance } from '../common/util/formatter';
import ReportFilter, { updateReportParams } from '../reports/components/ReportFilter';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useCatch } from '../reactHelper';
import MapCamera from '../map/MapCamera';
import MapGeofence from '../map/MapGeofence';
import StatusCard from '../common/components/StatusCard';
import MapScale from '../map/MapScale';
import BackIcon from '../common/components/BackIcon';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { useAttributePreference } from '../common/util/preferences';
import { useLocation } from 'react-router-dom';

import SpeedIcon from '@mui/icons-material/Speed';


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
    top: 0,
    margin: theme.spacing(1.5),
    width: theme.dimensions.drawerWidthDesktop,
    [theme.breakpoints.down('md')]: {
      width: '100%',
      margin: 0,
    },
  },
  title: {
    flexGrow: 1,
  },
  slider: {
    width: '100%',
  },
  controls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tripControls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  formControlLabel: {
    height: '100%',
    width: '100%',
    paddingRight: theme.spacing(1),
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    padding: theme.spacing(2),
    [theme.breakpoints.down('md')]: {
      margin: theme.spacing(1),
    },
    [theme.breakpoints.up('md')]: {
      marginTop: theme.spacing(1),
    },
  },
}));

const ReplayPage = () => {
  const location = useLocation();
  const t = useTranslation();
  const { classes } = useStyles();
  const navigate = useNavigate();
  const timerRef = useRef();
  const { isQuick } = location.state || {};
  const [isQuick2, setIsQuick] = useState(isQuick);

  const [searchParams, setSearchParams] = useSearchParams();

  const defaultDeviceId = useSelector((state) => state.devices.selectedId);

  const [positions, setPositions] = useState([]);
  const [summary, setSummary] = useState([]);
  const [trips, setTrips] = useState([]);
  const [index, setIndex] = useState(0);
  const [selectedDeviceId, setSelectedDeviceId] = useState(defaultDeviceId);
  const [showCard, setShowCard] = useState(false);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const distanceUnit = useAttributePreference('distanceUnit');
  const [replay, setReplay] = useState(false);
  const [showList, setShowList] = useState(true);
  const loaded = Boolean(from && to && !loading && positions.length || !replay);


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
    if (!from && !to) {
      setPositions([]);
    }
  }, [from, to, setPositions]);

  useEffect(() => {
    if (playing && positions.length > 0) {
      timerRef.current = setInterval(() => {
        setIndex((index) => index + 1);
      }, 500);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [playing, positions]);

  useEffect(() => {
    if (index >= positions.length - 1) {
      clearInterval(timerRef.current);
      setPlaying(false);
    }
  }, [index, positions]);

  const onPointClick = useCallback((_, index) => {
    setIndex(index);
  }, [setIndex]);

  const onMarkerClick = useCallback((positionId) => {
    setShowCard(!!positionId);
  }, [setShowCard]);

  const onShow = useCatch(async ({ deviceIds, from, to }) => {
    const deviceId = deviceIds.find(() => true);
    setLoading(true);
    setSelectedDeviceId(deviceId);
    const query = new URLSearchParams({ deviceId, from, to });
    console.log(query.toString());
    if (replay) {
      try {
        const response = await fetchOrThrow(`/api/positions?${query.toString()}`);
        setIndex(0);
        const positions = await response.json();
        setPositions(positions);
        console.log('positions done');
        if (!positions.length) {
          throw Error(t('sharedNoData'));
        }
      } finally {
        setLoading(true);
      }
    }

    try {
      console.log('trips started');
      const response = await fetchOrThrow(`/api/reports/trips?${query.toString()}`, {
        headers: { Accept: 'application/json' },
      });


      setIndex(0);
      const trips = await response.json();
      setTrips(trips);
      console.log('trips', trips);
      console.log('isQuick', isQuick2);

      if (!trips.length) {
        throw Error(t('sharedNoData'));
      }
    } finally {
      setLoading(true);
    }


    try {
      console.log('summary started');
      const response = await fetchOrThrow(`/api/reports/summary?${query.toString()}`);
      setIndex(0);
      const summary = await response.json();
      setSummary(summary);
      console.log('summary', summary);

      if (!summary.length) {
        throw Error(t('sharedNoData'));
      }
    } finally {
      setLoading(false);
      setShowList(false);
    }
  });

  const handleDownload = () => {
    const query = new URLSearchParams({ deviceId: selectedDeviceId, from, to });
    window.location.assign(`/api/positions/kml?${query.toString()}`);
  };

  return (
    <div className={classes.root}>

      <MapView>
        <MapGeofence />
        {replay && (
          <>
            {<MapRoutePath positions={positions} />}
            {<MapRoutePoints positions={positions} onClick={onPointClick} />}
            {index < positions.length && (
              <MapPositions positions={[positions[index]]} onMarkerClick={onMarkerClick} titleField="fixTime" />
            )}
          </>
        )}
      </MapView>
      <MapScale />
      <MapCamera positions={positions} />

      <div className={classes.sidebar}>
        <Paper elevation={3} square>

          <Toolbar>
            <IconButton edge="start" sx={{ mr: 2 }} onClick={() => navigate(-1)}>
              <BackIcon />
            </IconButton>

            <Typography className={classes.title}>{deviceName}</Typography>
            {loaded && (
              <>
                <IconButton onClick={handleDownload}>
                  <DownloadIcon />
                </IconButton>
                <IconButton edge="end" onClick={() => updateReportParams(searchParams, setSearchParams, 'ignore', [])}>
                  <TuneIcon />
                </IconButton>
              </>
            )}
          </Toolbar>
        </Paper>
        {loaded && !showList &&
          <Paper style={{ maxHeight: '350px', overflowY: 'auto', marginTop: '0px' }}>

            <List>
              {trips.map((trip, index) => {
                return (
                  <ListItemButton key={index}
                    sx={{
                      borderBottom: '1px solid lightgrey', // Adds a black bottom border
                      '&.Mui-selected': {
                        backgroundColor: '#d3d3d3', // Darker background for selected item
                      },
                      '&.Mui-selected:hover': {
                        backgroundColor: '#b0b0b0', // Even darker background on hover
                      },
                    }}
                  >

                    <Grid container alignItems="center" spacing={1}>

                      <Grid container alignItems="center">
                        <Grid item xs={9}>
                          <Typography variant="subtitle1" align="left" sx={{ display: 'flex', alignItems: 'center' }}>
                            <AccessTimeRoundedIcon sx={{ mr: 0.5 }} fontSize="small" />
                            {formatTime(trip.startTime, 'time', t)} - {formatTime(trip.endTime, 'time', t)}
                          </Typography>
                        </Grid>

                        {/* Distance (right) */}
                        <Grid item xs={3}>
                          <Typography variant="subtitle1" align="right" sx={{ display: 'flex', alignItems: 'center', marginLeft: '25px' }}>
                            <DirectionsCarIcon fontSize="small" sx={{ mr: 0.5 }} />
                            {formatDistance(Math.abs(trip.distance), distanceUnit, t)}
                          </Typography>
                        </Grid>
                      </Grid>

                      <Grid item xs={12}>
                        <Typography variant="body2" sx={{ color: 'text.primary', display: 'flex', alignItems: 'center' }}> <PlayArrowRoundedIcon sx={{ marginRight: '4px', color: '#27cb46' }} /> {trip.startAddress ? `  ${trip.startAddress.slice(0, 40) + "..."}` : ""}</Typography>
                      </Grid>

                      <Grid item xs={12}>
                        <Typography variant="body2" sx={{ color: 'grey', display: 'flex', alignItems: 'center' }}> <StopRoundedIcon sx={{ marginRight: '4px', color: '#ed2736' }} /> {trip.endAddress ? `${trip.endAddress.slice(0, 40) + "..."}` : ""}</Typography>
                      </Grid>

                    </Grid>

                  </ListItemButton>

                );
              })}
            </List>

          </Paper>
        }
        {loaded && showList && (
          <>
            <Paper className={classes.content} square>
              {replay ? (
                <>

                  <div className={classes.controls}>
                    <Typography variant="subtitle1" align="left">{formatTime(positions[index].fixTime, 'seconds')}</Typography>
                    <Typography variant="subtitle1" align="right">{positions[index].speed ? formatSpeed(positions[index].speed, 'kmh', t) : '-'}</Typography>
                  </div>
                  <Slider
                    className={classes.slider}
                    max={positions.length - 1}
                    step={null}
                    marks={positions.map((_, index) => ({ value: index }))}
                    value={index}
                    onChange={(_, index) => setIndex(index)}
                  />
                  <div className={classes.controls}>

                    <IconButton onClick={() => setIndex((index) => index - 1)} disabled={playing || index <= 0}>
                      <FastRewindIcon />
                    </IconButton>
                    <IconButton onClick={() => setPlaying(!playing)} disabled={index >= positions.length - 1}>
                      {playing ? <PauseIcon /> : <PlayArrowIcon />}
                    </IconButton>
                    <IconButton onClick={() => setIndex((index) => index + 1)} disabled={playing || index >= positions.length - 1}>
                      <FastForwardIcon />
                    </IconButton>

                  </div>
                  <div className={classes.controls}>
                    <Typography variant="subtitle1" align="center">{positions.length ? positions[index].address.slice(0, 50) : '-'}</Typography>
                  </div>

                </>
              ) : (
                <ReportFilter onShow={onShow} deviceType="single" loading={loading} />
              )}
            </Paper>
          </>)}
        {loaded && !showList &&
          <Paper className={classes.content} square>


            <div className={classes.controls}>
              {summary.length ?
                <Typography variant="subtitle1" align="left">
                  <DirectionsCarIcon fontSize='5px' /> {formatDistance(summary[0]['distance'], 'km', t)}
                </Typography> : null}
              {summary.length ?
                <Typography variant="subtitle1" align="right">
                  <SpeedIcon fontSize='5px' /> {formatSpeed(summary[0]['maxSpeed'], 'kmh', t)}
                </Typography> : null}
            </div>

          </Paper>
        }
      </div>
      {
        showCard && index < positions.length && (
          <StatusCard
            deviceId={selectedDeviceId}
            position={positions[index]}
            onClose={() => setShowCard(false)}
            disableActions
          />
        )
      }
    </div >
  );
};

export default ReplayPage;
