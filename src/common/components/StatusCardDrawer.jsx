import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link as RouterLink } from 'react-router-dom';

import {
  Typography,
  CardActions,
  IconButton,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Menu,
  MenuItem,
  TableFooter,
  Link,
  Tooltip,
  SwipeableDrawer,
  Box,
  CardMedia,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import PublishIcon from '@mui/icons-material/Publish';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import PendingIcon from '@mui/icons-material/Pending';
import HistoryIcon from '@mui/icons-material/History';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import RouteIcon from '@mui/icons-material/Route';
import SpeedIcon from '@mui/icons-material/Speed';
import { useTranslation } from './LocalizationProvider';
import RemoveDialog from './RemoveDialog';
import PositionValue from './PositionValue';
import { useDeviceReadonly, useRestriction } from '../util/permissions';
import usePositionAttributes from '../attributes/usePositionAttributes';
import { devicesActions } from '../../store';
import { useCatch, useCatchCallback } from '../../reactHelper';
import { getDeviceMotionStatus } from '../util/deviceStatus';
import { useAttributePreference } from '../util/preferences';
import fetchOrThrow from '../util/fetchOrThrow';

const useStyles = makeStyles()((theme) => ({
  content: {
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
    maxHeight: theme.dimensions.cardContentMaxHeight,
    overflow: 'auto',
  },
  drawerPaper: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: theme.spacing(2),
    minHeight: '30vh',
    maxHeight: '80vh',
    overflowY: 'auto',
  },
  statusLine: {
    height: 4,
    margin: theme.spacing(-2, -2, 1.5),
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  table: {
    '& .MuiTableCell-sizeSmall': {
      paddingLeft: 0,
      paddingRight: 0,
    },
  },
  cell: {
    borderBottom: 'none',
  },
  iconCell: {
    width: theme.spacing(4),
    textAlign: 'center',
    color: theme.palette.text.secondary,
  },
  positionIcon: {
    fontSize: 20,
    stroke: 'currentColor',
    strokeWidth: 0.6,
    verticalAlign: 'middle',
  },
  actions: {
    justifyContent: 'space-between',
  },
  media: {
    height: theme.dimensions.popupImageHeight,
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
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

const StatusRow = ({ name, icon, content }) => {
  const { classes } = useStyles();

  return (
    <TableRow>
      <TableCell className={`${classes.cell} ${icon ? classes.iconCell : ''}`}>
        {icon || <Typography variant="body2">{name}</Typography>}
      </TableCell>
      <TableCell className={classes.cell}>
        <Typography variant="body2" color="textSecondary">
          {content}
        </Typography>
      </TableCell>
    </TableRow>
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
  const statusColor = getDeviceStatusColor(device, position);

  const positionAttributes = usePositionAttributes(t);
  const positionItems = useAttributePreference(
    'positionItems',
    'fixTime,address,speed,totalDistance',
  );

  const navigationAppLink = useAttributePreference('navigationAppLink');
  const navigationAppTitle = useAttributePreference('navigationAppTitle');

  const [anchorEl, setAnchorEl] = useState(null);

  const [removing, setRemoving] = useState(false);

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
              sx: {
                pointerEvents: 'none',
              },
            },
            sx: {
              pointerEvents: 'none',
            },
          }}
          slotProps={{
            paper: {
              className: classes.drawerPaper,
              sx: {
                pointerEvents: 'auto',
              },
            },
          }}
        >
          <div className={classes.statusLine} style={{ backgroundColor: statusColor }} />
          <IconButton className={classes.closeButton} onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
          {deviceImage ? (
            <CardMedia
              className={classes.media}
              image={`/api/media/${device.uniqueId}/${deviceImage}`}
            >
              <div
                style={{
                  width: 40,
                  height: 5,
                  backgroundColor: '#ccc',
                  borderRadius: 3,
                  margin: '5px auto',
                }}
              />
            </CardMedia>
          ) : (
            <div
              style={{
                width: 40,
                height: 5,
                backgroundColor: '#ccc',
                borderRadius: 3,
                margin: '5px auto',
              }}
            />
          )}
          <Box>
            <Box>
              <Typography
                sx={{ color: '#2b4e75', fontWeight: 'bold' }}
                variant="body2"
                color="textSecondary"
              >
                {device.name}
              </Typography>
            </Box>

            {position && (
              <Box className={classes.content}>
                <Table size="small" classes={{ root: classes.table }}>
                  <TableBody>
                    {positionItems
                      .split(',')
                      .filter((key) => hasOwn(position, key) || hasOwn(position.attributes, key))
                      .map((key) => {
                        const name = positionAttributes[key]?.name || key;
                        return (
                          <StatusRow
                            key={key}
                            name={name}
                            icon={getPositionIcon(key, name, classes)}
                            content={
                              <PositionValue
                                position={position}
                                property={hasOwn(position, key) ? key : null}
                                attribute={hasOwn(position, key) ? null : key}
                              />
                            }
                          />
                        );
                      })}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={2} className={classes.cell}>
                        <Typography variant="body2">
                          <Link component={RouterLink} to={`/position/${position.id}`}>
                            {t('sharedShowDetails')}
                          </Link>
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </Box>
            )}
            <CardActions classes={{ root: classes.actions }} disableSpacing>
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
            </CardActions>
          </Box>
        </SwipeableDrawer>
      )}

      {position && (
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
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

export default StatusCardDrawer;
