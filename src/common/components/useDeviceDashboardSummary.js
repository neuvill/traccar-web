import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useCatchCallback } from '../../reactHelper';
import fetchOrThrow from '../util/fetchOrThrow';
import { formatDistance, formatSpeed, formatVolume } from '../util/formatter';

const useDeviceDashboardSummary = (
  deviceId,
  active,
  { distanceUnit, speedUnit, volumeUnit, t },
) => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadDashboard = useCatchCallback(async () => {
    setLoading(true);
    try {
      const to = dayjs();
      const from = to.startOf('day');
      const query = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
      query.append('deviceId', deviceId);
      const summaryQuery = new URLSearchParams(query);
      summaryQuery.append('daily', false);
      const [summaryResponse, tripsResponse, stopsResponse] = await Promise.all([
        fetchOrThrow(`/api/reports/summary?${summaryQuery.toString()}`, {
          headers: { Accept: 'application/json' },
        }),
        fetchOrThrow(`/api/reports/trips?${query.toString()}`, {
          headers: { Accept: 'application/json' },
        }),
        fetchOrThrow(`/api/reports/stops?${query.toString()}`, {
          headers: { Accept: 'application/json' },
        }),
      ]);
      const [summary, trips, stops] = await Promise.all([
        summaryResponse.json(),
        tripsResponse.json(),
        stopsResponse.json(),
      ]);
      setReport({ summary: summary[0] || null, trips, stops });
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    if (active && deviceId) {
      loadDashboard();
    }
  }, [active, deviceId, loadDashboard]);

  const stats = useMemo(() => {
    if (!report) {
      return null;
    }
    const { summary, trips, stops } = report;
    const movingMs = trips.reduce((sum, trip) => sum + (trip.duration || 0), 0);
    const idlingMs = stops.reduce((sum, stop) => sum + (stop.engineHours || 0), 0);
    const parkedMs = stops.reduce(
      (sum, stop) => sum + Math.max((stop.duration || 0) - (stop.engineHours || 0), 0),
      0,
    );
    return {
      distance: summary ? formatDistance(summary.distance, distanceUnit, t) : null,
      averageSpeed:
        summary?.averageSpeed > 0 ? formatSpeed(summary.averageSpeed, speedUnit, t) : null,
      maxSpeed: summary?.maxSpeed > 0 ? formatSpeed(summary.maxSpeed, speedUnit, t) : null,
      spentFuel: summary?.spentFuel > 0 ? formatVolume(summary.spentFuel, volumeUnit, t) : null,
      trips: trips.length,
      stops: stops.length,
      motionPieData: [
        { id: 'moving', label: t('motionStatusMoving'), value: movingMs, color: '#27cb46' },
        { id: 'idling', label: t('motionStatusIdle'), value: idlingMs, color: '#00b5e2' },
        { id: 'parked', label: t('motionStatusParked'), value: parkedMs, color: '#ed2736' },
      ].filter((entry) => entry.value > 0),
    };
  }, [report, distanceUnit, speedUnit, volumeUnit, t]);

  return { stats, loading };
};

export default useDeviceDashboardSummary;
