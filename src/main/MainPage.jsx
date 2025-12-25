import {
  useState, useCallback, useEffect,
} from 'react';
import { Paper } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useDispatch, useSelector } from 'react-redux';
import DeviceList from './DeviceList';
import BottomMenu from '../common/components/BottomMenu';
import StatusCard from '../common/components/StatusCard';
import { devicesActions } from '../store';
import usePersistedState from '../common/util/usePersistedState';
import EventsDrawer from './EventsDrawer';
import DashboardDrawer from './DashboardDrawer';
import useFilter from './useFilter';
import MainToolbar from './MainToolbar';
import MainMap from './MainMap';
import { useAttributePreference } from '../common/util/preferences';
import DeviceBottomSheet from './DeviceBottomSheet';
import StatusCardDrawer from '../common/components/StatusCardDrawer';

const useStyles = makeStyles()((theme) => ({
  root: {
    height: '100%',
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#fff',
    boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)',
    position: 'relative', // Ensure the button is positioned relative to the sidebar
    [theme.breakpoints.up('md')]: {
      position: 'fixed',
      left: 0,
      top: 0,
      height: `calc(100% - ${theme.spacing(0)})`,
      width: theme.dimensions.drawerWidthDesktop,
      margin: theme.spacing(0),
      zIndex: 3,
    },
    [theme.breakpoints.down('md')]: {
      height: '100%',
      width: '100%',
    },
  },
  header: {
    pointerEvents: 'auto',
    zIndex: 6,
  },
  footer: {
    pointerEvents: 'auto',
    zIndex: 5,
  },
  middle: {
    flex: 1,
    display: 'grid',
    minHeight: 0,
  },
  contentMap: {
    pointerEvents: 'auto',
    gridArea: '1 / 1',
  },
  contentList: {
    pointerEvents: 'auto',
    gridArea: '1 / 1',
    zIndex: 4,
    display: 'flex',
    minHeight: 0,
  },
  toggleButton: {
    position: 'absolute',
    top: '30%', // Center vertically
    right: '-22px', // Move it outside the sidebar
    transform: 'translateY(-50%)', // Align perfectly in the middle
    backgroundColor: '#e0e0e0', // Light grey like in the image
    color: '#000', // Black icon
    border: '1px solid #ccc', // Slight border
    borderRadius: '4px 10px 10px 4px', // Rounded only on left side
    width: '30px', // Smaller width
    height: '60px', // Taller button
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
    transition: 'background-color 0.3s ease',
    '&:hover': {
      backgroundColor: '#d6d6d6', // Slightly darker grey on hover
    },
    [theme.breakpoints.down('md')]: {
      display: 'none', // Hide on mobile
    },
  },
}));

const MainPage = () => {
  const { classes } = useStyles();
  const dispatch = useDispatch();
  const theme = useTheme();

  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const mobile = useMediaQuery(theme.breakpoints.down('md'));
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const mapOnSelect = useAttributePreference('mapOnSelect', true);
  const [deviceSheetOpen, setDeviceSheetOpen] = useState(false);

  const selectedDeviceId = useSelector((state) => state.devices.selectedId);
  const positions = useSelector((state) => state.session.positions);
  const [filteredPositions, setFilteredPositions] = useState([]);
  const selectedPosition = filteredPositions.find((position) => selectedDeviceId && position.deviceId === selectedDeviceId);

  const [filteredDevices, setFilteredDevices] = useState([]);

  const [keyword, setKeyword] = useState('');
  const [filter, setFilter] = usePersistedState('filter', {
    statuses: [],
    groups: [],
    motionStatuses: [],   // ⬅️ add this
  });
  const [filterSort, setFilterSort] = usePersistedState('filterSort', '');
  const [filterMap, setFilterMap] = usePersistedState('filterMap', false);

  const [devicesOpen, setDevicesOpen] = useState(desktop);
  const [eventsOpen, setEventsOpen] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);

  const onEventsClick = useCallback(() => setEventsOpen(true), [setEventsOpen]);
  const onBoardClick = useCallback(() => setDashboardOpen(true), [setDashboardOpen]);
  useEffect(() => {
    if (!desktop && mapOnSelect && selectedDeviceId) {
      setDevicesOpen(false);
    }
  }, [desktop, mapOnSelect, selectedDeviceId]);

  useFilter(keyword, filter, filterSort, filterMap, positions, setFilteredDevices, setFilteredPositions);

  return (
    <div className={classes.root}>
      {desktop && (
        <MainMap
          filteredPositions={filteredPositions}
          selectedPosition={selectedPosition}
          onEventsClick={onEventsClick}
          onBoardClick={onBoardClick}
        />
      )}

      <div className={classes.sidebar}
        style={{
          transform: isSidebarVisible ? 'translateX(0)' : 'translateX(-100%)', // Slide in/out
          transition: 'transform 0.3s ease-in-out', // Smooth animation
        }}
      >
        {desktop &&
          <Paper square elevation={3} className={classes.header}>
            <MainToolbar
              filteredDevices={filteredDevices}
              devicesOpen={devicesOpen}
              setDevicesOpen={setDevicesOpen}
              keyword={keyword}
              setKeyword={setKeyword}
              filter={filter}
              setFilter={setFilter}
              filterSort={filterSort}
              setFilterSort={setFilterSort}
              filterMap={filterMap}
              setFilterMap={setFilterMap}
            />
          </Paper>}
        <div className={classes.middle}>
          {!desktop && (
            <div className={classes.contentMap}>
              <MainMap
                filteredPositions={filteredPositions}
                selectedPosition={selectedPosition}
                selectedDevices={filteredDevices}
                onEventsClick={onEventsClick}
                onBoardClick={onBoardClick}
                setDeviceSheetOpen={setDeviceSheetOpen}
              />
            </div>
          )}
          {desktop && (
            <Paper square className={classes.contentList} style={devicesOpen ? {} : { visibility: 'hidden' }}>
              <DeviceList devices={filteredDevices} />
            </Paper>
          )}
        </div>
        {desktop && (
          <div className={classes.footer}>
            <BottomMenu />
          </div>
        )}
        <button
          className={classes.toggleButton}
          aria-label={isSidebarVisible ? 'Hide Sidebar' : 'Show Sidebar'}
          onClick={() => setIsSidebarVisible(!isSidebarVisible)}
        >
          {isSidebarVisible ? '❮' : '❯'}
        </button>

      </div>

      {mobile && (

        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1300, // Above most elements
          }}
        >

          <DeviceBottomSheet
            open={deviceSheetOpen}
            onOpen={() => setDeviceSheetOpen(true)}
            onClose={() => setDeviceSheetOpen(false)}
            devices={filteredDevices}
            setDeviceSheetOpen={setDeviceSheetOpen}
          />

        </div>
      )}

      <EventsDrawer open={eventsOpen} onClose={() => setEventsOpen(false)} />
      <DashboardDrawer open={dashboardOpen} onClose={() => setDashboardOpen(false)} />
      {selectedDeviceId && desktop && (
        <StatusCard
          deviceId={selectedDeviceId}
          position={selectedPosition}
          onClose={() => dispatch(devicesActions.selectId(null))}
          desktopPadding={theme.dimensions.drawerWidthDesktop}
        />
      )}
      {selectedDeviceId && mobile && (
        <StatusCardDrawer
          deviceId={selectedDeviceId}
          position={selectedPosition}
          onClose={() => dispatch(devicesActions.selectId(null))}
          desktopPadding={theme.dimensions.drawerWidthDesktop}
        />
      )}
    </div>
  );
};

export default MainPage;
