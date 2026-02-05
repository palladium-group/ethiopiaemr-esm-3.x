import React, { useEffect } from 'react';
import { Button, ButtonSet, InlineLoading, ContentSwitcher, Switch, Form } from '@carbon/react';
import { DefaultWorkspaceProps, ExtensionSlot, usePatient, useConfig, useVisit } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';

import type { ClinicalWorkflowConfig } from '../../config-schema';
import {
  usePaymentModes,
  useCreditCompanies,
  useBillingForm,
  useBillingType,
  usePopulateBillingFormFromVisit,
  useBillingFormSubmission,
  useBillingFormHandlers,
} from './hooks';
import {
  BillingTypeAttributes,
  CreditSubTypeSelection,
  FreeSubTypeSelection,
  CreditSubTypeFields,
  FreeSubTypeFields,
} from './components';
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

  // Custom hooks for data fetching
  const { billingTypes } = usePaymentModes();

  // Form management hook
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useBillingForm(t, billingTypes);

  // Watch form values
  const billingTypeUuid = watch('billingTypeUuid');
  const creditSubType = watch('creditSubType');
  const freeSubType = watch('freeSubType');
  const attributes = watch('attributes') || {};

  // Billing type logic hook
  const { selectedBillingType, isCreditType, isFreeType } = useBillingType(billingTypes, billingTypeUuid);

  // Fetch credit companies conditionally
  const { creditCompanies } = useCreditCompanies(isCreditType && creditSubType === 'creditCompany');

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
  });

  // Form submission handler
  const { handleSubmit: handleFormSubmit } = useBillingFormSubmission({
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
    mutateVisit,
    closeWorkspaceWithSavedChanges,
    t,
  });

  // Form interaction handlers
  const { selectedIndex, handleContentSwitcherChange } = useBillingFormHandlers({
    billingTypeUuid,
    billingTypes,
    setValue,
  });

  useEffect(() => {
    promptBeforeClosing(() => isDirty);
  }, [promptBeforeClosing, isDirty]);

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
      <Form onSubmit={handleSubmit(handleFormSubmit)}>
        <div className={styles.billingInformationContainer}>
          <p className={styles.sectionTitle}>{t('paymentMethods', 'Payment Methods')}</p>

          <ContentSwitcher
            className={styles.paymentTypeSwitcher}
            onChange={handleContentSwitcherChange}
            selectedIndex={selectedIndex}
            size="md">
            {billingTypes?.map((billingType) => (
              <Switch
                className={styles.paymentTypeSwitch}
                key={billingType.uuid}
                name={billingType.uuid}
                text={billingType.name}
              />
            ))}
          </ContentSwitcher>

          {/* Credit sub-type selection */}
          {isCreditType && (
            <CreditSubTypeSelection
              control={control}
              errors={errors}
              t={t}
              creditSubType={creditSubType}
              setValue={setValue}
            />
          )}

          {/* Free sub-type selection */}
          {isFreeType && (
            <FreeSubTypeSelection
              control={control}
              errors={errors}
              t={t}
              freeSubType={freeSubType}
              setValue={setValue}
            />
          )}

          {/* Conditional fields based on Credit sub-type */}
          {isCreditType && creditSubType && (
            <CreditSubTypeFields
              control={control}
              errors={errors}
              t={t}
              creditSubType={creditSubType}
              creditCompanies={creditCompanies}
              attributes={attributes}
              setValue={setValue}
            />
          )}

          {/* Conditional fields based on Free sub-type */}
          {isFreeType && freeSubType && <FreeSubTypeFields />}

          {/* Default attribute types for other billing types */}
          {selectedBillingType &&
            !isCreditType &&
            !isFreeType &&
            selectedBillingType.attributeTypes &&
            selectedBillingType.attributeTypes.length > 0 && (
              <BillingTypeAttributes
                control={control}
                errors={errors}
                t={t}
                attributeTypes={selectedBillingType.attributeTypes}
                attributes={attributes}
                setValue={setValue}
              />
            )}
        </div>
        <ButtonSet className={styles.buttonSet}>
          <Button className={styles.button} kind="secondary" onClick={() => closeWorkspace()}>
            {t('discard', 'Discard')}
          </Button>
          <Button disabled={!isDirty} className={styles.button} kind="primary" type="submit">
            {t('saveAndClose', 'Save & Close')}
          </Button>
        </ButtonSet>
      </Form>
    </>
  );
};

export default BillingInformationWorkspace;
