import { useMemo } from 'react';
import { useSelector } from 'react-redux';

// Speeds are in knots; ~1 knot (1.85 km/h) absorbs GPS jitter around the limit
const OVERSPEED_TOLERANCE = 1;

const parseLimit = (value) => {
  const limit = Number(value);
  return Number.isFinite(limit) && limit > 0 ? limit : null;
};

// Same lookup order as the server: device, group chain, server
export const useSpeedLimit = (device) => {
  const groups = useSelector((state) => state.groups.items);
  const serverLimit = useSelector((state) => state.session.server?.attributes?.speedLimit);

  return useMemo(() => {
    const deviceLimit = parseLimit(device?.attributes?.speedLimit);
    if (deviceLimit) {
      return deviceLimit;
    }
    const visited = new Set();
    let groupId = device?.groupId;
    while (groupId && !visited.has(groupId)) {
      visited.add(groupId);
      const group = groups[groupId];
      const groupLimit = parseLimit(group?.attributes?.speedLimit);
      if (groupLimit) {
        return groupLimit;
      }
      groupId = group?.groupId;
    }
    return parseLimit(serverLimit);
  }, [device?.attributes?.speedLimit, device?.groupId, groups, serverLimit]);
};

export const isOverspeed = (speed, speedLimit) =>
  Boolean(speedLimit) && Number(speed) > speedLimit + OVERSPEED_TOLERANCE;
