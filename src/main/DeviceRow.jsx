import { useDispatch, useSelector } from 'react-redux';
import { makeStyles } from 'tss-react/mui';
import {
  IconButton, Tooltip, Avatar, ListItemAvatar, ListItemText, ListItemButton,
  Typography,
} from '@mui/material';
import BatteryFullIcon from '@mui/icons-material/BatteryFull';
import BatteryChargingFullIcon from '@mui/icons-material/BatteryChargingFull';
import Battery60Icon from '@mui/icons-material/Battery60';
import BatteryCharging60Icon from '@mui/icons-material/BatteryCharging60';
import Battery20Icon from '@mui/icons-material/Battery20';
import BatteryCharging20Icon from '@mui/icons-material/BatteryCharging20';
import ErrorIcon from '@mui/icons-material/Error';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { devicesActions } from '../store';
import {
  formatAlarm, formatBoolean, formatPercentage, formatStatus, getStatusColor, formatNumericHours,
  formatSpeed
} from '../common/util/formatter';
import { useTranslation } from '../common/components/LocalizationProvider';
import { mapIconKey, mapIcons } from '../map/core/preloadImages';
import { useAdministrator } from '../common/util/permissions';
import EngineIcon from '../resources/images/data/engine.svg?react';
import { useAttributePreference } from '../common/util/preferences';
import { grey } from '@mui/material/colors';

dayjs.extend(relativeTime);

const useStyles = makeStyles()((theme) => ({
  icon: {
    width: '25px',
    height: '25px',
    //filter: 'brightness(0) invert(1)',
  },
  batteryText: {
    fontSize: '0.75rem',
    fontWeight: 'normal',
    lineHeight: '0.875rem',
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

const DeviceRow = ({ devices, index, style }) => {
  const { classes } = useStyles();
  const dispatch = useDispatch();
  const t = useTranslation();

  const admin = useAdministrator();
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);

  const item = devices[index];
  const position = useSelector((state) => state.session.positions[item.id]);

  const devicePrimary = useAttributePreference('devicePrimary', 'name');
  //const deviceSecondary = useAttributePreference('deviceSecondary', '');
  const dynamicStatus = (position && position.attributes.motionStatus) ? position.attributes.motionStatus : 'default';
  //const dynamicStatus = item.motionStatus ? item.motionStatus : 'default';
  /*let dynamicStatus = item.category; //creating a variable for dynamic Status
  if (item.category === 'dynamic') {
    dynamicStatus = position ? position.attributes.dynamicStatus : 'default';
  }*/
  //console.log(position);

  const secondaryText = () => {
    let status;
    let isSpeed = false;
    if (item.status === 'online' || !item.lastUpdate) {
      if (position && position.attributes.motionStatus === 'moving') {
        status = formatSpeed(position.speed, 'kmh', t);
        isSpeed = true;
      } else {
        status = formatStatus(item.status, t);
      }
    } else {
      status = formatStatus(item.status, t);
    }
    return (
      <>
        {(position && position.address) ? position.address.slice(0, 35) : ''}
        <br />
        <span
          className={classes[getStatusColor(item.status)]}
          style={isSpeed ? { color: '#1976d2', fontWeight: 500 } : {}}
        >
          {status}
        </span>
      </>
    );
  };
  //console.log(position ? position.attributes : 'No position data');

  function getTimeDiff(startIso, endIso) {
    const start = new Date(startIso);
    const end = new Date(endIso);

    return (end - start >= 0) ? formatNumericHours(end - start, t) : formatNumericHours(0, t);

  }
  //console.log(position);

  return (
    <div style={style}>
      <ListItemButton
        key={item.id}
        onClick={() => dispatch(devicesActions.selectId(item.id))}
        disabled={!admin && item.disabled}
        selected={selectedDeviceId === item.id}
        className={selectedDeviceId === item.id ? classes.selected : null}
      >
        <ListItemAvatar>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>



            <Avatar style={{ backgroundColor: grey[200], borderColor: grey[400], borderWidth: 2, borderStyle: 'solid' }}>
              {/*displaying dynamic icon*/}
              <img className={classes.icon} src={mapIcons[mapIconKey(dynamicStatus)]} alt="" />

            </Avatar>
            <Typography
              variant="caption"
              style={{
                marginTop: 5,
                color: grey[500],
                fontWeight: 'bold',
              }}
            >
              {
                position && position.attributes.motionStatusChanged ? getTimeDiff(position.attributes.motionStatusChanged, position.deviceTime) : '-'
              }
            </Typography>
          </div>
        </ListItemAvatar>
        <ListItemText
          primary={item[devicePrimary]}
          secondary={secondaryText()}
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
            {position.attributes.hasOwnProperty('alarm') && (
              <Tooltip title={`${t('eventAlarm')}: ${formatAlarm(position.attributes.alarm, t)}`}>
                <IconButton size="small">
                  <ErrorIcon fontSize="small" className={classes.error} />
                </IconButton>
              </Tooltip>
            )}
            {position.attributes.hasOwnProperty('ignition') && (
              <Tooltip title={`${t('positionIgnition')}: ${formatBoolean(position.attributes.ignition, t)}`}>
                <IconButton size="small">
                  {position.attributes.ignition ? (
                    <EngineIcon width={20} height={20} className={classes.success} />
                  ) : (
                    <EngineIcon width={20} height={20} className={classes.neutral} />
                  )}
                </IconButton>
              </Tooltip>
            )}
            {position.attributes.hasOwnProperty('batteryLevel') && (
              <Tooltip title={`${t('positionBatteryLevel')}: ${formatPercentage(position.attributes.batteryLevel)}`}>
                <IconButton size="small">
                  {(position.attributes.batteryLevel > 70 && (
                    position.attributes.charge
                      ? (<BatteryChargingFullIcon fontSize="small" className={classes.success} />)
                      : (<BatteryFullIcon fontSize="small" className={classes.success} />)
                  )) || (position.attributes.batteryLevel > 30 && (
                    position.attributes.charge
                      ? (<BatteryCharging60Icon fontSize="small" className={classes.warning} />)
                      : (<Battery60Icon fontSize="small" className={classes.warning} />)
                  )) || (
                      position.attributes.charge
                        ? (<BatteryCharging20Icon fontSize="small" className={classes.error} />)
                        : (<Battery20Icon fontSize="small" className={classes.error} />)
                    )}
                </IconButton>
              </Tooltip>
            )}
          </>
        )}
      </ListItemButton>
    </div>
  );
};

export default DeviceRow;
