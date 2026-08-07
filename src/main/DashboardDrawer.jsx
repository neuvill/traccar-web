import {
  Box,
  Divider,
  Drawer,
  List,
  ListItemButton,
  Tab,
  Tabs,
  Toolbar,
  Typography,
} from '@mui/material';
import { PieChart } from '@mui/x-charts/PieChart';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { makeStyles } from 'tss-react/mui';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DashboardLoading from '../common/components/DashboardLoading';
import { useTranslation } from '../common/components/LocalizationProvider';
import { formatDistance } from '../common/util/formatter';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { useAttributePreference } from '../common/util/preferences';

const useStyles = makeStyles()((theme) => ({
  drawer: {
    width: theme.dimensions.eventsDrawerWidth,
  },
  drawerPaper: {
    width: theme.dimensions.eventsDrawerWidth,
  },
  toolbar: {
    paddingLeft: theme.spacing(2),
    paddingRight: theme.spacing(2),
  },
  title: {
    flexGrow: 1,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
}));

const getDeviceName = (devicesById, item) => {
  const localName = devicesById[item.deviceId]?.name;
  return localName || item.deviceName || '';
};

const getSummaryDeviceName = (item) => item.deviceName || '';

const DashboardDrawer = ({ open, onClose, onMotionFilter, onStatusFilter, onShowDevices }) => {
  const { classes } = useStyles();
  const t = useTranslation();
  const navigate = useNavigate();
  const positions = useSelector((state) => state.session.positions);
  const devicesById = useSelector((state) => state.devices.items);
  const devices = useMemo(() => Object.values(devicesById), [devicesById]);
  const distanceUnit = useAttributePreference('distanceUnit');
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

      if (status === 'parked') {
        parked += 1;
      } else if (status === 'moving') {
        moving += 1;
      } else if (status === 'idling') {
        idling += 1;
      }
    });

    return { parked, moving, idling };
  }, [positions]);

  const motionPieData = useMemo(
    () => [
      {
        id: 'moving',
        label: t('motionStatusMoving'),
        value: motionStats.moving,
        color: '#27cb46',
      },
      {
        id: 'idling',
        label: t('motionStatusIdle'),
        value: motionStats.idling,
        color: '#00b5e2',
      },
      {
        id: 'parked',
        label: t('motionStatusParked'),
        value: motionStats.parked,
        color: '#ed2736',
      },
    ],
    [motionStats.idling, motionStats.moving, motionStats.parked, t],
  );

  const statusPieData = useMemo(
    () => [
      {
        id: 'online',
        label: t('deviceStatusOnline'),
        value: deviceStats.online,
        color: '#27cb46',
      },
      {
        id: 'offline',
        label: t('deviceStatusOffline'),
        value: deviceStats.offline,
        color: '#ed2736',
      },
      {
        id: 'unknown',
        label: t('deviceStatusUnknown'),
        value: deviceStats.unknown,
        color: '#808080',
      },
    ],
    [deviceStats.offline, deviceStats.online, deviceStats.unknown, t],
  );

  const handleMotionClick = (_, item) => {
    const motionStatus = motionPieData[item?.dataIndex]?.id;
    if (!motionStatus) {
      return;
    }

    onMotionFilter(motionStatus);
    onShowDevices();
  };

  const handleStatusClick = (_, item) => {
    const status = statusPieData[item?.dataIndex]?.id;
    if (!status) {
      return;
    }

    onStatusFilter(status);
    onShowDevices();
  };

  useEffect(() => {
    if (!open || tab !== 1) {
      return undefined;
    }

    let active = true;
    setLoading(true);

    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(0, 0, 0, 0);

    const fetchSummary = async () => {
      try {
        const query = new URLSearchParams({
          from: midnight.toISOString(),
          to: now.toISOString(),
        });

        const response = await fetchOrThrow(`/api/reports/summary?${query.toString()}`, {
          headers: { Accept: 'application/json' },
        });
        const data = await response.json();
        const sorted = [...data].sort((a, b) =>
          getSummaryDeviceName(a).localeCompare(getSummaryDeviceName(b)),
        );

        if (active) {
          setSummary(sorted);
        }
      } catch (error) {
        if (active) {
          console.error(error);
          setSummary([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchSummary();

    return () => {
      active = false;
    };
  }, [open, tab]);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          className: classes.drawerPaper,
        },
      }}
    >
      <Toolbar className={classes.toolbar} disableGutters>
        <Typography variant="h6" className={classes.title}>
          <DashboardIcon />
          {t('dashboardTitle')}
        </Typography>
      </Toolbar>

      <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="fullWidth">
        <Tab label={t('deviceStatus')} />
        <Tab label={t('reportSummary')} />
      </Tabs>

      <Divider />

      <Box className={classes.drawer}>
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

        {tab === 1 &&
          (loading ? (
            <DashboardLoading />
          ) : (
            <List dense>
              {summary.map((item) => (
                <div key={item.deviceId}>
                  <ListItemButton onClick={() => navigate(`/qreplay?deviceId=${item.deviceId}`)}>
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
                        {getDeviceName(devicesById, item)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatDistance(item.distance, distanceUnit, t)}
                      </Typography>
                    </Box>
                  </ListItemButton>
                  <Divider />
                </div>
              ))}
            </List>
          ))}
      </Box>
    </Drawer>
  );
};

export default DashboardDrawer;
