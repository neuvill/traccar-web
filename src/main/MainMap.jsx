import { useCallback, useState } from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useDispatch, useSelector } from 'react-redux';
import { makeStyles } from 'tss-react/mui';
import MapView from '../map/core/MapView';
import MapSelectedDevice from '../map/main/MapSelectedDevice';
import MapAccuracy from '../map/main/MapAccuracy';
import MapGeofence from '../map/MapGeofence';
import MapCurrentLocation from '../map/MapCurrentLocation';
import PoiMap from '../map/main/PoiMap';
import MapPadding from '../map/MapPadding';
import { devicesActions } from '../store';
import MapDefaultCamera from '../map/main/MapDefaultCamera';
import MapLiveRoutes from '../map/main/MapLiveRoutes';
import MapPositions from '../map/MapPositions';
import MapOverlay from '../map/overlay/MapOverlay';
import MapGeocoder from '../map/control/MapGeocoder';
import MapScale from '../map/MapScale';
import MapRuler from '../map/control/MapRuler';
import MapNotification from '../map/control/MapNotification';
import MapDashboard from '../map/dashboard/MapDashboard';
import useFeatures from '../common/util/useFeatures';
import BottomPhoneMenue from '../common/components/BottomPhoneMenu';
import AssistantWidget from '../common/components/AssistantWidget';
import MapAssistant from '../map/assistant/MapAssistant';

const useStyles = makeStyles(() => ({
  menu: {
    zIndex: 4,
  },
}));

const MainMap = ({
  filteredPositions,
  notificationEnabled,
  selectedPosition,
  onEventsClick,
  selectedDevices,
  setDeviceSheetOpen,
  onBoardClick,
}) => {
  const theme = useTheme();
  const dispatch = useDispatch();

  const desktop = useMediaQuery(theme.breakpoints.up('md'));

  const user = useSelector((state) => state.session.user);
  const classes = useStyles();
  const features = useFeatures();

  const [rulerActive, setRulerActive] = useState(false);

  const onMarkerClick = useCallback(
    (_, deviceId) => {
      dispatch(devicesActions.selectId(deviceId));
    },
    [dispatch],
  );

  return (
    <>
      <MapView>
        <MapOverlay />
        <MapGeofence />
        <MapAccuracy positions={filteredPositions} />
        <MapLiveRoutes deviceIds={filteredPositions.map((p) => p.deviceId)} />
        <MapPositions
          positions={filteredPositions}
          onMarkerClick={onMarkerClick}
          selectedDevices={selectedDevices}
          selectedPosition={selectedPosition}
          showStatus
          disabled={rulerActive}
        />
        <MapDefaultCamera filteredPositions={filteredPositions} />
        <MapSelectedDevice />
        <PoiMap />
        <MapRuler positions={filteredPositions} onActiveChange={setRulerActive} />
        {!desktop && location.pathname !== '/replay' && (
          <div className={classes.menu}>
            <BottomPhoneMenue setDeviceSheetOpen={setDeviceSheetOpen} />
          </div>
        )}
      </MapView>
      <MapScale />
      <MapCurrentLocation />
      <MapGeocoder />
      {!features.disableEvents && (
        <MapNotification enabled={notificationEnabled} onClick={onEventsClick} />
      )}
      <MapDashboard onClick={onBoardClick} />
      {user?.administrator && (
        <AssistantWidget
          renderTrigger={({ onOpen, title }) => <MapAssistant title={title} onClick={onOpen} />}
        />
      )}
      {desktop && (
        <MapPadding
          start={
            parseInt(theme.dimensions.drawerWidthDesktop, 10) + parseInt(theme.spacing(1.5), 10)
          }
        />
      )}
    </>
  );
};

export default MainMap;
