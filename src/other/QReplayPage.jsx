import React, {
    useState, useEffect, useRef, useCallback,
} from 'react';
import {
    IconButton, Paper, Slider, Toolbar, Typography, ListItemButton, List, Grid, Divider
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
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { DesktopDatePicker } from '@mui/x-date-pickers/DesktopDatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import ArrowLeftIcon from '@mui/icons-material/ArrowLeft';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';

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
        //width: theme.dimensions.drawerWidthDesktop,
        width: '33%',
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
        //marginBottom: '0%',
        paddingBottom: '0px',
        [theme.breakpoints.down('md')]: {
            maxHeight: '71vh',
        },

    },
}));

const QReplayPage = () => {
    const location = useLocation();
    const t = useTranslation();
    const { classes } = useStyles();
    const navigate = useNavigate();
    const timerRef = useRef();
    const { isQuick } = location.state || {};
    const [isQuick2, setIsQuick] = useState(isQuick);
    const [hidden, setHidden] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();

    const defaultDeviceId = useSelector((state) => state.devices.selectedId);

    const [positions, setPositions] = useState([]);
    const [summary, setSummary] = useState([]);
    const [trips, setTrips] = useState([]);
    const [index, setIndex] = useState(0);
    const [selectedDeviceId, setSelectedDeviceId] = useState(defaultDeviceId || searchParams.get('deviceId'));
    const [showCard, setShowCard] = useState(false);
    //const [from, setFrom] = useState(searchParams.get('from'));
    const todayMidnight = new Date();
    const [to, setTo] = useState(todayMidnight.toISOString());
    todayMidnight.setHours(0, 0, 0, 0);
    const [from, setFrom] = useState(todayMidnight.toISOString());
    const [noDataMessage, setNoDataMessage] = useState(false);
    //const [to, setTo] = useState(searchParams.get('to'));
    const [playing, setPlaying] = useState(false);
    const [loading, setLoading] = useState(false);
    const distanceUnit = useAttributePreference('distanceUnit');
    const [replay, setReplay] = useState(false);
    const [showList, setShowList] = useState(true);
    const loaded = Boolean(from && to && !loading && positions.length || !hidden);
    const [open, setOpen] = useState(false);
    const [dateChanged, setDateChanged] = useState(false);


    const deviceName = useSelector((state) => {
        if (selectedDeviceId) {
            const device = state.devices.items[selectedDeviceId];
            if (device) {
                return device.name;
            }
        }
        return null;
    });
    console.log('from:', from);
    console.log('to:', to);

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

    // Fetch positions whenever `replay` becomes true
    useEffect(() => {
        const fetchPositions = async () => {
            if (replay && selectedDeviceId && from && to) {
                try {
                    //setLoading(false);
                    const query = new URLSearchParams({ deviceId: selectedDeviceId, from, to });
                    const response = await fetchOrThrow(`/api/positions?${query.toString()}`);
                    setIndex(0);
                    const newPositions = await response.json();
                    setPositions(newPositions);
                    console.log('positions updated after replay toggle');

                    if (!newPositions.length) {
                        throw Error(t('sharedNoData'));
                    }
                } finally {
                    setLoading(true);
                    setShowList(true);
                }
            }
        };
        //end
        fetchPositions();
    }, [replay, selectedDeviceId, from, to, t]);

    useEffect(() => {
        const deviceId = selectedDeviceId;
        setLoading(true);
        //setSelectedDeviceId(deviceId);
        const query = new URLSearchParams({ deviceId, from, to });
        const fetchTrips = async () => {
            try {
                console.log('trips started');
                const response = await fetchOrThrow(`/api/reports/trips?${query.toString()}`, {
                    headers: { Accept: 'application/json' },
                });
                console.log(response);

                setIndex(0);
                const trips = await response.json();
                setTrips(trips);
                console.log('trips', trips);
                if (!trips.length) {
                    throw Error(t('sharedNoData'));
                }
            } finally {
                setLoading(true);
            }
        };
        fetchTrips();

        const fetchSummary = async () => {
            try {
                console.log('summary started');
                const response = await fetchOrThrow(`/api/reports/summary?${query.toString()}`, {
                    headers: { Accept: 'application/json' },
                });
                setIndex(0);
                console.log(response);
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
            console.log(loading);
        };
        fetchSummary();
    }, [selectedDeviceId, dateChanged]);

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
            <Paper elevation={5} square sx={{ backgroundColor: '#f5f5f5', position: 'fixed', zIndex: 5, left: 0, top: 0, width: '100%' }}>
                <Toolbar>
                    {replay ? (
                        <IconButton edge="start" sx={{ mr: 2 }} onClick={() => {
                            setHidden(!hidden);
                            setReplay(false);
                            setShowList(!showList);
                        }}>
                            <BackIcon />
                        </IconButton>
                    ) : (
                        <>
                            <IconButton edge="start" sx={{ mr: 2 }} onClick={() => navigate(-1)}>
                                <BackIcon />
                            </IconButton>

                        </>
                    )}
                    <Typography className={classes.title} sx={{ fontWeight: 500 }}>{deviceName}</Typography>
                    {loaded && (
                        <>
                            {!showList && (
                                <IconButton className={classes.replayButton} onClick={() => {
                                    const newFrom = dayjs(from).startOf('day').toISOString();
                                    const newTo = dayjs(to).endOf('day').toISOString();
                                    setFrom(newFrom);
                                    setTo(newTo);

                                    setHidden(!hidden)
                                    setReplay(true);
                                }}>
                                    <RouteIcon sx={{ color: '#1976d2' }} className={classes.flashing} />
                                </IconButton>
                            )}
                            <IconButton onClick={handleDownload}>
                                <DownloadIcon />
                            </IconButton>
                            <IconButton edge="end"
                                onClick={() => {

                                    setShowList(true);
                                    setLoading(false);
                                    //updateReportParams(searchParams, setSearchParams, 'ignore', []);
                                }}
                            >
                                <TuneIcon />
                            </IconButton>
                        </>
                    )}
                </Toolbar>
            </Paper>
            <div className={classes.sidebar}>

                {loaded && !showList &&
                    <Paper square className={classes.replayListItem} style={{ display: hidden ? 'none' : undefined }}>

                        <List sx={{ padding: '0px' }}>
                            {trips.map((trip, index) => {
                                return (

                                    <ListItemButton key={index}
                                        sx={{

                                            borderBottom: '1px solid #ccccccff', // Adds a black bottom border
                                            '&.Mui-selected': {
                                                backgroundColor: '#d3d3d3', // Darker background for selected item
                                            },
                                            '&.Mui-selected:hover': {
                                                backgroundColor: '#b0b0b0',// Even darker background on hover
                                            },
                                        }}
                                        onClick={() => {
                                            setFrom(trip.startTime);
                                            setTo(trip.endTime);
                                            setReplay(true);
                                            setHidden(!hidden);
                                        }}>

                                        <Grid container alignItems="center" spacing={0.5} sx={{ width: '100%' }} >
                                            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }} >
                                                <Typography className={classes.replayTime} variant="subtitle1" align="left">
                                                    <AccessTimeRoundedIcon sx={{ mr: 0.5 }} fontSize="small" />
                                                    {formatTime(trip.startTime, 'time', t)} - {formatTime(trip.endTime, 'time', t)}
                                                </Typography>
                                                <Typography className={classes.replayDistance} variant="subtitle1" align="right" >
                                                    <DirectionsCarIcon fontSize="small" sx={{ mr: 0.5 }} />
                                                    {formatDistance(Math.abs(trip.distance), distanceUnit, t)}
                                                </Typography>

                                            </Grid>

                                            <Grid item sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                                <Typography variant="body2" sx={{ color: 'text.primary', display: 'flex', alignItems: 'center' }}> <PlayArrowRoundedIcon sx={{ marginRight: '4px', color: '#27cb46' }} /> {trip.startAddress ? `  ${trip.startAddress.slice(0, 40) + "..."}` : ""}</Typography>
                                            </Grid>

                                            <Grid item sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                                <Typography variant="body2" sx={{ color: 'grey', display: 'flex', alignItems: 'center' }}> <StopRoundedIcon sx={{ marginRight: '4px', color: '#ed2736' }} /> {trip.endAddress ? `${trip.endAddress.slice(0, 40) + "..."}` : ""}</Typography>
                                            </Grid>
                                        </Grid>
                                    </ListItemButton>

                                );
                            })}
                        </List>
                    </Paper>
                }
                {showList && (
                    <>

                        <Paper sx={{ position: 'fixed', width: '98.5%', bottom: '8%' }} className={classes.content} square>
                            {replay ? (
                                <>

                                    <div className={classes.controls}>
                                        <Typography variant="subtitle1" align="left">{positions[index].fixTime ? formatTime(positions[index].fixTime, 'seconds') : '-'}</Typography>
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

                                (null)
                            )}
                        </Paper>

                    </>)}
                {loaded && !showList &&
                    <>
                        <Paper sx={{ backgroundColor: '#f5f5f5', width: '100%', padding: '10px', marginTop: '1px' }} square>


                            <div className={classes.controls}>
                                {summary.length ?
                                    <Typography variant="subtitle1" align="left" sx={{ display: 'flex', alignItems: 'center', fontWeight: 500 }}>
                                        <SpeedIcon sx={{ mr: 0.5, color: '#ed2736' }} fontSize='small' /> {formatSpeed(summary[0]['maxSpeed'], 'kmh', t)}
                                    </Typography> : null}
                                {summary.length ?
                                    <Typography variant="subtitle1" align="right" sx={{ display: 'flex', alignItems: 'center', fontWeight: 500 }}>
                                        <DirectionsCarIcon sx={{ mr: 0.5 }} fontSize='small' /> {formatDistance(summary[0]['distance'], 'km', t)}
                                    </Typography> : null}

                            </div>

                        </Paper>
                        <Paper square >
                            <Grid container spacing={0} alignItems="center">
                                <Grid item sx={{ width: '15%', display: 'flex', justifyContent: 'center' }}>
                                    <IconButton color='primary' onClick={() => {
                                        const newFrom = dayjs(from).subtract(1, 'day').startOf('day').toISOString();
                                        const newTo = dayjs(to).subtract(1, 'day').endOf('day').toISOString();
                                        setFrom(newFrom);
                                        setTo(newTo);
                                        setNoDataMessage(false);
                                        setDateChanged(!dateChanged);
                                    }}>
                                        <ArrowLeftIcon sx={{ fontSize: 30 }} />
                                    </IconButton>
                                </Grid>
                                <Grid item xs sx={{ width: '70%' }}>
                                    <Typography
                                        variant="body1"
                                        align="center"
                                        onClick={() => setOpen(true)}
                                        sx={{
                                            cursor: 'pointer', // Makes it clickable
                                            marginBottom: '8px',
                                            fontWeight: 'bold',
                                            textAlign: 'center',
                                            padding: '8px 16px', // Adds padding to make it look like a button
                                            backgroundColor: noDataMessage ? '#f0f0f0' : 'transparent', // Background color
                                            border: '1px solid #ccc', // Adds a border
                                            borderRadius: '4px', // Rounds the corners
                                            transition: 'background-color 0.3s ease', // Smooth hover effect
                                            animation: noDataMessage ? 'blink 1s infinite' : 'none', // Blinking animation
                                            '@keyframes blink': {
                                                '0%': { opacity: 1 },
                                                '50%': { opacity: 0.5 },
                                                '100%': { opacity: 1 },
                                            },
                                            '&:hover': {
                                                backgroundColor: '#bfe8ffff', // Changes background on hover
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
                                                const newFrom = dayjs(newDate.toISOString()).startOf('day').toISOString();
                                                const newTo = dayjs(newDate.toISOString()).endOf('day').toISOString();
                                                setFrom(newFrom);
                                                setTo(newTo);
                                                setNoDataMessage(false);
                                                setDateChanged(!dateChanged);
                                            }}
                                            disableFuture={false}
                                            slotProps={{ textField: { style: { display: 'none' } }, desktopPaper: { style: { marginTop: '70%', marginLeft: '5%' } } }} // Hides the input field
                                            // Adds space above the DatePicker pop-up
                                            PopperProps={{
                                                disablePortal: true, // Ensures it renders in the correct place
                                            }}

                                        />
                                    </LocalizationProvider>
                                </Grid>
                                <Grid item sx={{ width: '15%', display: 'flex', justifyContent: 'center' }}>
                                    <IconButton color='primary' onClick={() => {
                                        const newFrom = dayjs(from).add(1, 'day').startOf('day').toISOString();
                                        const newTo = dayjs(to).add(1, 'day').endOf('day').toISOString();
                                        setFrom(newFrom);
                                        setTo(newTo);
                                        setNoDataMessage(false);
                                        setDateChanged(!dateChanged);
                                    }}
                                        disabled={dayjs(to).isSame(dayjs(), 'day')}
                                    >
                                        <ArrowRightIcon sx={{ fontSize: 30 }} />
                                    </IconButton>
                                </Grid>
                            </Grid>
                        </Paper>
                    </>
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

export default QReplayPage;