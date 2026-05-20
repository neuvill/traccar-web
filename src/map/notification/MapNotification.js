import { useEffect, useMemo } from 'react';
import { useTheme } from '@mui/material';
import { map } from '../core/MapView';
import './notification.css';

const statusClass = (status) =>
  `maplibregl-ctrl-icon maplibre-ctrl-notification maplibre-ctrl-notification-${status}`;

class NotificationControl {
  constructor(eventHandler) {
    this.eventHandler = eventHandler;
  }

  onAdd() {
    this.button = document.createElement('button');
    this.button.className = statusClass('off');
    this.button.type = 'button';
    this.button.onclick = () => this.eventHandler(this);

    this.container = document.createElement('div');
    this.container.className =
      'maplibregl-ctrl-group maplibregl-ctrl maplibregl-ctrl-notification-group';
    this.container.appendChild(this.button);

    return this.container;
  }

  onRemove() {
    this.container.parentNode.removeChild(this.container);
  }

  setHandler(handler) {
    this.eventHandler = handler;
  }

  setEnabled(enabled) {
    this.button.className = statusClass(enabled ? 'on' : 'off');
  }
}

const MapNotification = ({ enabled, onClick }) => {
  const theme = useTheme();

  const control = useMemo(() => new NotificationControl(() => {}), []);

  useEffect(() => {
    control.setHandler(onClick ?? (() => {}));
  }, [control, onClick]);

  useEffect(() => {
    map.addControl(control, theme.direction === 'rtl' ? 'top-left' : 'top-right');
    return () => map.removeControl(control);
  }, [control, theme.direction]);

  useEffect(() => {
    control.setEnabled(enabled);
  }, [control, enabled]);

  return null;
};

export default MapNotification;
