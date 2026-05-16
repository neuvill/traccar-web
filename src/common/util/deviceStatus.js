import dayjs from 'dayjs';

export const STALE_HOURS = 3;

const getValidDate = (value) => {
  if (!value) {
    return null;
  }

  const date = dayjs(value);
  return date.isValid() ? date : null;
};

export const getDeviceFreshness = (device, position, now = Date.now()) => {
  const currentTime = dayjs(now);
  const lastUpdate = getValidDate(device?.lastUpdate);
  const fixTime = getValidDate(position?.fixTime);
  const deviceTime = getValidDate(position?.deviceTime);
  const serverTime = getValidDate(position?.serverTime);

  // Prefer the most recent actual GPS fix when deciding whether location data is stale.
  const staleReferenceTime = fixTime || deviceTime || serverTime || lastUpdate;
  const isStale = staleReferenceTime
    ? currentTime.diff(staleReferenceTime, 'hour', true) > STALE_HOURS
    : false;

  return {
    isStale,
    staleReferenceTime,
  };
};

export const getDeviceMotionStatus = (device, position, now = Date.now()) => {
  const { isStale } = getDeviceFreshness(device, position, now);
  return isStale ? 'still' : position?.attributes?.motionStatus || 'default';
};
