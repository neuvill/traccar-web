import { useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link as RouterLink } from 'react-router-dom';

import {
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Link,
  Tooltip,
  SwipeableDrawer,
  Box,
  Avatar,
  CircularProgress,
  Dialog,
} from '@mui/material';
import { PieChart } from '@mui/x-charts/PieChart';
import { makeStyles } from 'tss-react/mui';
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
import useDeviceEventCounts from './useDeviceEventCounts';
import useDeviceDashboardSummary from './useDeviceDashboardSummary';
import { useDeviceReadonly, useRestriction } from '../util/permissions';
import usePositionAttributes from '../attributes/usePositionAttributes';
import { devicesActions } from '../../store';
import { useCatch, useCatchCallback } from '../../reactHelper';
import { getDeviceMotionStatus } from '../util/deviceStatus';
import { useAttributePreference } from '../util/preferences';
import { prefixString } from '../util/stringUtils';
import { formatNumericHours } from '../util/formatter';
import fetchOrThrow from '../util/fetchOrThrow';

const useStyles = makeStyles()((theme) => ({
  drawerPaper: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    height: '45vh',
    maxHeight: '45vh',
    display: 'flex',
    flexDirection: 'column',
  },
  statusLine: {
    height: 4,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  closeButton: {
    position: 'absolute',
    top: theme.spacing(1),
    right: theme.spacing(1),
    width: 22,
    height: 22,
    padding: 0,
    zIndex: 2,
    backgroundColor: theme.palette.error.main,
    color: theme.palette.error.contrastText,
    '&:hover': {
      backgroundColor: theme.palette.error.dark,
    },
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: theme.palette.divider,
    borderRadius: 3,
    margin: theme.spacing(1, 'auto'),
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    padding: theme.spacing(0, 2, 1),
    flexShrink: 0,
  },
  deviceAvatar: {
    cursor: 'pointer',
  },
  deviceName: {
    fontWeight: 600,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  indicator: {
    display: 'flex',
    gap: theme.spacing(1),
    padding: theme.spacing(0, 2, 1),
    flexShrink: 0,
  },
  indicatorItem: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(0.5),
    padding: theme.spacing(0.5, 0),
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    color: theme.palette.text.secondary,
    backgroundColor: 'transparent',
    border: 'none',
  },
  indicatorItemActive: {
    color: theme.palette.primary.contrastText,
    backgroundColor: theme.palette.primary.main,
  },
  slides: {
    display: 'flex',
    overflowX: 'auto',
    scrollSnapType: 'x mandatory',
    WebkitOverflowScrolling: 'touch',
    touchAction: 'pan-x',
    scrollbarWidth: 'none',
    flex: 1,
    minHeight: 0,
    '&::-webkit-scrollbar': {
      display: 'none',
    },
  },
  slide: {
    flex: '0 0 100%',
    width: '100%',
    minWidth: '100%',
    scrollSnapAlign: 'start',
    boxSizing: 'border-box',
    padding: theme.spacing(0, 2),
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    padding: theme.spacing(0.75, 0),
    color: theme.palette.text.secondary,
  },
  positionIcon: {
    fontSize: 20,
    stroke: 'currentColor',
    strokeWidth: 0.6,
    verticalAlign: 'middle',
  },
  tiles: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
    marginBottom: theme.spacing(1.5),
  },
  tile: {
    minWidth: '30%',
    flex: '1 0 30%',
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
  actions: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: theme.spacing(0.5, 1, 1),
    flexShrink: 0,
    position: 'relative',
    zIndex: 1,
  },
  imagePreview: {
    position: 'relative',
  },
  imagePreviewImg: {
    display: 'block',
    maxWidth: '85vw',
    maxHeight: '80vh',
  },
}));

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);

const STATUS_COLORS = {
  moving: '#27cb46',
  idling: '#00b5e2',
  parked: '#ed2736',
  still: '#ffcc00',
  default: '#9e9e9e',
};

const EVENT_COLORS = {
  alarm: '#d32f2f',
  deviceOverspeed: '#ed6c02',
  ignitionOn: '#2e7d32',
  ignitionOff: '#616161',
  deviceIdle: '#00b5e2',
};
const DEFAULT_EVENT_COLOR = '#9e9e9e';

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

const StatusCardDrawer = ({ deviceId, position, onClose, open = true, disableActions }) => {
  const { classes } = useStyles();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const t = useTranslation();

  const readonly = useRestriction('readonly');
  const deviceReadonly = useDeviceReadonly();

  const shareDisabled = useSelector((state) => state.session.server.attributes.disableShare);
  const user = useSelector((state) => state.session.user);
  const device = useSelector((state) => state.devices.items[deviceId]);

  const deviceImage = device?.attributes?.deviceImage;
  const deviceImageUrl = deviceImage ? `/api/media/${device.uniqueId}/${deviceImage}` : undefined;
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
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);

  const [slide, setSlide] = useState(0);
  const slidesRef = useRef(null);

  const scrollToSlide = (index) => {
    const el = slidesRef.current;
    if (!el) {
      return;
    }
    el.scrollTo({ left: index * el.clientWidth, behavior: 'smooth' });
    setSlide(index);
  };

  const handleSlidesScroll = () => {
    const el = slidesRef.current;
    if (!el || el.clientWidth === 0) {
      return;
    }
    const index = Math.round(el.scrollLeft / el.clientWidth);
    if (index !== slide) {
      setSlide(index);
    }
  };

  const { eventCounts, loading: eventsLoading } = useDeviceEventCounts(deviceId, slide === 1);
  const { stats: dashboardStats, loading: dashboardLoading } = useDeviceDashboardSummary(
    deviceId,
    slide === 2,
    { distanceUnit, speedUnit, volumeUnit, t },
  );

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

  const slideDefs = [
    { icon: <InfoOutlinedIcon fontSize="small" />, label: t('positionStatus') },
    { icon: <NotificationsIcon fontSize="small" />, label: t('reportEvents') },
    { icon: <DashboardIcon fontSize="small" />, label: t('dashboardTitle') },
  ];

  return (
    <>
      {device && (
        <SwipeableDrawer
          anchor="bottom"
          open={open}
          onClose={onClose}
          onOpen={() => {}}
          hideBackdrop
          disableSwipeToOpen
          disableBackdropTransition
          ModalProps={{
            BackdropProps: {
              invisible: true,
              sx: { pointerEvents: 'none' },
            },
            sx: { pointerEvents: 'none' },
          }}
          slotProps={{
            paper: {
              className: classes.drawerPaper,
              sx: { pointerEvents: 'auto' },
            },
          }}
        >
          <div className={classes.statusLine} style={{ backgroundColor: statusColor }} />
          <IconButton className={classes.closeButton} onClick={onClose} size="small">
            <CloseIcon sx={{ fontSize: 14 }} />
          </IconButton>
          <div className={classes.handle} />

          <div className={classes.header}>
            <Avatar
              variant="rounded"
              src={deviceImageUrl}
              sx={{ bgcolor: statusColor }}
              className={deviceImage ? classes.deviceAvatar : undefined}
              onClick={deviceImage ? () => setImagePreviewOpen(true) : undefined}
            >
              {device.name?.[0]?.toUpperCase()}
            </Avatar>
            <Typography variant="subtitle2" className={classes.deviceName} title={device.name}>
              {device.name}
            </Typography>
          </div>

          <div className={classes.indicator}>
            {slideDefs.map((def, index) => (
              <button
                key={def.label}
                type="button"
                className={`${classes.indicatorItem} ${
                  index === slide ? classes.indicatorItemActive : ''
                }`}
                onClick={() => scrollToSlide(index)}
              >
                {def.icon}
                {def.label}
              </button>
            ))}
          </div>

          <div className={classes.slides} ref={slidesRef} onScroll={handleSlidesScroll}>
            <div className={classes.slide}>
              {position ? (
                <>
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
                </>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  {t('sharedNoData')}
                </Typography>
              )}
            </div>

            <div className={classes.slide}>
              {eventsLoading && (
                <div className={classes.statItem}>
                  <CircularProgress size={16} />
                  <Typography variant="body2" color="textSecondary">
                    {t('sharedLoading')}
                  </Typography>
                </div>
              )}
              {!eventsLoading &&
                (eventCounts && Object.keys(eventCounts).length > 0 ? (
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
                ))}
            </div>

            <div className={classes.slide}>
              {dashboardLoading && <DashboardLoading text={t('sharedLoading')} />}
              {!dashboardLoading && dashboardStats && (
                <>
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
                    <Box sx={{ display: 'flex', justifyContent: 'center', maxWidth: '100%' }}>
                      <PieChart
                        width={200}
                        height={170}
                        series={[
                          {
                            data: dashboardStats.motionPieData,
                            innerRadius: 30,
                            arcLabel: (item) => formatNumericHours(item.value, t),
                            arcLabelMinAngle: 25,
                            valueFormatter: (item) => formatNumericHours(item.value, t),
                          },
                        ]}
                        slotProps={{ legend: { direction: 'horizontal' } }}
                        sx={{
                          '& .MuiPieArcLabel-root': {
                            fill: '#fff',
                            fontSize: 10,
                          },
                        }}
                      />
                    </Box>
                  )}
                </>
              )}
              {!dashboardLoading && !dashboardStats && (
                <Typography variant="body2" color="textSecondary">
                  {t('sharedNoData')}
                </Typography>
              )}
            </div>
          </div>

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
                color="primary"
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
        </SwipeableDrawer>
      )}

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
      {deviceImage && (
        <Dialog open={imagePreviewOpen} onClose={() => setImagePreviewOpen(false)} maxWidth={false}>
          <div className={classes.imagePreview}>
            <IconButton
              size="small"
              onClick={() => setImagePreviewOpen(false)}
              className={classes.closeButton}
            >
              <CloseIcon sx={{ fontSize: 14 }} />
            </IconButton>
            <img src={deviceImageUrl} alt={device?.name} className={classes.imagePreviewImg} />
          </div>
        </Dialog>
      )}
    </>
  );
};

export default StatusCardDrawer;
