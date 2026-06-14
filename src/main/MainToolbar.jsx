import { useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  IconButton,
  InputAdornment,
  InputLabel,
  ListItemButton,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Popover,
  Select,
  Toolbar,
  Tooltip,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DnsIcon from '@mui/icons-material/Dns';
import MapIcon from '@mui/icons-material/Map';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import TuneIcon from '@mui/icons-material/Tune';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useDeviceReadonly } from '../common/util/permissions';
import DeviceRow from './DeviceRow';

const useStyles = makeStyles()((theme) => ({
  toolbar: {
    display: 'flex',
    gap: theme.spacing(1),
  },
  filterPanel: {
    display: 'flex',
    flexDirection: 'column',
    padding: theme.spacing(2),
    gap: theme.spacing(2),
    width: theme.dimensions.drawerWidthTablet,
    maxWidth: 'calc(100vw - 32px)',
    boxSizing: 'border-box',
  },
}));

const MainToolbar = ({
  filteredDevices,
  devicesOpen,
  setDevicesOpen,
  keyword,
  setKeyword,
  filter,
  setFilter,
  filterSort,
  setFilterSort,
  filterMap,
  setFilterMap,
  onResetFilters,
  setDeviceSheetOpen,
}) => {
  const { classes } = useStyles();
  const theme = useTheme();
  const navigate = useNavigate();
  const t = useTranslation();
  const deviceReadonly = useDeviceReadonly();

  const groups = useSelector((state) => state.groups.items);
  const devices = useSelector((state) => state.devices.items);
  const geofences = useSelector((state) => state.geofences.items);
  const positions = useSelector((state) => state.session.positions);

  const toolbarRef = useRef();
  const inputRef = useRef();
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const [devicesAnchorEl, setDevicesAnchorEl] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  const filterStatuses = filter?.statuses || [];
  const filterGroups = filter?.groups || [];
  const filterGeofences = filter?.geofences || [];
  const filterMotionStatuses = filter?.motionStatuses || [];

  const deviceStatusCounts = useMemo(
    () =>
      Object.values(devices).reduce((counts, device) => {
        counts[device.status] = (counts[device.status] || 0) + 1;
        return counts;
      }, {}),
    [devices],
  );

  const motionStatusCounts = useMemo(
    () =>
      Object.values(positions || {}).reduce((counts, position) => {
        const motionStatus = position.attributes?.motionStatus;
        if (motionStatus) {
          counts[motionStatus] = (counts[motionStatus] || 0) + 1;
        }
        return counts;
      }, {}),
    [positions],
  );

  return (
    <Toolbar ref={toolbarRef} className={classes.toolbar}>
      <IconButton edge="start" onClick={() => setDevicesOpen(!devicesOpen)}>
        {devicesOpen ? <MapIcon /> : <DnsIcon />}
      </IconButton>
      <OutlinedInput
        ref={inputRef}
        placeholder={t('sharedSearchDevices')}
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        onFocus={() => {
          if (!devicesOpen) {
            setNow(Date.now());
            setDevicesAnchorEl(toolbarRef.current);
          }
        }}
        startAdornment={
          <IconButton
            size="small"
            onClick={onResetFilters}
            disabled={
              !filterStatuses.length
              && !filterGroups.length
              && !filterGeofences.length
              && !filterMotionStatuses.length
            }
            title="Reset filters"
          >
            <RestartAltIcon fontSize="small" />
          </IconButton>
        }
        endAdornment={
          <InputAdornment position="end">
            {!!keyword && (
              <IconButton
                size="small"
                edge="end"
                aria-label="Clear search"
                title="Clear search"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setKeyword('');
                  setDevicesAnchorEl(null);
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            )}
            {filteredDevices.length}
            <IconButton size="small" edge="end" onClick={() => setFilterAnchorEl(inputRef.current)}>
              <Badge
                color="info"
                variant="dot"
                invisible={
                  !filterStatuses.length
                  && !filterGroups.length
                  && !filterGeofences.length
                  && !filterMotionStatuses.length
                }
              >
                <TuneIcon fontSize="small" />
              </Badge>
            </IconButton>
          </InputAdornment>
        }
        size="small"
        fullWidth
      />
      <Popover
        open={!!devicesAnchorEl && !devicesOpen}
        anchorEl={devicesAnchorEl}
        onClose={() => setDevicesAnchorEl(null)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: Number(theme.spacing(2).slice(0, -2)),
        }}
        marginThreshold={0}
        slotProps={{
          paper: {
            style: { width: `calc(${toolbarRef.current?.clientWidth}px - ${theme.spacing(4)})` },
          },
        }}
        elevation={1}
        disableAutoFocus
        disableEnforceFocus
      >
        {filteredDevices.slice(0, 3).map((device) => (
          <DeviceRow
            key={device.id}
            item={device}
            position={positions?.[device.id]}
            setDeviceSheetOpen={setDeviceSheetOpen}
            now={now}
          />
        ))}
        {filteredDevices.length > 3 && (
          <ListItemButton alignItems="center" onClick={() => setDevicesOpen(true)}>
            <ListItemText primary={t('notificationAlways')} style={{ textAlign: 'center' }} />
          </ListItemButton>
        )}
      </Popover>
      <Popover
        open={!!filterAnchorEl}
        anchorEl={filterAnchorEl}
        onClose={() => setFilterAnchorEl(null)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
      >
        <div className={classes.filterPanel}>
          <FormControl>
            <InputLabel>{t('deviceStatus')}</InputLabel>
            <Select
              label={t('deviceStatus')}
              value={filterStatuses}
              onChange={(e) => setFilter({ ...filter, statuses: e.target.value })}
              multiple
            >
              <MenuItem value="online">{`${t('deviceStatusOnline')} (${deviceStatusCounts.online || 0})`}</MenuItem>
              <MenuItem value="offline">{`${t('deviceStatusOffline')} (${deviceStatusCounts.offline || 0})`}</MenuItem>
              <MenuItem value="unknown">{`${t('deviceStatusUnknown')} (${deviceStatusCounts.unknown || 0})`}</MenuItem>
            </Select>
          </FormControl>
          <FormControl>
            <InputLabel>{t('positionMotion')}</InputLabel>
            <Select
              label={t('positionMotion')}
              value={filterMotionStatuses}
              onChange={(e) => setFilter({ ...filter, motionStatuses: e.target.value })}
              multiple
            >
              <MenuItem value="moving">{`${t('motionStatusMoving')} (${motionStatusCounts.moving || 0})`}</MenuItem>
              <MenuItem value="idling">{`${t('motionStatusIdle')} (${motionStatusCounts.idling || 0})`}</MenuItem>
              <MenuItem value="parked">{`${t('motionStatusParked')} (${motionStatusCounts.parked || 0})`}</MenuItem>
            </Select>
          </FormControl>
          <FormControl>
            <InputLabel>{t('settingsGroups')}</InputLabel>
            <Select
              label={t('settingsGroups')}
              value={filterGroups}
              onChange={(e) => setFilter({ ...filter, groups: e.target.value })}
              multiple
            >
              {Object.values(groups)
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((group) => (
                  <MenuItem key={group.id} value={group.id}>
                    {group.name}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
          <FormControl>
            <InputLabel>{t('sharedGeofences')}</InputLabel>
            <Select
              label={t('sharedGeofences')}
              value={filterGeofences}
              onChange={(e) => setFilter({ ...filter, geofences: e.target.value })}
              multiple
            >
              {Object.values(geofences)
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((geofence) => (
                  <MenuItem key={geofence.id} value={geofence.id}>
                    {geofence.name}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
          <FormControl>
            <InputLabel>{t('sharedSortBy')}</InputLabel>
            <Select
              label={t('sharedSortBy')}
              value={filterSort}
              onChange={(e) => setFilterSort(e.target.value)}
              displayEmpty
            >
              <MenuItem value="">{'\u00a0'}</MenuItem>
              <MenuItem value="name">{t('sharedName')}</MenuItem>
              <MenuItem value="lastUpdate">{t('deviceLastUpdate')}</MenuItem>
            </Select>
          </FormControl>
          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox checked={filterMap} onChange={(e) => setFilterMap(e.target.checked)} />
              }
              label={t('sharedFilterMap')}
            />
          </FormGroup>
        </div>
      </Popover>
      <IconButton edge="end" onClick={() => navigate('/settings/device')} disabled={deviceReadonly}>
        <Tooltip
          open={!deviceReadonly && Object.keys(devices).length === 0}
          title={t('deviceRegisterFirst')}
          arrow
        >
          <AddIcon />
        </Tooltip>
      </IconButton>
    </Toolbar>
  );
};

export default MainToolbar;
