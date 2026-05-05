import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  CircularProgress,
  Drawer,
  FormControlLabel,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Radio,
  RadioGroup,
  Toolbar,
  Typography,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import RefreshIcon from '@mui/icons-material/Refresh';
import SpeedIcon from '@mui/icons-material/Speed';
import { formatNotificationTitle, formatSpeed, formatTime } from '../common/util/formatter';
import { useTranslation } from '../common/components/LocalizationProvider';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { useCatchCallback } from '../reactHelper';
import { useAttributePreference } from '../common/util/preferences';

const eventTypes = ['deviceOverspeed', 'alarm'];
const defaultRange = '1h';
const timeRanges = [
  { value: '1h', labelKey: 'eventRangeLastHour' },
  { value: '3h', labelKey: 'eventRangeLastThreeHours' },
  { value: '12h', labelKey: 'eventRangeLastTwelveHours' },
  { value: 'day', labelKey: 'eventRangeAllDay' },
];
const eventTypeLabels = {
  deviceOverspeed: 'eventDeviceOverspeed',
  alarm: 'eventAlarm',
};
const eventColors = {
  alarm: '#d32f2f',
  deviceOverspeed: '#ed6c02',
};
const eventIcons = {
  alarm: NotificationsActiveIcon,
  deviceOverspeed: SpeedIcon,
};
const defaultEventColor = '#9e9e9e';

const getTimeRange = (range) => {
  const to = dayjs();
  switch (range) {
    case '3h':
      return { from: to.subtract(3, 'hour'), to };
    case '12h':
      return { from: to.subtract(12, 'hour'), to };
    case 'day':
      return { from: dayjs().startOf('day'), to };
    default:
      return { from: to.subtract(1, 'hour'), to };
  }
};

const isEventInRange = (event, range) => {
  const eventTime = event.eventTime && dayjs(event.eventTime);
  return eventTime?.isValid() && !eventTime.isBefore(range.from) && !eventTime.isAfter(range.to);
};

const getEventKey = (event) =>
  event.id || `${event.deviceId}-${event.type}-${event.eventTime}-${event.positionId || 0}`;

const getDeviceColor = (deviceGroup) => {
  if (deviceGroup.typeGroups.has('alarm')) {
    return eventColors.alarm;
  }
  if (deviceGroup.typeGroups.has('deviceOverspeed')) {
    return eventColors.deviceOverspeed;
  }
  return defaultEventColor;
};

const formatEventDetails = (event, speedUnit, t) => {
  if (event.type === 'deviceOverspeed' && event.attributes?.speed != null) {
    return formatSpeed(event.attributes.speed, speedUnit, t);
  }
  return null;
};

const useStyles = makeStyles()((theme) => ({
  drawer: {
    width: theme.dimensions.eventsDrawerWidth,
  },
  drawerPaper: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
    width: theme.dimensions.eventsDrawerWidth,
  },
  toolbar: {
    paddingLeft: theme.spacing(2),
    paddingRight: theme.spacing(2),
  },
  rangeSelector: {
    padding: theme.spacing(0, 2, 1),
    gap: theme.spacing(0.25),
    '& .MuiFormControlLabel-root': {
      marginRight: theme.spacing(0.5),
    },
    '& .MuiFormControlLabel-label': {
      fontSize: theme.typography.caption.fontSize,
    },
  },
  title: {
    flexGrow: 1,
  },
  loading: {
    justifyContent: 'center',
    gap: theme.spacing(1),
    padding: theme.spacing(2),
  },
  accordionRoot: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    width: theme.dimensions.eventsDrawerWidth,
    '& .MuiAccordion-root': {
      boxShadow: 'none',
      '&:before': {
        display: 'none',
      },
    },
  },
  deviceAccordion: {
    borderTop: `1px solid ${theme.palette.divider}`,
  },
  deviceSummary: {
    minHeight: 56,
    backgroundColor: theme.palette.action.hover,
    paddingLeft: theme.spacing(1.5),
    paddingRight: theme.spacing(1),
    '&:hover': {
      backgroundColor: theme.palette.action.selected,
    },
    '& .MuiAccordionSummary-content': {
      margin: theme.spacing(1, 0),
      minWidth: 0,
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing(1),
    },
  },
  typeAccordion: {
    margin: 0,
  },
  typeSummary: {
    minHeight: 44,
    backgroundColor: theme.palette.background.default,
    paddingLeft: theme.spacing(2.5),
    paddingRight: theme.spacing(1),
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
    '& .MuiAccordionSummary-content': {
      margin: theme.spacing(0.5, 0),
      minWidth: 0,
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing(1),
    },
  },
  details: {
    padding: 0,
  },
  eventItem: {
    position: 'relative',
    borderBottom: `1px solid ${theme.palette.divider}`,
    paddingLeft: theme.spacing(1.5),
    paddingRight: theme.spacing(1),
  },
  eventItemNew: {
    backgroundColor: 'rgba(211, 47, 47, 0.06)',
  },
  eventContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(0.5),
    minWidth: 0,
    width: '100%',
  },
  eventMain: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing(1),
    minWidth: 0,
    width: '100%',
  },
  eventTitle: {
    display: 'flex',
    alignItems: 'center',
    minWidth: 0,
    fontWeight: 600,
  },
  eventTime: {
    display: 'flex',
    alignItems: 'center',
    color: theme.palette.text.secondary,
    flexShrink: 0,
    fontWeight: 500,
  },
  eventDetails: {
    display: 'flex',
    alignItems: 'center',
    color: theme.palette.text.secondary,
  },
  eventIcon: {
    marginRight: theme.spacing(0.5),
    flexShrink: 0,
  },
  summaryText: {
    display: 'flex',
    alignItems: 'center',
    minWidth: 0,
  },
  summaryLabel: {
    minWidth: 0,
    fontWeight: 600,
  },
  deviceIcon: {
    color: theme.palette.text.secondary,
    marginRight: theme.spacing(0.75),
    flexShrink: 0,
  },
  countPill: {
    borderRadius: 6,
    padding: theme.spacing(0.25, 0.75),
    backgroundColor: theme.palette.action.selected,
    color: theme.palette.text.secondary,
    fontSize: theme.typography.caption.fontSize,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  summaryBadges: {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
    gap: theme.spacing(0.5),
  },
  newPill: {
    minWidth: 18,
    borderRadius: 6,
    padding: theme.spacing(0.25, 0.6),
    backgroundColor: theme.palette.error.main,
    color: theme.palette.error.contrastText,
    fontSize: theme.typography.caption.fontSize,
    fontWeight: 700,
    lineHeight: 1.3,
    textAlign: 'center',
  },
  newDot: {
    position: 'absolute',
    top: theme.spacing(0.75),
    right: theme.spacing(0.75),
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: theme.palette.error.main,
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
  },
}));

const EventsDrawer = ({ open, onClose }) => {
  const { classes } = useStyles();
  const navigate = useNavigate();
  const t = useTranslation();
  const speedUnit = useAttributePreference('speedUnit');

  const devices = useSelector((state) => state.devices.items);

  const events = useSelector((state) => state.events.items);
  const [reportEvents, setReportEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState(defaultRange);
  const [acknowledgedEventKeys, setAcknowledgedEventKeys] = useState(() => new Set());

  const formatType = (event) =>
    formatNotificationTitle(t, {
      type: event.type,
      attributes: {
        alarms: event.attributes?.alarm,
      },
    });

  const loadReportEvents = useCatchCallback(async (rangeValue = defaultRange) => {
    const range = getTimeRange(rangeValue);
    const query = new URLSearchParams({
      from: range.from.toISOString(),
      to: range.to.toISOString(),
    });
    eventTypes.forEach((type) => query.append('type', type));

    setLoading(true);
    setReportEvents([]);
    try {
      const response = await fetchOrThrow(`/api/reports/events?${query.toString()}`, {
        headers: { Accept: 'application/json' },
      });
      setReportEvents(await response.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setTimeRange(defaultRange);
      loadReportEvents(defaultRange);
    }
  }, [open, loadReportEvents]);

  const onTimeRangeChange = (event) => {
    const value = event.target.value;
    setTimeRange(value);
    loadReportEvents(value);
  };

  const groupedEvents = useMemo(() => {
    const range = getTimeRange(timeRange);
    const eventMap = new Map();
    [
      ...reportEvents.map((event) => ({ ...event, isNewEvent: false })),
      ...events.map((event) => ({
        ...event,
        isNewEvent: !acknowledgedEventKeys.has(getEventKey(event)),
      })),
    ]
      .filter((event) => eventTypes.includes(event.type))
      .filter((event) => isEventInRange(event, range))
      .forEach((event) => eventMap.set(getEventKey(event), event));

    const deviceGroups = new Map();
    Array.from(eventMap.values())
      .sort((a, b) => dayjs(b.eventTime).valueOf() - dayjs(a.eventTime).valueOf())
      .forEach((event) => {
        const deviceId = event.deviceId || 0;
        if (!deviceGroups.has(deviceId)) {
          deviceGroups.set(deviceId, {
            deviceId,
            events: [],
            newCount: 0,
            typeGroups: new Map(),
          });
        }

        const deviceGroup = deviceGroups.get(deviceId);
        deviceGroup.events.push(event);
        if (event.isNewEvent) {
          deviceGroup.newCount += 1;
        }

        if (!deviceGroup.typeGroups.has(event.type)) {
          deviceGroup.typeGroups.set(event.type, []);
        }
        deviceGroup.typeGroups.get(event.type).push(event);
      });

    return Array.from(deviceGroups.values()).sort((a, b) => a.deviceId - b.deviceId);
  }, [acknowledgedEventKeys, events, reportEvents, timeRange]);

  const acknowledgeEvents = useCallback((items) => {
    setAcknowledgedEventKeys((prev) => {
      const next = new Set(prev);
      items.forEach((event) => next.add(getEventKey(event)));
      return next;
    });
  }, []);

  const formatDeviceTitle = useCallback(
    (deviceId) => {
      const name = devices[deviceId]?.name;
      return name || 'Unknown device';
    },
    [devices],
  );

  const eventLabel = t('reportEvents').toLowerCase();
  const totalEvents = groupedEvents.reduce(
    (total, deviceGroup) => total + deviceGroup.events.length,
    0,
  );

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          className: classes.drawerPaper,
        },
      }}
    >
      <Toolbar className={classes.toolbar} disableGutters>
        <Typography variant="h6" className={classes.title}>
          {t('reportEvents')} ({totalEvents})
        </Typography>
        <IconButton
          size="small"
          color="inherit"
          onClick={() => loadReportEvents(timeRange)}
          title="Refresh"
        >
          <RefreshIcon fontSize="small" />
        </IconButton>
      </Toolbar>
      <RadioGroup
        row
        className={classes.rangeSelector}
        value={timeRange}
        onChange={onTimeRangeChange}
      >
        {timeRanges.map(({ value, labelKey }) => (
          <FormControlLabel
            key={value}
            value={value}
            control={<Radio size="small" />}
            label={t(labelKey)}
          />
        ))}
      </RadioGroup>
      <div className={classes.accordionRoot}>
        {loading && (
          <List dense className={classes.drawer}>
            <ListItem className={classes.loading}>
              <CircularProgress size={20} />
              <Typography variant="body2">{t('sharedLoading')}</Typography>
            </ListItem>
          </List>
        )}
        {!loading && !groupedEvents.length && (
          <List dense className={classes.drawer}>
            <ListItem>
              <ListItemText primary={t('sharedNoData')} />
            </ListItem>
          </List>
        )}
        {!loading &&
          groupedEvents.map((deviceGroup) => (
            <Accordion
              key={deviceGroup.deviceId}
              className={classes.deviceAccordion}
              disableGutters
            >
              <AccordionSummary
                className={classes.deviceSummary}
                expandIcon={<ExpandMoreIcon fontSize="small" />}
                sx={{ borderLeft: `4px solid ${getDeviceColor(deviceGroup)}` }}
              >
                <div className={classes.summaryText}>
                  <DirectionsCarIcon className={classes.deviceIcon} fontSize="small" />
                  <Typography variant="subtitle2" className={classes.summaryLabel} noWrap>
                    {formatDeviceTitle(deviceGroup.deviceId)}
                  </Typography>
                </div>
                <span className={classes.summaryBadges}>
                  {!!deviceGroup.newCount && (
                    <span className={classes.newPill}>{deviceGroup.newCount}</span>
                  )}
                  <span className={classes.countPill}>
                    {deviceGroup.events.length} {eventLabel}
                  </span>
                </span>
              </AccordionSummary>
              <AccordionDetails className={classes.details}>
                {eventTypes.map((type) => {
                  const typeEvents = deviceGroup.typeGroups.get(type) || [];
                  if (!typeEvents.length) {
                    return null;
                  }
                  const eventColor = eventColors[type] || defaultEventColor;
                  const TypeIcon = eventIcons[type] || NotificationsActiveIcon;
                  const newCount = typeEvents.filter((event) => event.isNewEvent).length;
                  return (
                    <Accordion
                      key={`${deviceGroup.deviceId}-${type}`}
                      className={classes.typeAccordion}
                      disableGutters
                      defaultExpanded={deviceGroup.typeGroups.size === 1}
                    >
                      <AccordionSummary
                        className={classes.typeSummary}
                        expandIcon={<ExpandMoreIcon fontSize="small" />}
                        onClick={() => acknowledgeEvents(typeEvents)}
                        sx={{ borderLeft: `4px solid ${eventColor}` }}
                      >
                        <div className={classes.summaryText}>
                          <TypeIcon
                            className={classes.eventIcon}
                            fontSize="small"
                            sx={{ color: eventColor }}
                          />
                          <Typography
                            variant="body2"
                            className={classes.summaryLabel}
                            sx={{ color: eventColor }}
                            noWrap
                          >
                            {t(eventTypeLabels[type])}
                          </Typography>
                        </div>
                        <span className={classes.summaryBadges}>
                          {!!newCount && <span className={classes.newPill}>{newCount}</span>}
                          <span className={classes.countPill}>
                            {typeEvents.length} {eventLabel}
                          </span>
                        </span>
                      </AccordionSummary>
                      <AccordionDetails className={classes.details}>
                        <List dense disablePadding>
                          {typeEvents.map((event) => {
                            const eventColor = eventColors[event.type] || defaultEventColor;
                            const EventIcon = eventIcons[event.type] || NotificationsActiveIcon;
                            const details = formatEventDetails(event, speedUnit, t);

                            return (
                              <ListItemButton
                                key={getEventKey(event)}
                                className={`${classes.eventItem} ${
                                  event.isNewEvent ? classes.eventItemNew : ''
                                }`}
                                sx={{ borderLeft: `4px solid ${eventColor}` }}
                                onClick={() => navigate(`/event/${event.id}`)}
                                disabled={!event.id}
                              >
                                {event.isNewEvent && <span className={classes.newDot} />}
                                <div className={classes.eventContent}>
                                  <div className={classes.eventMain}>
                                    <Typography
                                      variant="body2"
                                      className={classes.eventTitle}
                                      sx={{ color: eventColor }}
                                      noWrap
                                    >
                                      <EventIcon className={classes.eventIcon} fontSize="small" />
                                      {formatType(event)}
                                    </Typography>
                                    <Typography variant="body2" className={classes.eventTime}>
                                      <AccessTimeRoundedIcon
                                        className={classes.eventIcon}
                                        fontSize="small"
                                      />
                                      {formatTime(event.eventTime, 'time')}
                                    </Typography>
                                  </div>
                                  {details && (
                                    <Typography variant="body2" className={classes.eventDetails}>
                                      {details}
                                    </Typography>
                                  )}
                                </div>
                              </ListItemButton>
                            );
                          })}
                        </List>
                      </AccordionDetails>
                    </Accordion>
                  );
                })}
              </AccordionDetails>
            </Accordion>
          ))}
      </div>
    </Drawer>
  );
};

export default EventsDrawer;
