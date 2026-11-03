import { memo, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { makeStyles } from 'tss-react/mui';
import { List } from 'react-window';
import { devicesActions } from '../store';
import { useAsyncTask } from '../reactHelper';
import DeviceRow from './DeviceRow';
import fetchOrThrow from '../common/util/fetchOrThrow';

const useStyles = makeStyles()((theme) => ({
  list: {
    height: '100%',
    direction: theme.direction,
  },
}));

const RowContent = ({ index, style, devices, setDeviceSheetOpen, now }) => {
  const item = devices[index];

  const position = useSelector((state) => state.session.positions[item.id]);

  return (
    <DeviceRow
      item={item}
      position={position}
      setDeviceSheetOpen={setDeviceSheetOpen}
      now={now}
      style={style}
    />
  );
};

// react-window passes a new style object and the whole filtered list on every render, so
// compare what this row actually shows; its position updates via its own selector
const Row = memo(
  RowContent,
  (prev, next) =>
    prev.devices[prev.index] === next.devices[next.index] &&
    prev.now === next.now &&
    prev.setDeviceSheetOpen === next.setDeviceSheetOpen &&
    prev.style.transform === next.style.transform &&
    prev.style.height === next.style.height,
);

const DeviceList = ({ devices, setDeviceSheetOpen }) => {
  const { classes } = useStyles();
  const dispatch = useDispatch();

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  useAsyncTask(
    async ({ signal }) => {
      const response = await fetchOrThrow('/api/devices', { signal });
      dispatch(devicesActions.refresh(await response.json()));
    },
    [dispatch],
  );

  const rowProps = useMemo(
    () => ({ devices, now, setDeviceSheetOpen }),
    [devices, now, setDeviceSheetOpen],
  );

  return (
    <List
      className={classes.list}
      rowComponent={Row}
      rowCount={devices.length}
      rowHeight={90}
      rowProps={rowProps}
      overscanCount={5}
    />
  );
};

export default DeviceList;
