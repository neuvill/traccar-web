import { memo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { makeStyles } from 'tss-react/mui';
import {
  Avatar,
  Badge,
  IconButton,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Tooltip,
  Typography,
} from '@mui/material';
import { grey } from '@mui/material/colors';
import Battery20Icon from '@mui/icons-material/Battery20';
import Battery60Icon from '@mui/icons-material/Battery60';
import BatteryCharging20Icon from '@mui/icons-material/BatteryCharging20';
import BatteryCharging60Icon from '@mui/icons-material/BatteryCharging60';
import BatteryChargingFullIcon from '@mui/icons-material/BatteryChargingFull';
import BatteryFullIcon from '@mui/icons-material/BatteryFull';
import ErrorIcon from '@mui/icons-material/Error';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import SpeedIcon from '@mui/icons-material/Speed';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useTranslation } from '../common/components/LocalizationProvider';
import DriverValue from '../common/components/DriverValue';
import GeofencesValue from '../common/components/GeofencesValue';
import {
  formatAlarm,
  formatBoolean,
  formatMotionStatusDuration,
  formatPercentage,
  formatSpeed,
  formatStatus,
  getStatusColor,
} from '../common/util/formatter';
import { getDeviceFreshness, getDeviceMotionStatus } from '../common/util/deviceStatus';
import { useAdministrator } from '../common/util/permissions';
import { useAttributePreference } from '../common/util/preferences';
import { mapIconKey, mapIcons } from '../map/core/preloadImages';
import EngineIcon from '../resources/images/data/engine.svg?react';
import { devicesActions } from '../store';
import MotionBar from './components/MotionBar';

dayjs.extend(relativeTime);

const STATUS_COLORS = {
  moving: '#27cb46',
  idling: '#00b5e2',
  parked: '#ed2736',
  still: '#ffcc00',
  default: '#9e9e9e',
};

const hasAttribute = (attributes, key) => Object.prototype.hasOwnProperty.call(attributes, key);

const getBatteryIcon = (batteryLevel, charge, classes) => {
  if (batteryLevel > 70) {
    return charge ? (
      <BatteryChargingFullIcon fontSize="small" className={classes.success} />
    ) : (
      <BatteryFullIcon fontSize="small" className={classes.success} />
    );
  }

  if (batteryLevel > 30) {
    return charge ? (
      <BatteryCharging60Icon fontSize="small" className={classes.warning} />
    ) : (
      <Battery60Icon fontSize="small" className={classes.warning} />
    );
  }

  return charge ? (
    <BatteryCharging20Icon fontSize="small" className={classes.error} />
  ) : (
    <Battery20Icon fontSize="small" className={classes.error} />
  );
};

const useStyles = makeStyles()((theme) => ({
  icon: {
    width: '25px',
    height: '25px',
  },
  success: {
    color: theme.palette.success.main,
  },
  warning: {
    color: theme.palette.warning.main,
  },
  error: {
    color: theme.palette.error.main,
  },
  neutral: {
    color: theme.palette.neutral.main,
  },
  selected: {
    backgroundColor: theme.palette.action.selected,
  },
}));

const DeviceRow = ({ item, position, setDeviceSheetOpen, now, style }) => {
  const { classes } = useStyles();
  const dispatch = useDispatch();
  const t = useTranslation();

  const admin = useAdministrator();
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);
  const devicePrimary = useAttributePreference('devicePrimary', 'name');
  const deviceSecondary = useAttributePreference('deviceSecondary', '');
  const speedUnit = useAttributePreference('speedUnit');

  const attributes = position?.attributes || {};
  const { alarm, batteryLevel, charge, driverUniqueId, ignition } = attributes;

  const { isStale, staleReferenceTime } = getDeviceFreshness(item, position, now);
  const dynamicStatus = getDeviceMotionStatus(item, position, now);
  const motionStatus = dynamicStatus === 'still' ? null : attributes.motionStatus;
  const badgeColor = STATUS_COLORS[dynamicStatus] || STATUS_COLORS.default;
  const iconKey = mapIconKey(item.category);

  const resolveFieldValue = (field) => {
    if (!field) {
      return null;
    }

    if (field === 'geofenceIds') {
      const geofenceIds = position?.geofenceIds;
      return geofenceIds?.length ? <GeofencesValue geofenceIds={geofenceIds} /> : null;
    }

    if (field === 'driverUniqueId') {
      return driverUniqueId ? <DriverValue driverUniqueId={driverUniqueId} /> : null;
    }

    if (field === 'motion') {
      return <MotionBar deviceId={item.id} />;
    }

    return item[field];
  };

  const getStatusText = () => {
    if (isStale && staleReferenceTime) {
      return staleReferenceTime.from(dayjs(now), true);
    }

    if (item.status === 'online' || !item.lastUpdate) {
      if (motionStatus === 'moving') {
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <SpeedIcon sx={{ fontSize: 16 }} />
            {formatSpeed(position.speed, speedUnit, t)}
          </span>
        );
      }

      return formatStatus(item.status, t);
    }

    return dayjs(item.lastUpdate).from(dayjs(now), true);
  };

  const primaryValue = resolveFieldValue(devicePrimary);
  const secondaryValue = resolveFieldValue(deviceSecondary);
  const hasSecondaryValue =
    secondaryValue !== null && secondaryValue !== undefined && secondaryValue !== '';

  const isSpeed = !isStale && motionStatus === 'moving';
  const defaultSecondary = (
    <>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <LocationOnOutlinedIcon sx={{ fontSize: 16 }} />
        {position?.address ? position.address.slice(0, 35) : ''}
      </span>
      <br />
      <span
        className={isStale ? classes.neutral : classes[getStatusColor(item.status)]}
        style={isSpeed ? { color: '#1976d2', fontWeight: 500 } : {}}
      >
        {getStatusText()}
      </span>
    </>
  );

  const handleClick = () => {
    if (setDeviceSheetOpen) {
      setDeviceSheetOpen(false);
    }
    dispatch(devicesActions.selectId(item.id));
  };

  return (
    <div
      style={{
        ...style,
        position: style?.position || 'relative',
        borderBottom: '1px solid #e0e0e0',
      }}
    >
      <span
        style={{
          position: 'absolute',
          insetInlineStart: 0,
          top: 0,
          bottom: 0,
          width: 4,
          backgroundColor: badgeColor,
          pointerEvents: 'none',
        }}
      />
      <ListItemButton
        onClick={handleClick}
        disabled={!admin && item.disabled}
        selected={selectedDeviceId === item.id}
        className={selectedDeviceId === item.id ? classes.selected : null}
      >
        <ListItemAvatar>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Badge
              overlap="circular"
              anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
              variant="dot"
              sx={{
                '& .MuiBadge-badge': {
                  backgroundColor: badgeColor,
                  color: badgeColor,
                  width: 13,
                  height: 13,
                  borderRadius: '50%',
                  border: '2px solid white',
                },
              }}
            >
              <Avatar
                style={{
                  backgroundColor: grey[50],
                  borderColor: grey[600],
                  borderWidth: 2,
                  borderStyle: 'solid',
                  borderRadius: 16,
                }}
              >
                <img className={classes.icon} src={mapIcons[iconKey]} alt="" />
              </Avatar>
            </Badge>

            <Typography
              variant="caption"
              style={{
                marginTop: 5,
                color: grey[500],
                fontWeight: 'bold',
              }}
            >
              {formatMotionStatusDuration(item, position, now, t)}
            </Typography>
          </div>
        </ListItemAvatar>
        <ListItemText
          primary={primaryValue}
          secondary={hasSecondaryValue ? secondaryValue : defaultSecondary}
          slots={{
            primary: Typography,
            secondary: Typography,
          }}
          slotProps={{
            primary: { noWrap: true, style: { fontWeight: 500 } },
            secondary: { noWrap: true },
          }}
          style={{
            marginLeft: '5%',
          }}
        />
        {position && (
          <>
            {hasAttribute(attributes, 'alarm') && (
              <Tooltip title={`${t('eventAlarm')}: ${formatAlarm(alarm, t)}`}>
                <IconButton size="small">
                  <ErrorIcon fontSize="small" className={classes.error} />
                </IconButton>
              </Tooltip>
            )}
            {hasAttribute(attributes, 'ignition') && (
              <Tooltip title={`${t('positionIgnition')}: ${formatBoolean(ignition, t)}`}>
                <IconButton size="small">
                  {ignition ? (
                    <EngineIcon width={20} height={20} className={classes.success} />
                  ) : (
                    <EngineIcon width={20} height={20} className={classes.neutral} />
                  )}
                </IconButton>
              </Tooltip>
            )}
            {hasAttribute(attributes, 'batteryLevel') && (
              <Tooltip title={`${t('positionBatteryLevel')}: ${formatPercentage(batteryLevel)}`}>
                <IconButton size="small">
                  {getBatteryIcon(batteryLevel, charge, classes)}
                </IconButton>
              </Tooltip>
            )}
          </>
        )}
      </ListItemButton>
    </div>
  );
};

export default memo(DeviceRow);
