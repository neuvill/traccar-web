import Box from '@mui/material/Box';
import SwipeableDrawer from '@mui/material/SwipeableDrawer';
import DeviceList from './DeviceList';
import MainToolbar from './MainToolbar';

const noop = () => { };

const DeviceBottomSheet = ({
    open,
    onOpen,
    onClose,
    devices,
    setDeviceSheetOpen,
    filter,
    setFilter,
    filterSort,
    setFilterSort,
    filterMap,
    setFilterMap,
    keyword,
    setKeyword,
    onResetFilters,
}) => (
    <SwipeableDrawer
        anchor="bottom"
        open={open}
        onClose={onClose}
        onOpen={onOpen}
        swipeAreaWidth={30}
        disableBackdropTransition={false}
        disableDiscovery={false}
        ModalProps={{ keepMounted: true }}
        slotProps={{
            paper: {
                sx: {
                    display: 'flex',
                    flexDirection: 'column',
                    height: '96dvh',
                    maxHeight: 'calc(100dvh - env(safe-area-inset-top))',
                    overflow: 'hidden',
                    borderTopLeftRadius: '16px',
                    borderTopRightRadius: '16px',
                },
            },
        }}
    >
        <Box
            sx={{
                width: 40,
                height: 5,
                backgroundColor: 'grey.400',
                borderRadius: '3px',
                flexShrink: 0,
                my: 1,
                mx: 'auto',
            }}
        />
        <Box sx={{ flexShrink: 0 }}>
            <MainToolbar
                filteredDevices={devices}
                devicesOpen
                setDevicesOpen={noop}
                keyword={keyword}
                setKeyword={setKeyword}
                filter={filter}
                setFilter={setFilter}
                filterSort={filterSort}
                setFilterSort={setFilterSort}
                filterMap={filterMap}
                setFilterMap={setFilterMap}
                onResetFilters={onResetFilters}
                setDeviceSheetOpen={setDeviceSheetOpen}
            />
        </Box>
        <Box sx={{ flex: 1, minHeight: 0 }}>
            <DeviceList devices={devices} setDeviceSheetOpen={setDeviceSheetOpen} />
        </Box>
    </SwipeableDrawer>
);

export default DeviceBottomSheet;
