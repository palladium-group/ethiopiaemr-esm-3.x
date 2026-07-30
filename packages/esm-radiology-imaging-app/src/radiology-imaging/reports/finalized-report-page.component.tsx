import React from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, InlineLoading } from '@carbon/react';
import { ArrowLeft, Printer } from '@carbon/react/icons';
import { EmptyCard, ErrorCard, navigate, restBaseUrl, showModal } from '@openmrs/esm-framework';
import { useProcedure } from '../../resources/hooks/useProcedures';
import FinalizedReportExpandedContent from './finalized-report-expanded-content.component';
import styles from './finalized-report-page.scss';

const FinalizedReportPage: React.FC = () => {
  const { t } = useTranslation();
  const { procedureUuid } = useParams<{ procedureUuid: string }>();
  const { procedure, isLoading, error } = useProcedure(procedureUuid ?? '');

  const handleBack = () => navigate({ to: `${globalThis.spaBase}/radiology-imaging/finalized-report` });

  const handlePrint = () => {
    const dispose = showModal('print-preview-modal', {
      onClose: () => dispose(),
      title: t('imagingReport', 'Imaging Report'),
      documentUrl: `/openmrs${restBaseUrl}/orderexpansion/imagingReport?procedureUuid=${procedureUuid}`,
    });
  };

  if (isLoading) {
    return (
      <InlineLoading
        status="active"
        description={t('loadingReport', 'Loading report...')}
        iconDescription={t('loading', 'Loading')}
      />
    );
  }

  if (error) {
    return <ErrorCard error={error} headerTitle={t('errorLoadingReport', 'Error loading report')} />;
  }

  if (!procedure) {
    return (
      <EmptyCard
        headerTitle={t('reportNotFound', 'Report not found')}
        displayText={t('reportNotFoundDescription', 'The finalized report you are looking for does not exist.')}
      />
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.actions}>
          <Button kind="tertiary" renderIcon={ArrowLeft} onClick={handleBack}>
            {t('backToReports', 'Back to Reports')}
          </Button>
        </div>
        <div>
          <Button renderIcon={Printer} kind="secondary" onClick={handlePrint}>
            {t('printReport', 'Print Report')}
          </Button>
        </div>
      </div>
      <div className={styles.content}>
        <FinalizedReportExpandedContent procedure={procedure} />
      </div>
    </div>
  );
};

export default FinalizedReportPage;
