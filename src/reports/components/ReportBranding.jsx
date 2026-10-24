import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Accordion, AccordionDetails, AccordionSummary, Button, Typography } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTranslation } from '../../common/components/LocalizationProvider';
import FileInput from '../../common/components/FileInput';
import { useRestriction } from '../../common/util/permissions';
import { useCatch } from '../../reactHelper';
import fetchOrThrow from '../../common/util/fetchOrThrow';

const MAX_IMAGE_SIZE = 500 * 1024;
const IMAGE_TYPES = ['image/png', 'image/jpeg'];

const useStyles = makeStyles()((theme) => ({
  details: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
  },
  slots: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(3),
  },
  slot: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
    flex: `1 1 ${theme.dimensions.filterFormWidth}`,
    minWidth: 0,
  },
  preview: {
    height: 96,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(1),
    border: `1px dashed ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.action.hover,
  },
  image: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
  },
  actions: {
    display: 'flex',
    gap: theme.spacing(1),
    alignItems: 'center',
    '& > :first-of-type': {
      flexGrow: 1,
    },
  },
}));

const BrandingSlot = ({ userId, slot, title, emptyText, readonly }) => {
  const { classes } = useStyles();
  const t = useTranslation();

  const [version, setVersion] = useState(() => Date.now());
  const [present, setPresent] = useState(null);

  const url = `/api/users/${userId}/image/${slot}`;

  const handleUpload = useCatch(async (file) => {
    if (!file) {
      return;
    }
    if (!IMAGE_TYPES.includes(file.type)) {
      throw Error(t('reportBrandingInvalidType'));
    }
    if (file.size > MAX_IMAGE_SIZE) {
      throw Error(t('reportBrandingTooLarge'));
    }
    await fetchOrThrow(url, { method: 'POST', body: file });
    setPresent(null);
    setVersion(Date.now());
  });

  const handleRemove = useCatch(async () => {
    await fetchOrThrow(url, { method: 'DELETE' });
    setPresent(false);
    setVersion(Date.now());
  });

  return (
    <div className={classes.slot}>
      <Typography variant="subtitle2">{title}</Typography>
      <div className={classes.preview}>
        <img
          key={version}
          src={`${url}?t=${version}`}
          alt={title}
          className={classes.image}
          style={present ? undefined : { display: 'none' }}
          onLoad={() => setPresent(true)}
          onError={() => setPresent(false)}
        />
        {present === false && (
          <Typography variant="body2" color="textSecondary" align="center">
            {emptyText}
          </Typography>
        )}
      </div>
      {!readonly && (
        <div className={classes.actions}>
          <FileInput
            placeholder={t('sharedUpload')}
            value={null}
            onChange={handleUpload}
            slotProps={{ htmlInput: { accept: IMAGE_TYPES.join(',') } }}
          />
          <Button color="error" disabled={!present} onClick={handleRemove}>
            {t('sharedRemove')}
          </Button>
        </div>
      )}
    </div>
  );
};

const ReportBranding = () => {
  const { classes } = useStyles();
  const t = useTranslation();

  const userId = useSelector((state) => state.session.user.id);
  const readonly = useRestriction('readonly');

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle1">{t('reportBranding')}</Typography>
      </AccordionSummary>
      <AccordionDetails className={classes.details}>
        <div className={classes.slots}>
          <BrandingSlot
            userId={userId}
            slot="logo"
            title={t('reportBrandingLogo')}
            emptyText={t('reportBrandingNoLogo')}
            readonly={readonly}
          />
          <BrandingSlot
            userId={userId}
            slot="stamp"
            title={t('reportBrandingStamp')}
            emptyText={t('reportBrandingNoStamp')}
            readonly={readonly}
          />
        </div>
        {!readonly && (
          <Typography variant="body2" color="textSecondary">
            {t('reportBrandingHint')}
          </Typography>
        )}
      </AccordionDetails>
    </Accordion>
  );
};

export default ReportBranding;
