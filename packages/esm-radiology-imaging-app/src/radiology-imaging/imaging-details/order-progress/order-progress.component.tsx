import React from 'react';
import { ProgressIndicator, ProgressStep } from '@carbon/react';
import styles from './order-progress.scss';
import type { RadiologyOrder } from '../../types';
import { formatDatetime, parseDate } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';

type OrderProgressProps = {
  order: RadiologyOrder;
};

const OrderProgress: React.FC<OrderProgressProps> = ({ order }) => {
  const { t } = useTranslation();

  const { fulfillerStatus, fulfillerComment, scheduledDate, dateActivated, procedures } = order;
  const procedure = procedures?.[0];

  const hasPreliminaryReport = Boolean(procedure?.preliminaryReport);
  const hasFinalReport = procedure?.reportType === 'FINAL' || Boolean(procedure?.procedureReport);
  const isImageAcquired =
    fulfillerStatus === 'IN_PROGRESS' && Boolean(fulfillerComment?.toLowerCase().includes('images acquired'));
  const isComplete = fulfillerStatus === 'COMPLETED' && hasFinalReport;
  const isRevisionRequested = procedure?.status === 'REVISION_REQUESTED';

  // currentIndex = 5 puts all 5 steps (0-4) into "complete" state in Carbon's ProgressIndicator
  let currentIndex: number;
  if (isComplete) {
    currentIndex = 5;
  } else if (hasPreliminaryReport || isRevisionRequested) {
    currentIndex = 3;
  } else if (fulfillerStatus === 'IN_PROGRESS') {
    currentIndex = 2;
  } else if (scheduledDate) {
    currentIndex = 1;
  } else {
    currentIndex = 0;
  }

  const prelimSecondaryLabel = hasPreliminaryReport
    ? isComplete
      ? procedure?.preliminaryReportEnteredAt
        ? formatDatetime(parseDate(procedure.preliminaryReportEnteredAt), { noToday: true })
        : undefined
      : t('awaitingFinalReport', 'Awaiting final report')
    : undefined;

  const completedSecondaryLabel =
    isComplete && procedure?.preliminaryReportApprovedAt
      ? formatDatetime(parseDate(procedure.preliminaryReportApprovedAt), { noToday: true })
      : undefined;

  return (
    <div className={styles.orderProgress}>
      <ProgressIndicator spaceEqually currentIndex={currentIndex}>
        <ProgressStep
          label={t('ordered', 'Ordered')}
          secondaryLabel={formatDatetime(parseDate(dateActivated), { noToday: true })}
        />
        <ProgressStep
          label={t('scheduled', 'Scheduled')}
          secondaryLabel={scheduledDate ? formatDatetime(parseDate(scheduledDate), { noToday: true }) : undefined}
        />
        <ProgressStep
          label={t('inProgress', 'In Progress')}
          secondaryLabel={
            isImageAcquired ? t('imageAcquired', 'Image acquired') : t('acquiringImage', 'Acquiring image')
          }
        />
        <ProgressStep
          label={t('preliminaryReport', 'Preliminary Report')}
          secondaryLabel={isRevisionRequested ? t('revisionRequested', 'Revision requested') : prelimSecondaryLabel}
          invalid={isRevisionRequested}
        />
        <ProgressStep label={t('completed', 'Completed')} secondaryLabel={completedSecondaryLabel} />
      </ProgressIndicator>
    </div>
  );
};

export default OrderProgress;
