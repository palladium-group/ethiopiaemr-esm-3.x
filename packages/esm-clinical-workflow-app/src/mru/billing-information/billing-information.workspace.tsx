import React, { useEffect } from 'react';
import { Button, ButtonSet, InlineLoading, Form, InlineNotification } from '@carbon/react';
import dayjs from 'dayjs';
import {
  DefaultWorkspaceProps,
  ExtensionSlot,
  usePatient,
  useConfig,
  useVisit,
  useSession,
} from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';

import type { ClinicalWorkflowConfig } from '../../config-schema';
import { usePatientCardValidity } from '../../queue-room/usePatientCardValidity';
import {
  usePaymentModes,
  useBillingForm,
  useBillingType,
  usePopulateBillingFormFromVisit,
  useBillingFormSubmission,
  useBillingFormHandlers,
  useCashPoints,
  useLastVisitPaymentMethod,
} from './hooks';
import {
  CbhiBillingAttributes,
  InsuranceBillingAttributes,
  ShiBillingAttributes,
  CreditCompanyBillingAttributes,
  PaymentModeSelector,
  BillableItemsSelection,
} from './components';
import {
  isCbhiPaymentMode,
  isShiPaymentMode,
  isInsurancePaymentMode,
  isCreditCompanyPaymentMode,
  CBHI_ATTRIBUTE_UUIDS,
  SHI_ATTRIBUTE_UUIDS,
  INSURANCE_ATTRIBUTE_UUIDS,
  CREDIT_COMPANY_ATTRIBUTE_UUIDS,
  hasAttributeValue,
} from './billing-constants';
import styles from './billing-information.scss';

type BillingInformationWorkspaceProps = DefaultWorkspaceProps & {
  patientUuid: string;
};

const BillingInformationWorkspace: React.FC<BillingInformationWorkspaceProps> = ({
  patientUuid,
  closeWorkspace,
  promptBeforeClosing,
  closeWorkspaceWithSavedChanges,
}) => {
  const { t } = useTranslation();
  const { patient, isLoading } = usePatient(patientUuid);
  const { activeVisit, mutate: mutateVisit } = useVisit(patientUuid);
  const { billingVisitAttributeTypes } = useConfig<ClinicalWorkflowConfig>();
  const { sessionLocation } = useSession();

  // Check if we're in edit mode (if visit has payment method attribute, it means billing info already exists)
  const isEditMode = activeVisit?.attributes?.some(
    (attr) => attr.attributeType.uuid === billingVisitAttributeTypes.paymentMethod,
  );

  // Custom hooks for data fetching
  const { billingTypes } = usePaymentModes();
  const { cashPoints } = useCashPoints();

  // Card validity and last visit payment method
  const { hasValidCard, cardExpiryDate } = usePatientCardValidity(patientUuid);
  const { lastVisitPaymentMethodUuid } = useLastVisitPaymentMethod(
    patientUuid,
    billingVisitAttributeTypes?.paymentMethod,
  );

  // Form management hook
  const {
    control,
    handleSubmit,
    watch,
    getValues,
    setValue,
    formState: { errors, isDirty },
  } = useBillingForm(t, billingTypes, isEditMode, hasValidCard);

  // Watch form values
  const billingTypeUuid = watch('billingTypeUuid');
  const attributes = watch('attributes') || {};

  // Billing type logic hook
  const { selectedBillingType } = useBillingType(billingTypes, billingTypeUuid);

  // Populate form from visit attributes
  usePopulateBillingFormFromVisit({
    activeVisit: activeVisit
      ? {
          uuid: activeVisit.uuid,
          attributes: activeVisit.attributes as Array<{
            uuid: string;
            attributeType: { uuid: string };
            value: string;
          }>,
        }
      : undefined,
    billingTypes,
    billingVisitAttributeTypes,
    setValue,
    hasValidCard,
    lastVisitPaymentMethodUuid,
  });

  // Form submission handler
  const { handleSubmit: handleFormSubmit, isSubmitting } = useBillingFormSubmission({
    activeVisit: activeVisit
      ? {
          uuid: activeVisit.uuid,
          attributes: activeVisit.attributes as Array<{
            uuid: string;
            attributeType: { uuid: string };
            value: string;
          }>,
        }
      : undefined,
    billingVisitAttributeTypes,
    billingTypes,
    mutateVisit,
    closeWorkspaceWithSavedChanges,
    t,
    patientUuid,
    isEditMode,
  });

  // Form interaction handlers
  const { handleBillingTypeChange } = useBillingFormHandlers({
    billingTypeUuid,
    visitUuid: activeVisit?.uuid,
    getValues,
    setValue,
  });

  useEffect(() => {
    promptBeforeClosing(() => isDirty);
  }, [promptBeforeClosing, isDirty]);

  // Reset billable item when payment method changes
  useEffect(() => {
    setValue('billableItem', null, { shouldDirty: true });
  }, [billingTypeUuid, setValue]);

  // Auto-select first cashpoint for the location when creating a bill
  useEffect(() => {
    if (sessionLocation?.uuid && cashPoints.length > 0) {
      const matchingCashPoint = cashPoints.find((cp) => cp.location?.uuid === sessionLocation.uuid);
      if (matchingCashPoint) {
        setValue('cashPointUuid', matchingCashPoint.uuid, { shouldDirty: false });
      } else if (cashPoints.length > 0) {
        // If no matching cashpoint, select the first one
        setValue('cashPointUuid', cashPoints[0].uuid, { shouldDirty: false });
      }
    }
  }, [sessionLocation?.uuid, cashPoints, setValue]);

  if (isLoading) {
    return <InlineLoading status="active" iconDescription="Loading" description="Loading billing information..." />;
  }

  return (
    <>
      {patient && (
        <ExtensionSlot
          name="patient-header-slot"
          state={{
            patient,
            patientUuid: patientUuid,
            hideActionsOverflow: true,
          }}
        />
      )}
      <Form className={styles.form} onSubmit={handleSubmit(handleFormSubmit)}>
        <div className={styles.billingInformationContainer}>
          {hasValidCard && (
            <InlineNotification
              kind="info"
              title={t('cardValid', 'Card Valid')}
              subtitle={t(
                'cardValidInfo',
                'Patient has a valid card until {{date}}. Consultation fee is not required.',
                {
                  date: cardExpiryDate ? dayjs(cardExpiryDate).format('DD MMM YYYY') : '',
                  interpolation: { escapeValue: false },
                },
              )}
              lowContrast
              style={{ marginBottom: '1rem' }}
            />
          )}

          <PaymentModeSelector
            billingTypes={billingTypes}
            selectedBillingTypeUuid={billingTypeUuid}
            onSelectBillingType={handleBillingTypeChange}
            t={t}
          />

          {/* CBHI */}
          {isCbhiPaymentMode(billingTypeUuid, selectedBillingType?.name) && (
            <CbhiBillingAttributes errors={errors} t={t} attributes={attributes} setValue={setValue} />
          )}

          {/* SHI */}
          {isShiPaymentMode(billingTypeUuid, selectedBillingType?.name) && (
            <ShiBillingAttributes errors={errors} t={t} attributes={attributes} setValue={setValue} />
          )}

          {/* Insurance */}
          {isInsurancePaymentMode(billingTypeUuid, selectedBillingType?.name) && (
            <InsuranceBillingAttributes errors={errors} t={t} attributes={attributes} setValue={setValue} />
          )}

          {/* Credit Company */}
          {isCreditCompanyPaymentMode(billingTypeUuid, selectedBillingType?.name) && (
            <CreditCompanyBillingAttributes errors={errors} t={t} attributes={attributes} setValue={setValue} />
          )}

          {/* Billable Items Selection */}
          <BillableItemsSelection
            control={control}
            errors={errors}
            t={t}
            selectedPaymentModeUuid={billingTypeUuid}
            isEditMode={isEditMode}
            isCardValid={hasValidCard}
          />
        </div>
        <ButtonSet className={styles.buttonSet}>
          <Button
            className={styles.button}
            kind="secondary"
            onClick={() => closeWorkspace()}
            disabled={isEditMode ? isSubmitting : false}>
            {t('discard', 'Discard')}
          </Button>
          <Button
            disabled={
              !isDirty ||
              (isEditMode ? isSubmitting : false) ||
              (isCbhiPaymentMode(billingTypeUuid, selectedBillingType?.name) &&
                !hasAttributeValue(attributes?.[CBHI_ATTRIBUTE_UUIDS.cbhiId] ?? attributes?.cbhiId)) ||
              (isShiPaymentMode(billingTypeUuid, selectedBillingType?.name) &&
                !hasAttributeValue(attributes?.[SHI_ATTRIBUTE_UUIDS.shiId] ?? attributes?.shiId)) ||
              (isInsurancePaymentMode(billingTypeUuid, selectedBillingType?.name) &&
                !hasAttributeValue(attributes?.[INSURANCE_ATTRIBUTE_UUIDS.insuranceId] ?? attributes?.insuranceId)) ||
              (isCreditCompanyPaymentMode(billingTypeUuid, selectedBillingType?.name) &&
                !hasAttributeValue(
                  attributes?.[CREDIT_COMPANY_ATTRIBUTE_UUIDS.creditCompany] ?? attributes?.creditCompany,
                ))
            }
            className={styles.button}
            kind="primary"
            type="submit">
            {t('saveAndClose', 'Save & Close')}
          </Button>
        </ButtonSet>
      </Form>
    </>
  );
};

export default BillingInformationWorkspace;
