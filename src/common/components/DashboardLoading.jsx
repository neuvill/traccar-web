import { Box, CircularProgress, Typography } from '@mui/material';

const DashboardLoading = ({ text = 'Loading dashboard data…' }) => (
    <Box
        sx={{
            height: '100%',
            minHeight: 200,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
        }}
    >
        <CircularProgress size={36} />
        <Typography variant="body2" color="text.secondary">
            {text}
        </Typography>
    </Box>
);

export default DashboardLoading;
