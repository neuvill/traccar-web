import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  Card,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Link,
  Tooltip,
  Avatar,
  Tabs,
  Tab,
  CircularProgress,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { PieChart } from '@mui/x-charts/PieChart';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import CloseIcon from '@mui/icons-material/Close';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PublishIcon from '@mui/icons-material/Publish';
import EditIcon from '@mui/icons-material/Edit';
import HistoryIcon from '@mui/icons-material/History';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PendingIcon from '@mui/icons-material/Pending';
import RouteIcon from '@mui/icons-material/Route';
import SpeedIcon from '@mui/icons-material/Speed';

import { useTranslation } from './LocalizationProvider';
import RemoveDialog from './RemoveDialog';
import PositionValue from './PositionValue';
import FuelGauge from './FuelGauge';
import DashboardLoading from './DashboardLoading';
import { useDeviceReadonly, useRestriction } from '../util/permissions';
import usePositionAttributes from '../attributes/usePositionAttributes';
import { devicesActions } from '../../store';
import { useCatch, useCatchCallback } from '../../reactHelper';
import { getDeviceMotionStatus } from '../util/deviceStatus';
import { useAttributePreference } from '../util/preferences';
import { prefixString } from '../util/stringUtils';
import { formatDistance, formatSpeed, formatVolume, formatNumericHours } from '../util/formatter';
import fetchOrThrow from '../util/fetchOrThrow';

const useStyles = makeStyles()((theme, { desktopPadding }) => ({
  root: {
    pointerEvents: 'none',
    position: 'fixed',
    zIndex: 5,
    left: 0,
    right: 0,
    bottom: 0,
    [theme.breakpoints.up('md')]: {
      left: desktopPadding,
    },
  },
  card: {
    pointerEvents: 'auto',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  statusLine: {
    height: 4,
    width: '100%',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(2),
    padding: theme.spacing(0.5, 2),
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  tabs: {
    minHeight: 40,
    flexShrink: 0,
    '& .MuiTab-root': {
      minHeight: 40,
      textTransform: 'none',
    },
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  content: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    rowGap: theme.spacing(1),
    columnGap: theme.spacing(3),
    padding: theme.spacing(1.5, 2),
    minHeight: 72,
  },
  deviceSection: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    flexShrink: 0,
  },
  deviceName: {
    fontWeight: 600,
    maxWidth: 240,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  stats: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    rowGap: theme.spacing(1),
    columnGap: theme.spacing(2.5),
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.75),
    color: theme.palette.text.secondary,
  },
  positionIcon: {
    fontSize: 20,
    stroke: 'currentColor',
    strokeWidth: 0.6,
    verticalAlign: 'middle',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
  },
  dashboard: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing(3),
  },
  tiles: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(1.5),
  },
  tile: {
    minWidth: 96,
    padding: theme.spacing(0.75, 1.5),
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.action.hover,
  },
  tileLabel: {
    display: 'block',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: theme.palette.text.secondary,
  },
  tileValue: {
    fontWeight: 600,
    lineHeight: 1.4,
  },
  closeButton: {
    marginLeft: theme.spacing(1),
    width: 22,
    height: 22,
    padding: 0,
    backgroundColor: theme.palette.error.main,
    color: theme.palette.error.contrastText,
    '&:hover': {
      backgroundColor: theme.palette.error.dark,
    },
  },
}));

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);

const REPORT_EVENT_TYPES = ['alarm', 'deviceOverspeed', 'ignitionOff', 'ignitionOn'];
const EVENT_COLORS = {
  alarm: '#d32f2f',
  deviceOverspeed: '#ed6c02',
  ignitionOn: '#2e7d32',
  ignitionOff: '#616161',
};
const DEFAULT_EVENT_COLOR = '#9e9e9e';

const STATUS_COLORS = {
  moving: '#27cb46',
  idling: '#00b5e2',
  parked: '#ed2736',
  still: '#ffcc00',
  default: '#9e9e9e',
};

const getDeviceStatusColor = (device, position) => {
  const status = getDeviceMotionStatus(device, position);
  return STATUS_COLORS[status] || STATUS_COLORS.default;
};

const getPositionIcon = (key, label, classes) => {
  const iconProps = {
    className: classes.positionIcon,
    fontSize: 'small',
  };
  const icons = {
    fixTime: <AccessTimeRoundedIcon {...iconProps} />,
    deviceTime: <AccessTimeRoundedIcon {...iconProps} />,
    serverTime: <AccessTimeRoundedIcon {...iconProps} />,
    address: <LocationOnOutlinedIcon {...iconProps} />,
    speed: <SpeedIcon {...iconProps} />,
    totalDistance: <RouteIcon {...iconProps} />,
    fuel: <LocalGasStationIcon {...iconProps} />,
  };

  if (!icons[key]) {
    return null;
  }

  return (
    <Tooltip title={label}>
      <span aria-label={label}>{icons[key]}</span>
    </Tooltip>
  );
};

const StatusCard = ({ deviceId, position, onClose, disableActions, desktopPadding = 0 }) => {
  const { classes } = useStyles({ desktopPadding });
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const t = useTranslation();

  const readonly = useRestriction('readonly');
  const deviceReadonly = useDeviceReadonly();

  const shareDisabled = useSelector((state) => state.session.server.attributes.disableShare);
  const user = useSelector((state) => state.session.user);
  const device = useSelector((state) => state.devices.items[deviceId]);

  const deviceImage = device?.attributes?.deviceImage;
  const statusColor = getDeviceStatusColor(device, position);

  const positionAttributes = usePositionAttributes(t);
  const positionItems = useAttributePreference(
    'positionItems',
    'fixTime,address,speed,totalDistance',
  );

  const navigationAppLink = useAttributePreference('navigationAppLink');
  const navigationAppTitle = useAttributePreference('navigationAppTitle');

  const distanceUnit = useAttributePreference('distanceUnit');
  const speedUnit = useAttributePreference('speedUnit');
  const volumeUnit = useAttributePreference('volumeUnit');

  const [anchorEl, setAnchorEl] = useState(null);

  const [removing, setRemoving] = useState(false);

  const [tab, setTab] = useState(0);

  const [eventCounts, setEventCounts] = useState(null);
  const [eventsLoading, setEventsLoading] = useState(false);

  const loadEventCounts = useCatchCallback(async () => {
    setEventsLoading(true);
    try {
      const to = dayjs();
      const from = to.startOf('day');
      const query = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
      query.append('deviceId', deviceId);
      REPORT_EVENT_TYPES.forEach((type) => query.append('type', type));
      const response = await fetchOrThrow(`/api/reports/events?${query.toString()}`, {
        headers: { Accept: 'application/json' },
      });
      const events = await response.json();
      setEventCounts(
        events.reduce((counts, event) => {
          counts[event.type] = (counts[event.type] || 0) + 1;
          return counts;
        }, {}),
      );
    } finally {
      setEventsLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    if (tab === 1 && deviceId) {
      loadEventCounts();
    }
  }, [tab, deviceId, loadEventCounts]);

  const [dashboardReport, setDashboardReport] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  const loadDashboard = useCatchCallback(async () => {
    setDashboardLoading(true);
    try {
      const to = dayjs();
      const from = to.startOf('day');
      const query = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
      query.append('deviceId', deviceId);
      const summaryQuery = new URLSearchParams(query);
      summaryQuery.append('daily', false);
      const [summaryResponse, tripsResponse, stopsResponse] = await Promise.all([
        fetchOrThrow(`/api/reports/summary?${summaryQuery.toString()}`, {
          headers: { Accept: 'application/json' },
        }),
        fetchOrThrow(`/api/reports/trips?${query.toString()}`, {
          headers: { Accept: 'application/json' },
        }),
        fetchOrThrow(`/api/reports/stops?${query.toString()}`, {
          headers: { Accept: 'application/json' },
        }),
      ]);
      const [summary, trips, stops] = await Promise.all([
        summaryResponse.json(),
        tripsResponse.json(),
        stopsResponse.json(),
      ]);
      setDashboardReport({ summary: summary[0] || null, trips, stops });
    } finally {
      setDashboardLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    if (tab === 2 && deviceId) {
      loadDashboard();
    }
  }, [tab, deviceId, loadDashboard]);

  const dashboardStats = useMemo(() => {
    if (!dashboardReport) {
      return null;
    }
    const { summary, trips, stops } = dashboardReport;
    const movingMs = trips.reduce((sum, trip) => sum + (trip.duration || 0), 0);
    const idlingMs = stops.reduce((sum, stop) => sum + (stop.engineHours || 0), 0);
    const parkedMs = stops.reduce(
      (sum, stop) => sum + Math.max((stop.duration || 0) - (stop.engineHours || 0), 0),
      0,
    );
    return {
      distance: summary ? formatDistance(summary.distance, distanceUnit, t) : null,
      averageSpeed:
        summary?.averageSpeed > 0 ? formatSpeed(summary.averageSpeed, speedUnit, t) : null,
      maxSpeed: summary?.maxSpeed > 0 ? formatSpeed(summary.maxSpeed, speedUnit, t) : null,
      spentFuel: summary?.spentFuel > 0 ? formatVolume(summary.spentFuel, volumeUnit, t) : null,
      trips: trips.length,
      stops: stops.length,
      motionPieData: [
        { id: 'moving', label: t('motionStatusMoving'), value: movingMs, color: '#27cb46' },
        { id: 'idling', label: t('motionStatusIdle'), value: idlingMs, color: '#00b5e2' },
        { id: 'parked', label: t('motionStatusParked'), value: parkedMs, color: '#ed2736' },
      ].filter((entry) => entry.value > 0),
    };
  }, [dashboardReport, distanceUnit, speedUnit, volumeUnit, t]);

  const handleRemove = useCatch(async (removed) => {
    if (removed) {
      const response = await fetchOrThrow('/api/devices');
      dispatch(devicesActions.refresh(await response.json()));
    }
    setRemoving(false);
  });

  const handleGeofence = useCatchCallback(async () => {
    const newItem = {
      name: t('sharedGeofence'),
      area: `CIRCLE (${position.latitude} ${position.longitude}, 50)`,
    };
    const response = await fetchOrThrow('/api/geofences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem),
    });
    const item = await response.json();
    await fetchOrThrow('/api/permissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: position.deviceId, geofenceId: item.id }),
    });
    navigate(`/settings/geofence/${item.id}`);
  }, [navigate, position]);

  return (
    <>
      <div className={classes.root}>
        {device && (
          <Card elevation={6} className={classes.card}>
            <div className={classes.statusLine} style={{ backgroundColor: statusColor }} />
            <div className={classes.header}>
              <div className={classes.deviceSection}>
                <Avatar
                  variant="rounded"
                  src={deviceImage ? `/api/media/${device.uniqueId}/${deviceImage}` : undefined}
                  sx={{ bgcolor: statusColor }}
                >
                  {device.name?.[0]?.toUpperCase()}
                </Avatar>
                <Typography variant="subtitle2" className={classes.deviceName} title={device.name}>
                  {device.name}
                </Typography>
              </div>

              <Tabs
                value={tab}
                onChange={(_, value) => setTab(value)}
                className={classes.tabs}
                textColor="primary"
                indicatorColor="primary"
              >
                <Tab
                  icon={<InfoOutlinedIcon fontSize="small" />}
                  iconPosition="start"
                  label={t('positionStatus')}
                />
                <Tab
                  icon={<NotificationsIcon fontSize="small" />}
                  iconPosition="start"
                  label={t('reportEvents')}
                />
                <Tab
                  icon={<DashboardIcon fontSize="small" />}
                  iconPosition="start"
                  label={t('dashboardTitle')}
                />
              </Tabs>

              <div className={classes.headerActions}>
                <div className={classes.actions}>
                  <Tooltip title={t('sharedExtra')}>
                    <IconButton
                      color="secondary"
                      onClick={(e) => setAnchorEl(e.currentTarget)}
                      disabled={!position}
                    >
                      <PendingIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('reportReplay')}>
                    <IconButton
                      onClick={() =>
                        navigate(`/qreplay?deviceId=${deviceId}`, { state: { isQuick: true } })
                      }
                      disabled={disableActions || !position}
                    >
                      <HistoryIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('commandTitle')}>
                    <IconButton
                      onClick={() => navigate(`/settings/device/${deviceId}/command`)}
                      disabled={disableActions}
                    >
                      <PublishIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('sharedEdit')}>
                    <IconButton
                      onClick={() => navigate(`/settings/device/${deviceId}`)}
                      disabled={disableActions || deviceReadonly}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                </div>
                <IconButton
                  size="small"
                  onClick={onClose}
                  onTouchStart={onClose}
                  className={classes.closeButton}
                >
                  <CloseIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </div>
            </div>

            <div className={classes.content}>
              {tab === 0 && position && (
                <div className={classes.stats}>
                  <div className={classes.statItem}>
                    {getPositionIcon('fuel', positionAttributes.fuel?.name, classes)}
                    <FuelGauge
                      value={position.attributes.fuel}
                      label={positionAttributes.fuel?.name}
                    />
                  </div>
                  {positionItems
                    .split(',')
                    .filter((key) => key !== 'fuel')
                    .filter((key) => hasOwn(position, key) || hasOwn(position.attributes, key))
                    .map((key) => {
                      const name = positionAttributes[key]?.name || key;
                      return (
                        <div key={key} className={classes.statItem}>
                          {getPositionIcon(key, name, classes)}
                          <Typography variant="body2">
                            <PositionValue
                              position={position}
                              property={hasOwn(position, key) ? key : null}
                              attribute={hasOwn(position, key) ? null : key}
                            />
                          </Typography>
                        </div>
                      );
                    })}
                  <Link component={RouterLink} to={`/position/${position.id}`} variant="body2">
                    {t('sharedShowDetails')}
                  </Link>
                </div>
              )}
              {tab === 0 && !position && (
                <Typography variant="body2" color="textSecondary">
                  {t('sharedNoData')}
                </Typography>
              )}
              {tab === 1 && eventsLoading && (
                <div className={classes.statItem}>
                  <CircularProgress size={16} />
                  <Typography variant="body2" color="textSecondary">
                    {t('sharedLoading')}
                  </Typography>
                </div>
              )}
              {tab === 1 && !eventsLoading && (
                <div className={classes.stats}>
                  {eventCounts && Object.keys(eventCounts).length > 0 ? (
                    Object.entries(eventCounts)
                      .sort(([, a], [, b]) => b - a)
                      .map(([type, count]) => {
                        const eventColor = EVENT_COLORS[type] || DEFAULT_EVENT_COLOR;
                        return (
                          <div key={type} className={classes.statItem}>
                            <NotificationsIcon
                              className={classes.positionIcon}
                              fontSize="small"
                              sx={{ color: eventColor }}
                            />
                            <Typography variant="body2" sx={{ color: eventColor, fontWeight: 600 }}>
                              {`${t(prefixString('event', type))}: ${count}`}
                            </Typography>
                          </div>
                        );
                      })
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      {t('sharedNoData')}
                    </Typography>
                  )}
                </div>
              )}
              {tab === 2 && dashboardLoading && <DashboardLoading text={t('sharedLoading')} />}
              {tab === 2 && !dashboardLoading && dashboardStats && (
                <div className={classes.dashboard}>
                  <div className={classes.tiles}>
                    <div className={classes.tile}>
                      <Typography className={classes.tileLabel}>{t('sharedDistance')}</Typography>
                      <Typography className={classes.tileValue}>
                        {dashboardStats.distance ?? '-'}
                      </Typography>
                    </div>
                    <div className={classes.tile}>
                      <Typography className={classes.tileLabel}>
                        {t('reportAverageSpeed')}
                      </Typography>
                      <Typography className={classes.tileValue}>
                        {dashboardStats.averageSpeed ?? '-'}
                      </Typography>
                    </div>
                    <div className={classes.tile}>
                      <Typography className={classes.tileLabel}>
                        {t('reportMaximumSpeed')}
                      </Typography>
                      <Typography className={classes.tileValue}>
                        {dashboardStats.maxSpeed ?? '-'}
                      </Typography>
                    </div>
                    <div className={classes.tile}>
                      <Typography className={classes.tileLabel}>{t('reportTrips')}</Typography>
                      <Typography className={classes.tileValue}>{dashboardStats.trips}</Typography>
                    </div>
                    <div className={classes.tile}>
                      <Typography className={classes.tileLabel}>{t('reportStops')}</Typography>
                      <Typography className={classes.tileValue}>{dashboardStats.stops}</Typography>
                    </div>
                    {dashboardStats.spentFuel && (
                      <div className={classes.tile}>
                        <Typography className={classes.tileLabel}>
                          {t('reportSpentFuel')}
                        </Typography>
                        <Typography className={classes.tileValue}>
                          {dashboardStats.spentFuel}
                        </Typography>
                      </div>
                    )}
                  </div>
                  {dashboardStats.motionPieData.length > 0 && (
                    <PieChart
                      width={260}
                      height={200}
                      series={[
                        {
                          data: dashboardStats.motionPieData,
                          innerRadius: 36,
                          arcLabel: (item) => formatNumericHours(item.value, t),
                          arcLabelMinAngle: 25,
                          valueFormatter: (item) => formatNumericHours(item.value, t),
                        },
                      ]}
                      slotProps={{ legend: { direction: 'vertical' } }}
                      sx={{
                        '& .MuiPieArcLabel-root': {
                          fill: '#fff',
                          fontSize: 12,
                        },
                      }}
                    />
                  )}
                </div>
              )}
              {tab === 2 && !dashboardLoading && !dashboardStats && (
                <Typography variant="body2" color="textSecondary">
                  {t('sharedNoData')}
                </Typography>
              )}
            </div>
          </Card>
        )}
      </div>
      {position && (
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
          <MenuItem
            onClick={() => navigate(`/stream?deviceId=${deviceId}`)}
            disabled={position.protocol !== 'jt808'}
          >
            {t('linkLiveVideo')}
          </MenuItem>
          {!readonly && <MenuItem onClick={handleGeofence}>{t('sharedCreateGeofence')}</MenuItem>}
          <MenuItem
            component="a"
            target="_blank"
            href={`https://www.google.com/maps/search/?api=1&query=${position.latitude}%2C${position.longitude}`}
          >
            {t('linkGoogleMaps')}
          </MenuItem>
          <MenuItem
            component="a"
            target="_blank"
            href={`http://maps.apple.com/?ll=${position.latitude},${position.longitude}`}
          >
            {t('linkAppleMaps')}
          </MenuItem>
          <MenuItem
            component="a"
            target="_blank"
            href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${position.latitude}%2C${position.longitude}&heading=${position.course}`}
          >
            {t('linkStreetView')}
          </MenuItem>
          {navigationAppTitle && (
            <MenuItem
              component="a"
              target="_blank"
              href={navigationAppLink
                .replace('{latitude}', position.latitude)
                .replace('{longitude}', position.longitude)}
            >
              {navigationAppTitle}
            </MenuItem>
          )}
          {!shareDisabled && !user.temporary && (
            <MenuItem onClick={() => navigate(`/settings/device/${deviceId}/share`)}>
              <Typography color="secondary">{t('sharedShare')}</Typography>
            </MenuItem>
          )}
        </Menu>
      )}
      <RemoveDialog
        open={removing}
        endpoint="devices"
        itemId={deviceId}
        onResult={(removed) => handleRemove(removed)}
      />
    </>
  );
};

export default StatusCard;
