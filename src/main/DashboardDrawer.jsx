import {
    Drawer, Toolbar, Typography,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { useTranslation } from '../common/components/LocalizationProvider';

const useStyles = makeStyles()((theme) => ({
    drawer: {
        width: theme.dimensions.eventsDrawerWidth,
    },
    toolbar: {
        paddingLeft: theme.spacing(2),
        paddingRight: theme.spacing(2),
    },
    title: {
        flexGrow: 1,
    },
}));

const DashboardDrawer = ({ open, onClose }) => {
    const { classes } = useStyles();
    const t = useTranslation();

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
        >
            <Toolbar className={classes.toolbar} disableGutters>
                <Typography variant="h6" className={classes.title}>
                    DASHBOARD
                </Typography>
            </Toolbar>

            <div className={classes.drawer}>
                {/* Dashboard content goes here */}

            </div>
        </Drawer>
    );
};

export default DashboardDrawer;
