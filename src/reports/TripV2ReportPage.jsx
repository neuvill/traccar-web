import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ReportFilter from './components/ReportFilter';
import ReportBranding from './components/ReportBranding';
import PageLayout from '../common/components/PageLayout';
import ReportsMenu from './components/ReportsMenu';
import { useCatchCallback } from '../reactHelper';
import useReportStyles from './common/useReportStyles';
import fetchOrThrow from '../common/util/fetchOrThrow';

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const TripV2ReportPage = () => {
  const { classes } = useReportStyles();
  const [, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(false);

  const onShow = useCatchCallback(
    async ({ deviceIds, groupIds, from, to }) => {
      // Drop from/to so the next click triggers a new download and a reload doesn't re-download
      setSearchParams(
        (params) => {
          const newParams = new URLSearchParams(params);
          newParams.delete('from');
          newParams.delete('to');
          return newParams;
        },
        { replace: true },
      );
      const query = new URLSearchParams({ from, to });
      deviceIds.forEach((deviceId) => query.append('deviceId', deviceId));
      groupIds.forEach((groupId) => query.append('groupId', groupId));
      setLoading(true);
      try {
        const response = await fetchOrThrow(`/api/reports/trips-stops/pdf?${query.toString()}`, {
          headers: { Accept: 'application/pdf' },
        });
        downloadBlob(await response.blob(), 'trips-stops.pdf');
      } finally {
        setLoading(false);
      }
    },
    [setSearchParams],
  );

  return (
    <PageLayout menu={<ReportsMenu />} breadcrumbs={['reportTitle', 'reportTripsV2']}>
      <div className={classes.container}>
        <div className={classes.containerMain}>
          <div className={classes.header}>
            <ReportFilter
              onShow={onShow}
              deviceType="multiple"
              loading={loading}
              showTitle="reportGeneratePdf"
            />
            <ReportBranding />
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default TripV2ReportPage;
