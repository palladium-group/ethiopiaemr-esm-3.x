import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useOrder } from '../../resources/hooks/useOrders';
import { Button, InlineLoading, InlineNotification, Tag } from '@carbon/react';
import { ArrowLeft, Calendar, CheckmarkFilled, Play } from '@carbon/react/icons';
import styles from './imaging-details.scss';
import OrderProgress from './order-progress/order-progress.component';
import { EmptyCard, ErrorCard, launchWorkspace2, restBaseUrl } from '@openmrs/esm-framework';
import PatientCard from '../../components/patient-card/patient-card.component';
import ClinicalHistory from './clinical-history/clinical-history.component';
import ImagingSeriesPanel from './imaging-series/imaging-series-panel.component';
import { useSendToWorklist } from '../../resources/hooks/useSendToWorklist';
import { useOrderPaymentStatus } from '../../resources/hooks/useOrderPaymentStatus';
import { useSWRConfig } from 'swr';
import PreliminaryReportExpandedContent from '../reports/preliminary-report-expanded-content.component';
import { useRadiologyPrivileges } from '../../resources/hooks/useRadiologyPrivileges';
import { useScheduleAppointment } from '../../resources/hooks/useScheduleAppointment';

const ImagingDetails: React.FC = () => {
  const { t } = useTranslation();
  const { orderUuid } = useParams<{ orderUuid: string }>();
  const mutate = useSWRConfig().mutate;
  const navigate = useNavigate();
  const { order, isLoading, error, mutate: orderMutate } = useOrder(orderUuid ?? '');
  const { sendToWorklist, isSending } = useSendToWorklist(() =>
    mutate((key) => typeof key === 'string' && key.startsWith(`${restBaseUrl}/order/${orderUuid}`), undefined, {
      revalidate: true,
    }),
  );
  const {
    canStartExam: hasStartExamPrivilege,
    canAddPreliminaryReport,
    canScheduleAppointment,
  } = useRadiologyPrivileges();
  const {
    isLoading: isPaymentLoading,
    error: paymentStatusError,
    paymentStatus,
    isUnpaid,
    hasPaymentStatusError,
    canCreateWorklist,
  } = useOrderPaymentStatus(orderUuid);
  const { scheduleAppointment, isScheduling } = useScheduleAppointment(() => {
    orderMutate();
    mutate((key) => typeof key === 'string' && key.startsWith(`${restBaseUrl}/order`), undefined, {
      revalidate: true,
    });
  });

  const handleAddPreliminaryReport = () => {
    launchWorkspace2('radiology-report-workspace', {
      patientUuid: order?.patient?.uuid,
      orderUuid: order?.uuid,
      order: order,
      mutate: orderMutate,
    });
  };

  if (isLoading) {
    return (
      <InlineLoading
        aria-live="assertive"
        description="Loading"
        iconDescription="Loading data..."
        onSuccess={function Kbe() {}}
        status="active"
      />
    );
  }

  if (error) {
    return <ErrorCard error={error} headerTitle={t('errorLoadingRadiologyOrder', 'Error loading radiology order')} />;
  }

  if (!order) {
    return (
      <EmptyCard
        headerTitle={t('orderNotFound', 'Order not found')}
        displayText={t('orderNotFoundDescription', 'The order you are looking for does not exist.')}
      />
    );
  }

  const isInProgress = order.fulfillerStatus === 'IN_PROGRESS';
  const showStartExam = !order.fulfillerStatus || isInProgress;
  const isImageAcquired = order.fulfillerComment?.toLowerCase().includes('images acquired');
  const startExamIcon = isInProgress ? CheckmarkFilled : Play;
  const hasPreliminaryOrFinalizedReport = order.procedures.some(
    (procedure) => procedure.preliminaryReport || procedure.procedureReport,
  );
  const hasPreliminaryReport = order.procedures.some((procedure) => procedure.preliminaryReport);
  const canShowScheduleActions =
    canScheduleAppointment && order.fulfillerStatus !== 'IN_PROGRESS' && order.fulfillerStatus !== 'COMPLETED';
  const showScheduleButton = canShowScheduleActions && !order.scheduledDate;
  const showRescheduleButton = canShowScheduleActions && Boolean(order.scheduledDate);
  const paymentBlocksStartExam = !isInProgress && (isPaymentLoading || isUnpaid || hasPaymentStatusError);
  const showUnpaidNotification = showStartExam && hasStartExamPrivilege && isUnpaid;
  const showPaymentStatusError = showStartExam && hasStartExamPrivilege && hasPaymentStatusError;
  const paymentStatusNormalized = paymentStatus?.toUpperCase();
  const paymentTagType =
    paymentStatusNormalized === 'PAID' ? 'green' : paymentStatusNormalized === 'EXEMPTED' ? 'blue' : 'red';
  const paymentTagLabel =
    paymentStatusNormalized === 'PAID'
      ? t('paid', 'Paid')
      : paymentStatusNormalized === 'EXEMPTED'
      ? t('exempted', 'Exempted')
      : t('unpaid', 'Unpaid');
  const paymentErrorMessage =
    paymentStatusError instanceof Error ? paymentStatusError.message : String(paymentStatusError ?? '');

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.orderDetails}>
          <div className={styles.orderNumber}>
            {t('orderNumber', 'Order Number')}: {order?.orderNumber}
          </div>
          <div className={styles.procedureRow}>
            <div className={styles.radiologyProcedure}>{order?.concept?.display}</div>
            {!isPaymentLoading && !hasPaymentStatusError && (
              <Tag size="sm" type={paymentTagType}>
                {paymentTagLabel}
              </Tag>
            )}
          </div>
        </div>
        <div className={styles.actions}>
          <Button kind="tertiary" renderIcon={ArrowLeft} onClick={() => navigate(-1)}>
            {t('back', 'Back')}
          </Button>
          {showScheduleButton && (
            <Button
              kind="secondary"
              renderIcon={Calendar}
              disabled={isScheduling}
              onClick={() => scheduleAppointment(order)}>
              {t('scheduleAppointment', 'Schedule Appointment')}
            </Button>
          )}
          {showRescheduleButton && (
            <Button
              kind="secondary"
              renderIcon={Calendar}
              disabled={isScheduling}
              onClick={() => scheduleAppointment(order)}>
              {t('rescheduleAppointment', 'Reschedule')}
            </Button>
          )}
          {showStartExam && hasStartExamPrivilege && (
            <Button
              renderIcon={isSending ? undefined : startExamIcon}
              kind="primary"
              onClick={() => sendToWorklist(order)}
              disabled={isSending || isInProgress || paymentBlocksStartExam}
              className={styles.startExamBtn}>
              <span className={isSending ? styles['btnLabel--hidden'] : styles.btnLabel}>
                {isInProgress ? t('activeExam', 'Active Exam') : t('startExam', 'Start Exam')}
              </span>
              {isSending && (
                <span className={styles.btnLoader}>
                  <InlineLoading status="active" iconDescription={t('sendingToWorklist', 'Sending to worklist...')} />
                </span>
              )}
            </Button>
          )}
          {isImageAcquired && !hasPreliminaryOrFinalizedReport && canAddPreliminaryReport && (
            <Button onClick={handleAddPreliminaryReport} kind="secondary">
              {t('addPreliminaryReport', 'Add Preliminary Report')}
            </Button>
          )}
        </div>
      </div>

      {showPaymentStatusError && (
        <InlineNotification
          className={styles.scheduleHint}
          kind="error"
          lowContrast
          hideCloseButton
          subtitle={t(
            'paymentStatusCheckErrorSubtitle',
            'Could not confirm whether this order has been paid. {{errorMessage}}',
            { errorMessage: paymentErrorMessage },
          )}
          title={t('paymentStatusCheckError', 'Failed to verify payment status')}
        />
      )}

      {showUnpaidNotification && (
        <InlineNotification
          className={styles.scheduleHint}
          kind="warning"
          lowContrast
          hideCloseButton
          subtitle={t(
            'paymentRequiredBeforeExamSubtitle',
            'This order cannot be added to the worklist until the bill line item is paid or exempted.',
          )}
          title={t('paymentRequiredBeforeExam', 'Payment required before starting the exam')}
        />
      )}

      {!order.scheduledDate && showStartExam && hasStartExamPrivilege && canCreateWorklist && !isInProgress && (
        <InlineNotification
          className={styles.scheduleHint}
          kind="info"
          lowContrast
          hideCloseButton
          subtitle={t('noAppointmentScheduledHint', 'No appointment scheduled. You can still start the exam.')}
          title={t('schedulingOptional', 'Scheduling optional')}
        />
      )}

      <OrderProgress order={order} />
      <div className={styles.content}>
        <PatientCard patient={order.patient} />
        <ClinicalHistory order={order} />
      </div>
      {hasPreliminaryReport && (
        <PreliminaryReportExpandedContent
          procedure={order.procedures.find((procedure) => procedure.preliminaryReport)}
          mutate={orderMutate}
        />
      )}
      <ImagingSeriesPanel orderNumber={order.orderNumber} />
    </div>
  );
};

export default ImagingDetails;
