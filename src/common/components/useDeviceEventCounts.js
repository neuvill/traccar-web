import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { useCatchCallback } from '../../reactHelper';
import fetchOrThrow from '../util/fetchOrThrow';

export const REPORT_EVENT_TYPES = [
  'alarm',
  'deviceOverspeed',
  'ignitionOff',
  'ignitionOn',
  'deviceIdle',
];

const useDeviceEventCounts = (deviceId, active) => {
  const [eventCounts, setEventCounts] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadEventCounts = useCatchCallback(async () => {
    setLoading(true);
    try {
      const to = dayjs();
      const from = to.startOf('day');
      const query = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
      query.append('deviceId', deviceId);
      REPORT_EVENT_TYPES.forEach((type) => query.append('type', type));
      const response = await fetchOrThrow(`/api/reports/events?${query.toString()}`, {
        headers: { Accept: 'application/json' },
      });
      const events = await response.json();
      setEventCounts(
        events.reduce((counts, event) => {
          counts[event.type] = (counts[event.type] || 0) + 1;
          return counts;
        }, {}),
      );
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    if (active && deviceId) {
      loadEventCounts();
    }
  }, [active, deviceId, loadEventCounts]);

  return { eventCounts, loading };
};

export default useDeviceEventCounts;
