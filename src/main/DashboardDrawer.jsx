import {
    Drawer,
    Toolbar,
    Typography,
    Tabs,
    Tab,
    Box,
    Divider,
    List,
    ListItemButton,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useEffect, useState, useMemo } from 'react';
import { formatDistance } from '../common/util/formatter';
import DashboardLoading from '../common/components/DashboardLoading';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { PieChart } from '@mui/x-charts/PieChart';

const useStyles = makeStyles()((theme) => ({
    drawer: {
        width: theme.dimensions.eventsDrawerWidth,
    },
    toolbar: {
        paddingLeft: theme.spacing(2),
        paddingRight: theme.spacing(2),
    },
    title: {
        flexGrow: 1,
    },
}));

const DashboardDrawer = ({ open, onClose }) => {
    const { classes } = useStyles();
    const t = useTranslation();
    const navigate = useNavigate();
    const positions = useSelector((state) => state.session.positions);
    const devices = useSelector((state) => Object.values(state.devices.items));
    const [summary, setSummary] = useState([]);
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState(0);

    const deviceStats = useMemo(() => {
        let online = 0;
        let offline = 0;

        devices.forEach((device) => {
            if (device.status === 'online') {
                online += 1;
            } else {
                offline += 1;
            }
        });

        return { online, offline };
    }, [devices]);

    const motionStats = useMemo(() => {
        let parked = 0;
        let moving = 0;
        let idling = 0;

        Object.values(positions).forEach((pos) => {
            const status = pos?.attributes?.motionStatus;

            if (status === 'parked') parked += 1;
            else if (status === 'moving') moving += 1;
            else if (status === 'idling') idling += 1;
        });

        return { parked, moving, idling };
    }, [positions]);


    useEffect(() => {
        if (!open || tab !== 1) return;

        setLoading(true);

        const now = new Date();
        const midnight = new Date(now.setHours(0, 0, 0, 0));
        const from = midnight.toISOString();
        const to = new Date().toISOString();
        console.log(devices);
        console.log(positions);

        const fetchSummary = async () => {
            try {
                const groupResponse = await fetch('/api/groups/');
                if (!groupResponse.ok) throw new Error('Failed to fetch groups');

                const groups = await groupResponse.json();
                const groupId = groups[0]?.id;

                const queryParams = new URLSearchParams({ from, to, groupId }).toString();

                const response = await fetch(`/api/reports/summary?${queryParams}`, {
                    headers: { Accept: 'application/json' },
                });

                const data = await response.json();

                const sorted = data.sort((a, b) =>
                    a.deviceName.localeCompare(b.deviceName)
                );

                setSummary(sorted);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchSummary();
    }, [open, tab]);

    return (
        <Drawer anchor="right" open={open} onClose={onClose}>
            <Toolbar className={classes.toolbar} disableGutters>
                <Typography variant="h6" className={classes.title}>
                    DASHBOARD
                </Typography>
            </Toolbar>

            <Tabs
                value={tab}
                onChange={(_, value) => setTab(value)}
                variant="fullWidth"
            >
                <Tab label="STATUS" />
                <Tab label="SUMMARY" />
            </Tabs>

            <Divider />

            <Box className={classes.drawer}>
                {/* TAB 1 – Empty */}
                {tab === 0 && (
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4,
                            p: 2,
                            alignItems: 'center',
                        }}
                    >
                        {/* Devices Status */}
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="subtitle1" gutterBottom>
                                Devices Status
                            </Typography>

                            <Box sx={{ width: '100%', maxWidth: 230, mx: 'auto' }}>
                                <PieChart
                                    width={200}
                                    height={200}
                                    series={[
                                        {
                                            data: [
                                                { id: 0, value: deviceStats.online, label: 'Online', color: '#27cb46' },
                                                { id: 1, value: deviceStats.offline, label: 'Offline', color: '#ed2736' },
                                            ],
                                        },
                                    ]}
                                />

                            </Box>
                        </Box>

                        <Divider flexItem />

                        {/* Motion Status */}
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="subtitle1" gutterBottom>
                                Motion Status
                            </Typography>

                            <Box sx={{ width: '100%', maxWidth: 230, mx: 'auto' }}>
                                <PieChart
                                    width={200}
                                    height={200}
                                    series={[
                                        {
                                            data: [
                                                { id: 0, value: motionStats.moving, label: 'Moving', color: '#27cb46' },
                                                { id: 1, value: motionStats.idling, label: 'Idling', color: '#00b5e2' },
                                                { id: 2, value: motionStats.parked, label: 'Parked', color: '#ed2736' },
                                            ],
                                        },
                                    ]}
                                />
                            </Box>
                        </Box>
                    </Box>


                )}

                {/* TAB 2 – Summary */}
                {tab === 1 && (
                    loading ? (
                        <DashboardLoading />
                    ) : (
                        <List dense>
                            {summary.map((item) => (
                                <div key={item.deviceId}>
                                    <ListItemButton
                                        onClick={() =>
                                            navigate(`/qreplay?deviceId=${item.deviceId}`)
                                        }
                                    >
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                width: '100%',
                                                alignItems: 'center',
                                                py: 1,
                                            }}
                                        >
                                            <Typography variant="body2" fontWeight={500}>
                                                {item.deviceName}
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                            >
                                                {formatDistance(item.distance, 'km', t)}
                                            </Typography>
                                        </Box>
                                    </ListItemButton>
                                    <Divider />
                                </div>
                            ))}
                        </List>
                    )
                )}
            </Box>
        </Drawer>
    );
};

export default DashboardDrawer;
