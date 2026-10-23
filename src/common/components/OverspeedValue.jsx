import { Tooltip } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { keyframes } from 'tss-react';
import { useTranslation } from './LocalizationProvider';
import { formatSpeed } from '../util/formatter';
import { useAttributePreference } from '../util/preferences';

const blink = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.25; }
`;

const useStyles = makeStyles()((theme) => ({
  overspeed: {
    color: theme.palette.error.main,
    fontWeight: 600,
    animation: `${blink} 1s ease-in-out infinite`,
    '@media (prefers-reduced-motion: reduce)': {
      animation: 'none',
    },
  },
}));

const OverspeedValue = ({ active, speedLimit, children }) => {
  const { classes } = useStyles();
  const t = useTranslation();
  const speedUnit = useAttributePreference('speedUnit');

  if (!active) {
    return children;
  }

  return (
    <Tooltip title={`${t('attributeSpeedLimit')}: ${formatSpeed(speedLimit, speedUnit, t)}`}>
      <span className={classes.overspeed}>{children}</span>
    </Tooltip>
  );
};

export default OverspeedValue;
