import { useTheme } from '@mui/material/styles';
import { Box, Tooltip } from '@mui/material';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const polarPoint = (cx, cy, r, angleDeg) => {
  const angleRad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy - r * Math.sin(angleRad),
  };
};

const CX = 50;
const CY = 50;
const R = 38;
const DANGER_ZONE_ANGLE = 27;

const FuelGauge = ({ value, size = 56, label }) => {
  const theme = useTheme();
  const level = clamp(Number(value) || 0, 0, 100);

  const trackColor = theme.palette.mode === 'dark' ? '#555' : '#dcdcdc';
  const needleColor =
    level <= 15
      ? theme.palette.error.main
      : level <= 30
        ? theme.palette.warning.main
        : theme.palette.success.main;

  const left = polarPoint(CX, CY, R, 180);
  const right = polarPoint(CX, CY, R, 0);
  const dangerEnd = polarPoint(CX, CY, R, 180 - DANGER_ZONE_ANGLE);
  const needleAngle = 180 - (level / 100) * 180;
  const needleTip = polarPoint(CX, CY, R - 8, needleAngle);

  return (
    <Tooltip title={label ? `${label}: ${Math.round(level)}%` : `${Math.round(level)}%`}>
      <Box sx={{ width: size, height: size * 0.62, lineHeight: 0 }}>
        <svg viewBox="0 0 100 62" width="100%" height="100%">
          <path
            d={`M ${left.x} ${left.y} A ${R} ${R} 0 0 1 ${right.x} ${right.y}`}
            fill="none"
            stroke={trackColor}
            strokeWidth={7}
            strokeLinecap="round"
          />
          <path
            d={`M ${left.x} ${left.y} A ${R} ${R} 0 0 1 ${dangerEnd.x} ${dangerEnd.y}`}
            fill="none"
            stroke={theme.palette.error.main}
            strokeWidth={7}
            strokeLinecap="round"
            opacity={0.45}
          />
          <text
            x={left.x}
            y={CY + 11}
            fontSize="9"
            fill={theme.palette.text.secondary}
            textAnchor="middle"
          >
            E
          </text>
          <text
            x={right.x}
            y={CY + 11}
            fontSize="9"
            fill={theme.palette.text.secondary}
            textAnchor="middle"
          >
            F
          </text>
          <line
            x1={CX}
            y1={CY}
            x2={needleTip.x}
            y2={needleTip.y}
            stroke={needleColor}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          <circle cx={CX} cy={CY} r={3.5} fill={needleColor} />
        </svg>
      </Box>
    </Tooltip>
  );
};

export default FuelGauge;
