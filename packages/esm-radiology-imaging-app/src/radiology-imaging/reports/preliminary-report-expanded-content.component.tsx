import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, InlineLoading, InlineNotification, SkeletonText, Tag } from '@carbon/react';
import { Edit, MisuseOutline, Renew, TaskApproved } from '@carbon/react/icons';
import {
  ErrorCard,
  formatDate,
  formatDatetime,
  launchWorkspace2,
  parseDate,
  showModal,
  showSnackbar,
} from '@openmrs/esm-framework';
import { approvePreliminaryReport } from '../workspace/preliminary.resource';
import { updateOrderFulfillmentStatus } from '../../resources/hooks/useOrders';
import { useRadiologyPrivileges } from '../../resources/hooks/useRadiologyPrivileges';
import {
  ClinicalHistorySection,
  FindingsSection,
  getDisplayName,
  ImpressionBlock,
  RadiologistEntry,
  ReportHeader,
  useReportPatientData,
} from './report-expanded-content.shared';
import { type Procedure } from '../../types';
import styles from './preliminary-report-expanded-content.scss';

interface PreliminaryReportExpandedContentProps {
  procedure: Procedure;
  mutate: () => void;
  hideHeader?: boolean;
}

const PreliminaryReportExpandedContent: React.FC<PreliminaryReportExpandedContentProps> = ({
  procedure,
  mutate,
  hideHeader = false,
}) => {
  const { t } = useTranslation();
  const { patient, isLoading, error, mrn, dobDisplay } = useReportPatientData(procedure.patient.uuid);
  const [isApproving, setIsApproving] = useState(false);
  const { canApproveReport, canAddPreliminaryReport } = useRadiologyPrivileges();

  if (isLoading) {
    return <SkeletonText paragraph lineCount={4} />;
  }
  if (error) {
    return <ErrorCard error={error} headerTitle={t('errorLoadingPatient', 'Error loading patient')} />;
  }

  const studyDate = procedure.parentOrder.dateActivated
    ? formatDate(parseDate(procedure.parentOrder.dateActivated), { noToday: true })
    : '—';
  const accession = procedure.parentOrder.accessionNumber ?? procedure.parentOrder.orderNumber ?? '—';
  const residentRadiologist = getDisplayName(procedure.preliminaryReportEnteredBy);
  const reportEnteredAt = procedure.preliminaryReportEnteredAt
    ? formatDatetime(parseDate(procedure.preliminaryReportEnteredAt), { noToday: true })
    : null;

  const isRevisionRequested = procedure.status === 'REVISION_REQUESTED';
  const isApproved = procedure.status === 'RESULT_AVAILABLE';

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await updateOrderFulfillmentStatus(procedure.parentOrder.uuid, 'COMPLETED');
      await approvePreliminaryReport(procedure.uuid, procedure.preliminaryReport ?? '');
      showSnackbar({
        title: t('reportApproved', 'Report approved'),
        subtitle: t('reportApprovedSubtitle', 'The preliminary report has been approved and finalized.'),
        kind: 'success',
        isLowContrast: true,
      });
      mutate();
    } catch {
      showSnackbar({ title: t('approveError', 'Failed to approve report'), kind: 'error', isLowContrast: true });
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = () => {
    const dispose = showModal('reject-preliminary-report-modal', {
      procedureUuid: procedure.uuid,
      mutate,
      closeModal: () => dispose(),
    });
  };

  const handleEdit = () => {
    launchWorkspace2('radiology-report-workspace', {
      patientUuid: procedure.patient.uuid,
      orderUuid: procedure.parentOrder.uuid,
      order: procedure.parentOrder,
      procedure,
      mutate,
    });
  };

  return (
    <div className={styles.wrapper}>
      {hideHeader && (
        <ReportHeader
          patient={patient}
          mrn={mrn}
          dobDisplay={dobDisplay}
          studyDate={studyDate}
          accession={accession}
          procedureName={procedure.parentOrder.concept.display}
          tag={
            <Tag type="blue" className={styles.statusTag}>
              {t('preliminary', 'PRELIMINARY')}
            </Tag>
          }
        />
      )}

      <div className={styles.reportCard}>
        {hideHeader && <ClinicalHistorySection procedure={procedure} />}
        <FindingsSection procedure={procedure} />
        {procedure.impressions && <ImpressionBlock impressions={procedure.impressions} />}
        {isRevisionRequested && procedure.revisionComment && (
          <InlineNotification
            kind="warning"
            title={t('revisionRequested', 'Revision requested')}
            subtitle={procedure.revisionComment}
            lowContrast
            hideCloseButton
          />
        )}
        <div className={styles.radiologists}>
          <RadiologistEntry
            label={t('residentRadiologist', 'RESIDENT RADIOLOGIST')}
            name={residentRadiologist}
            timestamp={reportEnteredAt}
          />
        </div>
      </div>

      {!isApproved && (
        <div className={styles.actions}>
          {isRevisionRequested ? (
            canAddPreliminaryReport && (
              <Button kind="secondary" renderIcon={Renew} onClick={handleEdit}>
                {t('editAndResubmit', 'Edit & Resubmit')}
              </Button>
            )
          ) : (
            <>
              {canApproveReport && (
                <Button kind="danger--tertiary" renderIcon={MisuseOutline} onClick={handleReject}>
                  {t('reject', 'Reject')}
                </Button>
              )}
              {canApproveReport && (
                <Button kind="secondary" renderIcon={Edit} onClick={handleEdit}>
                  {t('amendAndFinalize', 'Amend & Finalize')}
                </Button>
              )}
              {canApproveReport && (
                <Button
                  kind="primary"
                  renderIcon={isApproving ? undefined : TaskApproved}
                  onClick={handleApprove}
                  disabled={isApproving}>
                  {isApproving ? (
                    <InlineLoading status="active" description={t('approving', 'Approving...')} />
                  ) : (
                    t('approve', 'Approve')
                  )}
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default PreliminaryReportExpandedContent;
