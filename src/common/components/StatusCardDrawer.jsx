import React, { useState } from 'react';
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
//import CloseIcon from '@mui/icons-material/Close';
import ReplayIcon from '@mui/icons-material/Replay';
import PublishIcon from '@mui/icons-material/Publish';
import EditIcon from '@mui/icons-material/Edit';
//import DeleteIcon from '@mui/icons-material/Delete';
import PendingIcon from '@mui/icons-material/Pending';
import HistoryIcon from '@mui/icons-material/History';
import { useTranslation } from './LocalizationProvider';
import RemoveDialog from './RemoveDialog';
import PositionValue from './PositionValue';
import { useDeviceReadonly } from '../util/permissions';
import usePositionAttributes from '../attributes/usePositionAttributes';
import { devicesActions } from '../../store';
import { useCatch, useCatchCallback } from '../../reactHelper';
import { useAttributePreference } from '../util/preferences';
import { useTheme } from '@mui/material/styles';

//const theme = useTheme();

const useStyles = makeStyles()((theme, { desktopPadding }) => ({


    mediaButton: {
        color: theme.palette.primary.contrastText,
        mixBlendMode: 'difference',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing(2),
    },
    content: {
        paddingTop: theme.spacing(1),
        paddingBottom: theme.spacing(1),
        maxHeight: theme.dimensions.cardContentMaxHeight,
        overflow: 'auto',
    },
    icon: {
        width: '25px',
        height: '25px',
        filter: 'brightness(0) invert(1)',
    },
    drawerPaper: {
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        padding: theme.spacing(2),
        minHeight: '30vh',
        maxHeight: '80vh',
        overflowY: 'auto',
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
    actions: {
        justifyContent: 'space-between',
    },
    media: {
        height: theme.dimensions.popupImageHeight,
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'flex-start',
    },
    /*root: ({ desktopPadding }) => ({
        pointerEvents: 'none',
        position: 'fixed',
        zIndex: 5,
        left: '50%',
        [theme.breakpoints.up('md')]: {
            left: `calc(50% + ${desktopPadding} / 2)`,
            bottom: theme.spacing(3),
        },
        [theme.breakpoints.down('md')]: {
            left: '50%',
            bottom: `calc(${theme.spacing(3)} + ${theme.dimensions.bottomBarHeight}px)`,
        },
        transform: 'translateX(-50%)',
    }),*/
}));

const StatusRow = ({ name, content }) => {
    const { classes } = useStyles({ desktopPadding: 0 });

    return (
        <TableRow>
            <TableCell className={classes.cell}>
                <Typography variant="body2">{name}</Typography>
            </TableCell>
            <TableCell className={classes.cell}>
                <Typography variant="body2" color="textSecondary">{content}</Typography>
            </TableCell>
        </TableRow>
    );
};

const StatusCardDrawer = ({ deviceId, position, onClose, open = true, disableActions, desktopPadding = 0 }) => {
    const { classes } = useStyles({ desktopPadding });
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const t = useTranslation();

    const deviceReadonly = useDeviceReadonly();

    const shareDisabled = useSelector((state) => state.session.server.attributes.disableShare);
    const user = useSelector((state) => state.session.user);
    const device = useSelector((state) => state.devices.items[deviceId]);

    const deviceImage = device?.attributes?.deviceImage;

    const positionAttributes = usePositionAttributes(t);
    const positionItems = useAttributePreference('positionItems', 'fixTime,address,speed,totalDistance');

    const navigationAppLink = useAttributePreference('navigationAppLink');
    const navigationAppTitle = useAttributePreference('navigationAppTitle');

    const [anchorEl, setAnchorEl] = useState(null);

    const [removing, setRemoving] = useState(false);

    const handleRemove = useCatch(async (removed) => {
        if (removed) {
            const response = await fetch('/api/devices');
            if (response.ok) {
                dispatch(devicesActions.refresh(await response.json()));
            } else {
                throw Error(await response.text());
            }
        }
        setRemoving(false);
    });

    const handleGeofence = useCatchCallback(async () => {
        const newItem = {
            name: t('sharedGeofence'),
            area: `CIRCLE (${position.latitude} ${position.longitude}, 50)`,
        };
        const response = await fetch('/api/geofences', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newItem),
        });
        if (response.ok) {
            const item = await response.json();
            const permissionResponse = await fetch('/api/permissions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deviceId: position.deviceId, geofenceId: item.id }),
            });
            if (!permissionResponse.ok) {
                throw Error(await permissionResponse.text());
            }
            navigate(`/settings/geofence/${item.id}`);
        } else {
            throw Error(await response.text());
        }
    }, [navigate, position]);

    return (
        <>

            {device && (
                <SwipeableDrawer
                    //handle={`.${classes.media}, .${classes.header}`}
                    anchor="bottom"
                    open={open}
                    onClose={onClose}
                    onOpen={() => { }}
                    hideBackdrop // ← This disables the blur/dark overlay
                    disableSwipeToOpen
                    disableBackdropTransition
                    ModalProps={{
                        BackdropProps: {
                            invisible: true,
                            sx: {
                                pointerEvents: 'none', // Important
                            },
                        },
                        sx: {
                            pointerEvents: 'none', // Also important for the modal layer
                        },
                    }}
                    slotProps={{
                        paper: {
                            className: classes.drawerPaper,
                            sx: {
                                pointerEvents: 'auto', // Only the drawer itself should handle interaction

                            },
                        },
                    }}
                >
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
                    <Box

                    /*sx={{
                        borderTopLeftRadius: '16px', // Adjust the value for the desired roundness
                        borderTopRightRadius: '16px', // Adjust the value for the desired roundness
                        borderBottomLeftRadius: '16px', // Adjust the value for the desired roundness
                        borderBottomRightRadius: '16px', // Adjust the value for the desired roundness
                        boxShadow: '0px 4px 4px rgba(0, 0, 0, 0.4)',
                    }}*/

                    >

                        <box >
                            <Typography sx={{ color: '#2b4e75', fontWeight: 'bold' }} variant="body2" color="textSecondary">
                                {device.name}
                            </Typography>

                        </box>

                        {position && (
                            <Box className={classes.content}>
                                <Table size="small" classes={{ root: classes.table }}>
                                    <TableBody>
                                        {positionItems.split(',').filter((key) => position.hasOwnProperty(key) || position.attributes.hasOwnProperty(key)).map((key) => (
                                            <StatusRow
                                                key={key}
                                                name={positionAttributes[key]?.name || key}
                                                content={(
                                                    <PositionValue
                                                        position={position}
                                                        property={position.hasOwnProperty(key) ? key : null}
                                                        attribute={position.hasOwnProperty(key) ? null : key}
                                                    />
                                                )}
                                            />
                                        ))}

                                    </TableBody>
                                    <TableFooter>
                                        <TableRow>
                                            <TableCell colSpan={2} className={classes.cell}>
                                                <Typography variant="body2">
                                                    <Link component={RouterLink} to={`/position/${position.id}`}>{t('sharedShowDetails')}</Link>
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
                                    onClick={() => navigate(`/replay?deviceId=${deviceId}`)}
                                    disabled={disableActions || !position}
                                >
                                    <ReplayIcon />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title={t('reportReplay')}>
                                <IconButton color='primary'
                                    onClick={() => navigate(`/qreplay?deviceId=${deviceId}`, { state: { isQuick: true } })}
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
                    <MenuItem onClick={handleGeofence}>{t('sharedCreateGeofence')}</MenuItem>
                    <MenuItem component="a" target="_blank" href={`https://www.google.com/maps/search/?api=1&query=${position.latitude}%2C${position.longitude}`}>{t('linkGoogleMaps')}</MenuItem>
                    <MenuItem component="a" target="_blank" href={`http://maps.apple.com/?ll=${position.latitude},${position.longitude}`}>{t('linkAppleMaps')}</MenuItem>
                    <MenuItem component="a" target="_blank" href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${position.latitude}%2C${position.longitude}&heading=${position.course}`}>{t('linkStreetView')}</MenuItem>
                    {navigationAppTitle && <MenuItem component="a" target="_blank" href={navigationAppLink.replace('{latitude}', position.latitude).replace('{longitude}', position.longitude)}>{navigationAppTitle}</MenuItem>}
                    {!shareDisabled && !user.temporary && (
                        <MenuItem onClick={() => navigate(`/settings/device/${deviceId}/share`)}><Typography color="secondary">{t('deviceShare')}</Typography></MenuItem>
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
