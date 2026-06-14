import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';

const deviceNameCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

const sortByName = (device1, device2) =>
  deviceNameCollator.compare(device1.name || '', device2.name || '');

export default (
  keyword,
  filter,
  filterSort,
  filterMap,
  positions,
  setFilteredDevices,
  setFilteredPositions,
) => {
  const groups = useSelector((state) => state.groups.items);
  const devices = useSelector((state) => state.devices.items);

  useEffect(() => {
    const filterStatuses = filter?.statuses || [];
    const filterGroups = filter?.groups || [];
    const filterMotionStatuses = filter?.motionStatuses || [];

    const deviceGroups = (device) => {
      const groupIds = [];
      let { groupId } = device;
      while (groupId) {
        groupIds.push(groupId);
        groupId = groups[groupId]?.groupId || 0;
      }
      return groupIds;
    };

    const filtered = Object.values(devices)
      .filter((device) => !filterStatuses.length || filterStatuses.includes(device.status))
      .filter(
        (device) =>
          !filterGroups.length || deviceGroups(device).some((id) => filterGroups.includes(id)),
      )
      .filter(
        (device) =>
          !filter.geofences.length ||
          (positions[device.id]?.geofenceIds || []).some((id) => filter.geofences.includes(id)),
      )
      .filter((device) => {
        if (!filterMotionStatuses.length) return true;

        const position = positions?.[device.id];
        if (!position) return false;

        return filterMotionStatuses.includes(position.attributes?.motionStatus);
      })

      .filter((device) => {
        const lowerCaseKeyword = keyword.toLowerCase();
        return [device.name, device.uniqueId, device.phone, device.model, device.contact].some(
          (s) => s && s.toLowerCase().includes(lowerCaseKeyword),
        );
      });
    switch (filterSort) {
      case 'name':
        filtered.sort(sortByName);
        break;
      case 'lastUpdate':
        filtered.sort((device1, device2) => {
          const time1 = device1.lastUpdate ? dayjs(device1.lastUpdate).valueOf() : 0;
          const time2 = device2.lastUpdate ? dayjs(device2.lastUpdate).valueOf() : 0;
          return time2 - time1;
        });
        break;
      default:
        filtered.sort(sortByName);
        break;
    }
    setFilteredDevices(filtered);
    setFilteredPositions(
      filterMap
        ? filtered.map((device) => positions?.[device.id]).filter(Boolean)
        : Object.values(positions || {}),
    );
  }, [
    keyword,
    filter,
    filterSort,
    filterMap,
    groups,
    devices,
    positions,
    setFilteredDevices,
    setFilteredPositions,
  ]);
};
