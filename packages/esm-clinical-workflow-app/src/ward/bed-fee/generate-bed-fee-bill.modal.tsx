import React, { useCallback, useMemo, useState } from 'react';
import {
  Button,
  ComboBox,
  InlineLoading,
  InlineNotification,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from '@carbon/react';
import { formatDate, parseDate, showSnackbar, useConfig, useSession } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import type { ClinicalWorkflowConfig } from '../../config-schema';
import { useCashPoints } from '../../mru/billing-information/hooks/useCashPoints';
import type { WardAppConfigSlice } from '../admitted-patients/ward.types';
import { useVisitWithEncounters } from '../discharge-confirmation/confirm-discharge.resource';
import { usePatientBills } from '../discharge-in/patient-leave-bed.resource';
import { createBedFeeBill, useBedFeeBillableServices, type BillableService } from './bed-fee.resource';
import {
  findEncounterDatetimeByType,
  formatBedFeeAmount,
  getBedStayWindow,
  getVisitPaymentModeUuid,
  selectServicePrice,
  serviceMatchesBedFeeConcept,
} from './bed-fee.utils';
import styles from './generate-bed-fee-bill.scss';

interface GenerateBedFeeBillModalProps {
  closeModal: () => void;
  patientUuid: string;
  visitUuid: string;
  patientName?: string;
  bedTypeName?: string;
  /** Datetime of the encounter that placed the patient in the ward they are being discharged from. */
  admissionDatetime?: string;
  onBillGenerated?: () => void;
}

const GenerateBedFeeBillModal: React.FC<GenerateBedFeeBillModalProps> = ({
  closeModal,
  patientUuid,
  visitUuid,
  patientName,
  bedTypeName,
  admissionDatetime,
  onBillGenerated,
}) => {
  const { t } = useTranslation();
  const session = useSession();
  const { billingVisitAttributeTypes, ipdDischargeEncounterTypeUuid } = useConfig<ClinicalWorkflowConfig>();
  const { dailyBedFeeBillableService } = useConfig<WardAppConfigSlice>({
    externalModuleName: '@kenyaemr/esm-ward-app',
  });

  const [selectedService, setSelectedService] = useState<BillableService | null>(null);
  const [hasPickedService, setHasPickedService] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { visit } = useVisitWithEncounters(visitUuid);
  const { billableServices, isLoadingBillableServices } = useBedFeeBillableServices();
  const { cashPoints, isLoading: isLoadingCashPoints } = useCashPoints();

  const { daysInWard, billStartDate, billEndDate } = useMemo(
    () => getBedStayWindow(admissionDatetime, findEncounterDatetimeByType(visit, ipdDischargeEncounterTypeUuid)),
    [admissionDatetime, ipdDischargeEncounterTypeUuid, visit],
  );

  const {
    bedFeeDaysBilled,
    isLoading: isLoadingBills,
    mutate: mutateBills,
  } = usePatientBills(patientUuid, billStartDate, billEndDate);

  const daysToBill = Math.max(daysInWard - bedFeeDaysBilled, 0);

  // Services carrying the ward app's bed fee concept come first, and one is preselected when
  // unambiguous, so the common case is a single click while any service remains selectable.
  const orderedServices = useMemo(() => {
    const bedFeeServices = billableServices.filter((service) =>
      serviceMatchesBedFeeConcept(service, dailyBedFeeBillableService),
    );
    const otherServices = billableServices.filter(
      (service) => !serviceMatchesBedFeeConcept(service, dailyBedFeeBillableService),
    );
    return [...bedFeeServices, ...otherServices];
  }, [billableServices, dailyBedFeeBillableService]);

  const suggestedService = useMemo(() => {
    const bedFeeServices = billableServices.filter((service) =>
      serviceMatchesBedFeeConcept(service, dailyBedFeeBillableService),
    );
    return bedFeeServices.length === 1 ? bedFeeServices[0] : null;
  }, [billableServices, dailyBedFeeBillableService]);

  const service = hasPickedService ? selectedService : selectedService ?? suggestedService;

  const servicePrice = useMemo(
    () => selectServicePrice(service, getVisitPaymentModeUuid(visit, billingVisitAttributeTypes.paymentMethod)),
    [billingVisitAttributeTypes.paymentMethod, service, visit],
  );

  const cashPointUuid = cashPoints[0]?.uuid ?? null;
  const isLoading = isLoadingBillableServices || isLoadingCashPoints || isLoadingBills;
  const totalAmount = servicePrice ? servicePrice.price * daysToBill : null;

  const canGenerate = Boolean(
    !isLoading && !isSubmitting && service && servicePrice && cashPointUuid && daysToBill > 0 && daysInWard > 0,
  );

  const handleGenerate = useCallback(async () => {
    if (!canGenerate || !service || !servicePrice || !cashPointUuid) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await createBedFeeBill({
        patientUuid,
        cashPointUuid,
        cashierUuid: session?.currentProvider?.uuid,
        billableServiceUuid: service.uuid,
        priceUuid: servicePrice.uuid,
        priceName: servicePrice.name,
        price: servicePrice.price,
        quantity: daysToBill,
      });

      if (!response?.ok) {
        throw new Error(t('unexpectedServerResponse', 'Unexpected Server Response'));
      }

      await mutateBills();
      showSnackbar({
        title: t('bedFeeBillGenerated', 'Bed fee bill generated'),
        subtitle: t('bedFeeBillGeneratedSubtitle', '{{days}} day(s) billed, totalling {{amount}}.', {
          days: daysToBill,
          amount: formatBedFeeAmount(totalAmount ?? 0),
        }),
        kind: 'success',
        isLowContrast: true,
      });
      onBillGenerated?.();
      closeModal();
    } catch (error) {
      showSnackbar({
        title: t('errorGeneratingBedFeeBill', 'Error generating bed fee bill'),
        subtitle: error instanceof Error ? error.message : t('unknownError', 'An unknown error occurred'),
        kind: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    canGenerate,
    cashPointUuid,
    closeModal,
    daysToBill,
    mutateBills,
    onBillGenerated,
    patientUuid,
    service,
    servicePrice,
    session?.currentProvider?.uuid,
    t,
    totalAmount,
  ]);

  const renderBlockingMessage = () => {
    if (daysInWard <= 0) {
      return (
        <InlineNotification
          kind="warning"
          lowContrast
          hideCloseButton
          title={t('cannotGenerateBedFeeBill', 'Cannot generate a bed fee bill')}
          subtitle={t('bedFeeNoAdmissionDate', 'The date the patient was admitted to the ward could not be found.')}
        />
      );
    }
    if (daysToBill <= 0) {
      return (
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title={t('bedFeeAlreadyBilled', 'Bed fee already billed')}
          subtitle={t(
            'bedFeeAlreadyBilledSubtitle',
            'All {{days}} day(s) in the ward have already been billed. No new bill will be created.',
            { days: daysInWard },
          )}
        />
      );
    }
    if (!cashPointUuid) {
      return (
        <InlineNotification
          kind="warning"
          lowContrast
          hideCloseButton
          title={t('cannotGenerateBedFeeBill', 'Cannot generate a bed fee bill')}
          subtitle={t('bedFeeNoCashPoint', 'No cash point is available to post the bill to.')}
        />
      );
    }
    if (service && !servicePrice) {
      return (
        <InlineNotification
          kind="warning"
          lowContrast
          hideCloseButton
          title={t('cannotGenerateBedFeeBill', 'Cannot generate a bed fee bill')}
          subtitle={t('bedFeeNoServicePrice', 'The bed fee service "{{service}}" has no price configured.', {
            service: service.name,
          })}
        />
      );
    }
    if (service && !serviceMatchesBedFeeConcept(service, dailyBedFeeBillableService)) {
      return (
        <InlineNotification
          kind="warning"
          lowContrast
          hideCloseButton
          title={t('unexpectedBedFeeService', 'Not a bed fee service')}
          subtitle={t(
            'unexpectedBedFeeServiceSubtitle',
            'This service is not linked to the configured bed fee concept, so the bill will not satisfy the bed fee check on this tab.',
          )}
        />
      );
    }
    return null;
  };

  return (
    <>
      <ModalHeader closeModal={closeModal}>{t('generateBedFeeBill', 'Generate bed fee bill')}</ModalHeader>
      <ModalBody>
        {isLoading ? (
          <InlineLoading description={t('loading', 'Loading...')} />
        ) : (
          <>
            <dl className={styles.summary}>
              {patientName && (
                <>
                  <dt>{t('patient', 'Patient')}</dt>
                  <dd>{patientName}</dd>
                </>
              )}
              <dt>{t('bedType', 'Bed type')}</dt>
              <dd>{bedTypeName ?? '--'}</dd>
              <dt>{t('admissionDate', 'Admission Date')}</dt>
              <dd>{admissionDatetime ? formatDate(parseDate(admissionDatetime)) : '--'}</dd>
              <dt>{t('daysInWard', 'Days In Ward')}</dt>
              <dd>{daysInWard}</dd>
              {bedFeeDaysBilled > 0 && (
                <>
                  <dt>{t('daysAlreadyBilled', 'Days already billed')}</dt>
                  <dd>{bedFeeDaysBilled}</dd>
                </>
              )}
              <dt>{t('daysToBill', 'Days to bill')}</dt>
              <dd>
                <strong>{daysToBill}</strong>
              </dd>
            </dl>

            <ComboBox
              id="bed-fee-billable-service"
              className={styles.servicePicker}
              titleText={t('bedFeeService', 'Bed fee service')}
              placeholder={t('searchForBedFeeService', 'Search for a bed fee service')}
              items={orderedServices}
              itemToString={(item: BillableService | null) => item?.name ?? ''}
              selectedItem={service}
              onChange={({ selectedItem }: { selectedItem: BillableService | null }) => {
                setSelectedService(selectedItem);
                setHasPickedService(true);
              }}
            />

            {service && servicePrice && (
              <dl className={styles.summary}>
                <dt>{t('dailyRate', 'Daily rate')}</dt>
                <dd>
                  {formatBedFeeAmount(servicePrice.price)}
                  {servicePrice.paymentMode?.name ? ` (${servicePrice.paymentMode.name})` : ''}
                </dd>
                <dt>{t('totalToBill', 'Total to bill')}</dt>
                <dd>
                  <strong>{formatBedFeeAmount(totalAmount ?? 0)}</strong>
                </dd>
              </dl>
            )}

            {renderBlockingMessage()}
          </>
        )}
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeModal} size="lg" disabled={isSubmitting}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button kind="primary" onClick={handleGenerate} size="lg" disabled={!canGenerate}>
          {isSubmitting ? t('generatingBill', 'Generating...') : t('generateBill', 'Generate bill')}
        </Button>
      </ModalFooter>
    </>
  );
};

export default GenerateBedFeeBillModal;
