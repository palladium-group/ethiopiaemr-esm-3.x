import { useCallback, useState } from 'react';
import { showSnackbar, useConfig, useSession } from '@openmrs/esm-framework';
import type { TFunction } from 'i18next';
import {
  type BillingFormData,
  createBillingInformationVisitAttribute,
  updateVisitWithBillingInformation,
  createCashierBill,
  saveLastConsultationDate,
} from '../billing-information.resource';
import type { ClinicalWorkflowConfig } from '../../../config-schema';

type VisitAttribute = {
  uuid: string;
  attributeType: {
    uuid: string;
  };
  value: string;
};

type UseBillingFormSubmissionParams = {
  activeVisit?: {
    uuid?: string;
    attributes?: VisitAttribute[];
  };
  billingVisitAttributeTypes: ClinicalWorkflowConfig['billingVisitAttributeTypes'];
  billingTypes?: Array<{ uuid: string; name?: string }>;
  mutateVisit: () => void;
  closeWorkspaceWithSavedChanges: () => void;
  t: TFunction;
  patientUuid: string;
  isEditMode?: boolean;
};

/**
 * Hook to handle billing form submission
 */
export const useBillingFormSubmission = ({
  activeVisit,
  billingVisitAttributeTypes,
  billingTypes,
  mutateVisit,
  closeWorkspaceWithSavedChanges,
  t,
  patientUuid,
  isEditMode = false,
}: UseBillingFormSubmissionParams) => {
  const { currentProvider } = useSession();
  const { cardValidity } = useConfig<ClinicalWorkflowConfig>();
  const cashierUuid = currentProvider?.uuid;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (data: BillingFormData) => {
      setIsSubmitting(true);
      try {
        // Create cashier bill if billable item is selected
        // Use fallback price from service if price is not set
        const billableItemPrice =
          data.billableItem?.price ||
          (data.billableItem?.service?.servicePrices && data.billableItem.service.servicePrices[0]);

        if (
          data.billableItem &&
          data.billableItem.id &&
          data.billableItem.text &&
          data.billableItem.service &&
          billableItemPrice &&
          data.cashPointUuid
        ) {
          if (!cashierUuid) {
            showSnackbar({
              title: t('error', 'Error'),
              subtitle: t('cashierRequiredForBill', 'Cashier information is required to create a bill'),
              kind: 'error',
              isLowContrast: true,
              timeoutInMs: 5000,
            });
            // Continue with visit attribute update even if bill creation fails
          } else {
            try {
              await createCashierBill(
                {
                  id: data.billableItem.id,
                  text: data.billableItem.text,
                  service: data.billableItem.service,
                  price: billableItemPrice,
                },
                patientUuid,
                data.cashPointUuid,
                cashierUuid,
              );
              showSnackbar({
                title: t('billCreated', 'Bill Created'),
                subtitle: t('billCreatedSuccess', 'Bill has been created successfully'),
                kind: 'success',
                isLowContrast: true,
                timeoutInMs: 5000,
              });
            } catch (billError) {
              showSnackbar({
                title: t('error', 'Error'),
                subtitle: t('errorCreatingBill', 'Error creating bill, {{error}}', {
                  error: billError instanceof Error ? billError.message : 'Unknown error',
                }),
                kind: 'error',
                isLowContrast: true,
                timeoutInMs: 5000,
              });
              // Continue with visit attribute update even if bill creation fails
            }
          }
        }

        // Only record consultation date in MRU if the patient has a non-cash payment method (CBHI, Credit, Waiver, Free, Exempt).
        // Cash/Paying patients must pay at the cashier before their consultation date is updated.
        const selectedMode = billingTypes?.find((type) => type.uuid === data.billingTypeUuid);
        const isNonCash = Boolean(selectedMode?.name && !/cash|paying/i.test(selectedMode.name));

        if (isNonCash && cardValidity?.lastConsultationDateAttributeTypeUuid && data.billableItem) {
          try {
            await saveLastConsultationDate(patientUuid, cardValidity.lastConsultationDateAttributeTypeUuid);
          } catch (cardErr) {
            console.error('Failed to update last consultation date attribute', cardErr);
          }
        }

        // Update visit attributes
        const visitAttributePayload = createBillingInformationVisitAttribute(data, billingVisitAttributeTypes);
        const response = await updateVisitWithBillingInformation(
          visitAttributePayload,
          activeVisit?.uuid,
          activeVisit?.attributes as VisitAttribute[] | undefined,
        );
        if (response.status === 200) {
          showSnackbar({
            title: t('updateVisitWithBillingInfo', 'Update Visit With Billing Information'),
            subtitle: t('updateVisitWithBillingInfoSuccess', 'Update Visit With Billing Information Success'),
            kind: 'success',
            isLowContrast: true,
            timeoutInMs: 5000,
          });
          mutateVisit();
          closeWorkspaceWithSavedChanges();
        }
      } catch (error) {
        showSnackbar({
          title: t('error', 'Error'),
          subtitle: t('errorUpdatingBillingInformation', 'Error updating billing information, {{error}}', {
            error: error instanceof Error ? error.message : 'Unknown error',
          }),
          kind: 'error',
          isLowContrast: true,
          timeoutInMs: 5000,
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      activeVisit?.uuid,
      activeVisit?.attributes,
      billingVisitAttributeTypes,
      mutateVisit,
      closeWorkspaceWithSavedChanges,
      t,
      patientUuid,
      cashierUuid,
      isEditMode,
      billingTypes,
      cardValidity?.lastConsultationDateAttributeTypeUuid,
    ],
  );

  return { handleSubmit, isSubmitting };
};
