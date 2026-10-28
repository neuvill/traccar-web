import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { useCatchCallback } from '../../reactHelper';
import fetchOrThrow from '../util/fetchOrThrow';

const useDeviceDailyRoute = (deviceId, active) => {
  const [positions, setPositions] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadRoute = useCatchCallback(async () => {
    setLoading(true);
    try {
      const to = dayjs();
      const from = to.startOf('day');
      const query = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
      query.append('deviceId', deviceId);
      const response = await fetchOrThrow(`/api/positions?${query.toString()}`, {
        headers: { Accept: 'application/json' },
      });
      setPositions(await response.json());
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    if (active && deviceId) {
      loadRoute();
    }
  }, [active, deviceId, loadRoute]);

  return { positions, loading };
};

export default useDeviceDailyRoute;
