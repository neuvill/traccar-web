import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { makeStyles } from 'tss-react/mui';
import { List } from 'react-window';
import { devicesActions } from '../store';
import { useEffectAsync } from '../reactHelper';
import DeviceRow from './DeviceRow';
import fetchOrThrow from '../common/util/fetchOrThrow';

const useStyles = makeStyles()((theme) => ({
    list: {
        height: '100%',
        direction: theme.direction,
    },
}));

// ✅ Row wrapper: resolves item + position once per row
const Row = ({ index, style, devices, setDeviceSheetOpen }) => {
    const item = devices[index];

    const position = useSelector(
        (state) => state.session.positions[item.id]
    );

    return (
        <DeviceRow
            item={item}
            position={position}
            setDeviceSheetOpen={setDeviceSheetOpen}
            style={style}
        />
    );
};

const DeviceList = ({ devices, setDeviceSheetOpen }) => {
    const { classes } = useStyles();
    const dispatch = useDispatch();

    // ✅ Single Redux subscription (correct place)
    //const positions = useSelector((state) => state.session.positions);

    // ⏱ Used to refresh relative time every minute
    const [, setTime] = useState(Date.now());

    useEffect(() => {
        const interval = setInterval(() => setTime(Date.now()), 60000);
        return () => clearInterval(interval);
    }, []);

    // 🔄 Initial devices fetch
    useEffectAsync(async () => {
        const response = await fetchOrThrow('/api/devices');
        dispatch(devicesActions.refresh(await response.json()));
    }, []);

    return (
        <List
            className={classes.list}
            rowComponent={Row}
            rowCount={devices.length}
            rowHeight={90}
            rowProps={{
                devices,
                setDeviceSheetOpen,
            }}
            overscanCount={5}
        />
    );
};

export default DeviceList;