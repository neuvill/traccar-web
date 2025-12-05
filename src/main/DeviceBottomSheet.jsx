import React from 'react';
import SwipeableDrawer from '@mui/material/SwipeableDrawer';
import DeviceList from './DeviceList';
import { useState } from 'react';
import useFilter from './useFilter';
import MainToolbar from './MainToolbar';
import usePersistedState from '../common/util/usePersistedState';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from '@mui/material/styles';

const DeviceBottomSheet = ({ open, onOpen, onClose, devices, setDeviceSheetOpen }) => {
    //console.log('DeviceBottomSheet devices:', devices);
    const theme = useTheme();
    const desktop = useMediaQuery(theme.breakpoints.up('md'));
    const [keyword, setKeyword] = useState('');
    const [filter, setFilter] = usePersistedState('filter', {
        statuses: [],
        groups: [],
    });
    const [filterSort, setFilterSort] = usePersistedState('filterSort', '');
    const [filterMap, setFilterMap] = usePersistedState('filterMap', false);
    const positions = useSelector((state) => state.session.positions);
    const [filteredDevices, setFilteredDevices] = useState([]);
    const [filteredPositions, setFilteredPositions] = useState([]);
    const [devicesOpen, setDevicesOpen] = useState(desktop);

    useFilter(keyword, filter, filterSort, filterMap, positions, setFilteredDevices, setFilteredPositions);


    //const [deviceSheetOpen, setDeviceSheetOpen] = useState(false);
    //console.log(onOpen);
    return (
        <SwipeableDrawer
            anchor="bottom"
            open={open}
            onClose={onClose}
            onOpen={onOpen}
            swipeAreaWidth={30}
            disableBackdropTransition={false}
            disableDiscovery={false}
            slotProps={{
                paper: {
                    sx: {
                        height: '96%',
                        borderTopLeftRadius: 16,
                        borderTopRightRadius: 16,
                    },
                },
            }}
        >
            <div
                style={{
                    width: 40,
                    height: 5,
                    backgroundColor: '#ccc',
                    borderRadius: 3,
                    margin: '8px auto',
                }}
            />
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
            <DeviceList
                devices={filteredDevices}
                setDeviceSheetOpen={setDeviceSheetOpen}
            />
        </SwipeableDrawer>
    );
};

export default DeviceBottomSheet;