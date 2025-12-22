import {
    Drawer, Toolbar, Typography,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useEffect, useState } from 'react';
import {
    List,
    ListItemButton,
    ListItemText,
    Divider,
} from '@mui/material';
import { formatSpeed, formatTime, formatDistance } from '../common/util/formatter';

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
    const [summary, setSummary] = useState([]);
    //const [index, setIndex] = useState(0);
    //const [error, setError] = useState(null);
    const [groupId, setGroupId] = useState(null);
    //console.log('DashBoard params : ', queryParams);

    useEffect(() => {
        if (open) {
            const now = new Date();
            const midnight = new Date(now.setHours(0, 0, 0, 0));
            const from = midnight.toISOString();
            console.log(from);
            const to = new Date().toISOString();

            // Fetch or update dashboard data here using the queryParams
            /*const fetchGroups = async () => {
                try {
                    const groupResponse = await fetch('/api/groups/');
                    if (!groupResponse.ok) throw new Error('Failed to fetch groups');
                    const groups = await groupResponse.json();
                    const groupId = groups[0]?.id;
                    console.log('mainGroup:', groupId);
                    setGroupId(groupId);
                } catch (err) {
                    console.error('Error fetching groups:', err);
                }
            };
            fetchGroups();*/
            //const queryParams = new URLSearchParams({ from, to, groupId }).toString();
            //console.log('trips started');


            const fetchSummary = async () => {
                try {

                    const groupResponse = await fetch('/api/groups/');
                    if (!groupResponse.ok) throw new Error('Failed to fetch groups');
                    const groups = await groupResponse.json();
                    const groupId = groups[0]?.id;
                    console.log('mainGroup:', groupId);
                    setGroupId(groupId);
                    const queryParams = new URLSearchParams({ from, to, groupId }).toString();
                    console.log('DashboardDrawer opened with params:', queryParams);

                    const response = await fetch(`/api/reports/summary?${queryParams}`, {
                        headers: { Accept: 'application/json' },
                    });
                    //console.log(response);
                    console.log('summary ended');
                    //setIndex(0);
                    const summ = await response.json();
                    // Sort alphabetically by deviceName
                    const sortedSummary = summ.sort((a, b) =>
                        a.deviceName.localeCompare(b.deviceName)
                    );
                    setSummary(sortedSummary);
                    console.log('summary', sortedSummary);
                    if (!sortedSummary.length) {
                        throw Error(t('sharedNoData'));
                    }
                } catch (err) {
                    console.error(err);
                    //setError(err.message);
                }
            };
            fetchSummary();
        }
    }, [open]);

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
                <List dense>
                    {summary.map((item, index) => (
                        <div key={index}>
                            <ListItemButton>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    width: '100%',
                                    alignItems: 'center',
                                    padding: '8px 0px',
                                }}>
                                    <Typography variant="body2" fontWeight={500}>
                                        {item.deviceName}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {formatDistance(item.distance, 'km', t)}
                                    </Typography>
                                </div>
                            </ListItemButton>
                            <Divider />
                        </div>
                    ))}
                </List>
            </div>
        </Drawer>
    );



};

export default DashboardDrawer;
