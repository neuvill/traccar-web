import { useEffect, useMemo } from 'react';
import { useTheme } from '@mui/material';
import { map } from '../core/MapView';
import './dashboard.css';

const statusClass = (status) =>
  `maplibregl-ctrl-icon maplibre-ctrl-dashboard maplibre-ctrl-dashboard-${status}`;

class DashboardControl {
  constructor(eventHandler) {
    this.eventHandler = eventHandler;
  }

  onAdd() {
    this.button = document.createElement('button');
    this.button.className = statusClass('off');
    this.button.type = 'button';
    this.button.onclick = () => {
      if (typeof this.eventHandler === 'function') {
        this.eventHandler(this);
      }
    };

    this.container = document.createElement('div');
    this.container.className = 'maplibregl-ctrl-group maplibregl-ctrl';
    this.container.appendChild(this.button);

    return this.container;
  }

  onRemove() {
    this.container?.parentNode?.removeChild(this.container);
  }

  setHandler(handler) {
    this.eventHandler = handler;
  }
}

const MapDashboard = ({ onClick }) => {
  const theme = useTheme();

  // ✅ Create control ONCE
  const control = useMemo(
    () => new DashboardControl(() => { }),
    []
  );

  // ✅ Update handler when prop changes
  useEffect(() => {
    control.setHandler(onClick ?? (() => { }));
  }, [onClick, control]);

  // ✅ Add / remove control
  useEffect(() => {
    map.addControl(
      control,
      theme.direction === 'rtl' ? 'top-left' : 'top-right'
    );
    return () => map.removeControl(control);
  }, [control, theme.direction]);

  return null;
};

export default MapDashboard;
