import { useEffect, useMemo } from 'react';
import { useTheme } from '@mui/material';
import { map } from '../core/MapView';
import './assistant.css';

const statusClass = (status) =>
  `maplibregl-ctrl-icon maplibre-ctrl-assistant maplibre-ctrl-assistant-${status}`;

class AssistantControl {
  constructor(eventHandler, title) {
    this.eventHandler = eventHandler;
    this.title = title;
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
    this.syncButtonMetadata();

    this.container = document.createElement('div');
    this.container.className =
      'maplibregl-ctrl-group maplibregl-ctrl maplibregl-ctrl-assistant-group';
    this.container.appendChild(this.button);

    return this.container;
  }

  onRemove() {
    this.container?.parentNode?.removeChild(this.container);
  }

  setHandler(handler) {
    this.eventHandler = handler;
  }

  setTitle(title) {
    this.title = title;
    this.syncButtonMetadata();
  }

  syncButtonMetadata() {
    if (!this.button) {
      return;
    }

    this.button.title = this.title;
    this.button.setAttribute('aria-label', this.title);
  }
}

const MapAssistant = ({ title, onClick }) => {
  const theme = useTheme();

  const control = useMemo(() => new AssistantControl(() => {}, ''), []);

  useEffect(() => {
    control.setHandler(onClick ?? (() => {}));
  }, [control, onClick]);

  useEffect(() => {
    control.setTitle(title);
  }, [control, title]);

  useEffect(() => {
    map.addControl(control, theme.direction === 'rtl' ? 'top-left' : 'top-right');
    return () => map.removeControl(control);
  }, [control, theme.direction]);

  return null;
};

export default MapAssistant;
