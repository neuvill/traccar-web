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
//import useFilter from './useFilter';

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

const DashboardDrawer = ({ open, onClose, onMotionFilter, onStatusFilter, onShowDevices }) => {
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
        let unknown = 0;

        devices.forEach((device) => {
            if (device.status === 'online') {
                online += 1;
            } else if (device.status === 'offline') {
                offline += 1;
            } else {
                unknown += 1;
            }
        });

        return { online, offline, unknown };
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



    const motionPieData = useMemo(() => ([
        { id: 'moving', label: t('motionStatusMoving'), value: motionStats.moving, color: '#27cb46' },
        { id: 'idling', label: t('motionStatusIdle'), value: motionStats.idling, color: '#00b5e2' },
        { id: 'parked', label: t('motionStatusParked'), value: motionStats.parked, color: '#ed2736' },
    ]), [motionStats]);


    const statusPieData = useMemo(() => ([
        { id: 'online', label: t('deviceStatusOnline'), value: deviceStats.online, color: '#27cb46' },
        { id: 'offline', label: t('deviceStatusOffline'), value: deviceStats.offline, color: '#ed2736' },
        { id: 'unknown', label: t('deviceStatusUnknown'), value: devices.length - deviceStats.online - deviceStats.offline, color: '#808080' },
    ]), [deviceStats]);

    const handleMotionClick = (_, item) => {
        const motionStatus = motionPieData[item.dataIndex]?.id;
        if (!motionStatus) return;

        onMotionFilter(motionStatus);
        onShowDevices(); // 👈 NEW
    };

    const handleStatusClick = (_, item) => {
        const status = statusPieData[item.dataIndex]?.id;
        if (!status) return;

        onStatusFilter(status);
        onShowDevices(); // 👈 NEW
    };



    useEffect(() => {
        if (!open || tab !== 1) return;

        setLoading(true);

        const now = new Date();
        const midnight = new Date(now.setHours(0, 0, 0, 0));
        const from = midnight.toISOString();
        const to = new Date().toISOString();
        //console.log(devices);
        //console.log(positions);

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
                    {t('dashboardTitle')}
                </Typography>
            </Toolbar>

            <Tabs
                value={tab}
                onChange={(_, value) => setTab(value)}
                variant="fullWidth"
            >
                <Tab label={t('deviceStatus')} />
                <Tab label={t('reportSummary')} />
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
                                {t('deviceStatus')}
                            </Typography>

                            <Box sx={{ width: '100%', maxWidth: 230, mx: 'auto' }}>
                                <PieChart
                                    width={200}
                                    height={200}
                                    series={[
                                        {
                                            data: statusPieData,
                                            arcLabel: (item) => item.value,
                                            arcLabelMinAngle: 10,
                                        },
                                    ]}
                                    onItemClick={handleStatusClick}
                                    sx={{
                                        '& .MuiPieArcLabel-root': {
                                            fill: '#fff',
                                            fontSize: 18,
                                            fontWeight: 650,
                                        },
                                    }}
                                />

                            </Box>
                        </Box>

                        <Divider flexItem />

                        {/* Motion Status */}
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="subtitle1" gutterBottom>
                                {t('motionStatus')}
                            </Typography>

                            <Box sx={{ width: '100%', maxWidth: 230, mx: 'auto' }}>
                                <PieChart
                                    width={200}
                                    height={200}
                                    series={[
                                        {
                                            data: motionPieData,
                                            arcLabel: (item) => item.value,
                                            arcLabelMinAngle: 10,
                                        },
                                    ]}
                                    onItemClick={handleMotionClick}
                                    sx={{
                                        '& .MuiPieArcLabel-root': {
                                            fill: '#fff',
                                            fontSize: 18,
                                            fontWeight: 650,

                                        },

                                    }}
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
