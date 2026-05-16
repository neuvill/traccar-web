import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Paper, Menu, MenuItem, Typography, Badge, Box, Button
} from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import DescriptionIcon from '@mui/icons-material/Description';
import SettingsIcon from '@mui/icons-material/Settings';
import PersonIcon from '@mui/icons-material/Person';
import DirectionsCarFilledIcon from '@mui/icons-material/DirectionsCarFilled';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import { useTheme } from '@mui/material/styles';
import { sessionActions } from '../../store';
import { useTranslation } from './LocalizationProvider';
import { useRestriction } from '../util/permissions';
import { nativePostMessage } from './NativeInterface';

const BottomMenu = ({ setDeviceSheetOpen }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useDispatch();
    const t = useTranslation();
    const theme = useTheme();
    const desktop = useMediaQuery(theme.breakpoints.up('md'));

    const readonly = useRestriction('readonly');
    const disableReports = useRestriction('disableReports');
    const user = useSelector((state) => state.session.user);
    const socket = useSelector((state) => state.session.socket);

    const [anchorEl, setAnchorEl] = useState(null);

    const currentSelection = () => {
        if (location.pathname === `/settings/user/${user.id}`) {
            return 'account';
        } if (location.pathname.startsWith('/settings')) {
            return 'settings';
        } if (location.pathname.startsWith('/reports')) {
            return 'reports';
        } if (location.pathname === '/') {
            return 'map';
        }
        return null;
    };

    const handleAccount = () => {
        setAnchorEl(null);
        navigate(`/settings/user/${user.id}`);
    };

    const handleLogout = async () => {
        setAnchorEl(null);

        const notificationToken = window.localStorage.getItem('notificationToken');
        if (notificationToken && !user.readonly) {
            window.localStorage.removeItem('notificationToken');
            const tokens = user.attributes.notificationTokens?.split(',') || [];
            if (tokens.includes(notificationToken)) {
                const updatedUser = {
                    ...user,
                    attributes: {
                        ...user.attributes,
                        notificationTokens: tokens.length > 1 ? tokens.filter((it) => it !== notificationToken).join(',') : undefined,
                    },
                };
                await fetch(`/api/users/${user.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedUser),
                });
            }
        }

        await fetch('/api/session', { method: 'DELETE' });
        nativePostMessage('logout');
        navigate('/login');
        dispatch(sessionActions.updateUser(null));
    };

    const handleSelection = (event, value) => {
        switch (value) {
            case 'map':
                navigate('/');
                break;
            case 'reports':
                navigate('/reports/combined');
                break;
            case 'settings':
                navigate('/settings/preferences');
                break;
            case 'account':
                setAnchorEl(event.currentTarget);
                break;
            case 'logout':
                handleLogout();
                break;
            default:
                break;
        }
    };

    return (

        <Box
            sx={{
                position: 'absolute', // or 'fixed' if you want it to stay during scroll
                bottom: 16,
                left: 0,
                right: 0,
                minHeight: 96,
                pointerEvents: 'none', // allows clicks to pass through where needed
                zIndex: 1000,
            }}
        >
            <Box
                sx={{
                    position: 'relative',
                    width: '100%',
                    minHeight: 96,
                    pointerEvents: 'auto',
                }}
            >
                {/* Left Side Buttons */}
                <Box
                    sx={{
                        position: 'absolute',
                        left: 16,
                        bottom: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                        pointerEvents: 'auto',
                    }}
                >
                    <Button
                        variant="contained"
                        startIcon={<SettingsIcon />}
                        onClick={() => navigate('/settings/preferences')}
                        pointerEvents='auto'
                        sx={{
                            borderRadius: 3,
                            boxShadow: 3,
                            backgroundColor: 'white', // or use 'rgba(255,255,255,0.8)' for semi-transparency
                            color: 'black',
                            paddingRight: 1,
                            '&:hover': {
                                backgroundColor: '#f0f0f0', // Hover background color
                            },
                            '& .MuiButton-startIcon': {
                                '& svg': {
                                    fontSize: '1.8rem', // Adjust the size of the icon
                                },
                            },
                        }}
                    >

                    </Button>
                    {!disableReports && (
                        <Button
                            variant="contained"
                            startIcon={<DescriptionIcon />}
                            onClick={() => navigate('/reports/combined')}
                            sx={{
                                borderRadius: 3,
                                boxShadow: 3,
                                backgroundColor: 'white', // or use 'rgba(255,255,255,0.8)' for semi-transparency
                                color: 'black',
                                paddingRight: 1,
                                '&:hover': {
                                    backgroundColor: '#f0f0f0', // Hover background color
                                },
                                '& .MuiButton-startIcon': {
                                    '& svg': {
                                        fontSize: '1.8rem', // Adjust the size of the icon
                                    },
                                },

                            }}
                        >

                        </Button>
                    )}
                </Box>

                {/* Right Side Buttons */}
                <Box
                    sx={{
                        position: 'absolute',
                        right: 16,
                        bottom: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                        pointerEvents: 'auto',
                    }}
                >

                    <Button
                        variant="contained"
                        startIcon={
                            <DirectionsCarFilledIcon />
                        }
                        onClick={() => setDeviceSheetOpen(true)}
                        sx={{
                            borderRadius: 3,
                            boxShadow: 3,
                            backgroundColor: 'white', // or use 'rgba(255,255,255,0.8)' for semi-transparency
                            color: 'black',
                            paddingRight: 1,
                            '&:hover': {
                                backgroundColor: '#f0f0f0', // Hover background color
                            },
                            '& .MuiButton-startIcon': {
                                '& svg': {
                                    fontSize: '1.8rem', // Adjust the size of the icon
                                },
                            },
                        }}
                    >

                    </Button>
                    {readonly ? (
                        <Button
                            variant="contained"
                            startIcon={<ExitToAppIcon />}
                            onClick={handleLogout}
                            sx={{
                                borderRadius: 3,
                                boxShadow: 3,
                                backgroundColor: 'white', // or use 'rgba(255,255,255,0.8)' for semi-transparency
                                color: 'black',
                                paddingRight: 1,

                            }}
                        >

                        </Button>
                    ) : (
                        <Button
                            variant="contained"
                            startIcon={<PersonIcon />}
                            onClick={(e) => setAnchorEl(e.currentTarget)}
                            sx={{
                                borderRadius: 3,
                                boxShadow: 3,
                                backgroundColor: 'white', // or use 'rgba(255,255,255,0.8)' for semi-transparency
                                color: 'black',
                                paddingRight: 1,
                                '&:hover': {
                                    backgroundColor: '#f0f0f0', // Hover background color
                                },
                                '& .MuiButton-startIcon': {
                                    '& svg': {
                                        fontSize: '1.8rem', // Adjust the size of the icon
                                    },
                                },
                            }}
                        >

                        </Button>
                    )}
                </Box>
            </Box>

            {/* Dropdown Menu (Account/Logout) */}
            <Box mt={1} pointerEvents="auto">
                <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
                    <MenuItem onClick={handleAccount}>
                        <Typography color="textPrimary">{t('settingsUser')}</Typography>
                    </MenuItem>
                    <MenuItem onClick={handleLogout}>
                        <Typography color="error">{t('loginLogout')}</Typography>
                    </MenuItem>
                </Menu>
            </Box>
        </Box>
    );


};

export default BottomMenu;
