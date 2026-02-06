import { useCallback } from 'react';
import { showSnackbar, useSession } from '@openmrs/esm-framework';
import type { TFunction } from 'i18next';
import {
  type BillingFormData,
  createBillingInformationVisitAttribute,
  updateVisitWithBillingInformation,
  createCashierBill,
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
  mutateVisit: () => void;
  closeWorkspaceWithSavedChanges: () => void;
  t: TFunction;
  patientUuid: string;
};

/**
 * Hook to handle billing form submission
 */
export const useBillingFormSubmission = ({
  activeVisit,
  billingVisitAttributeTypes,
  mutateVisit,
  closeWorkspaceWithSavedChanges,
  t,
  patientUuid,
}: UseBillingFormSubmissionParams) => {
  const { currentProvider } = useSession();
  const cashierUuid = currentProvider?.uuid;

  const handleSubmit = useCallback(
    async (data: BillingFormData) => {
      try {
        // Create cashier bill if billable item is selected
        if (
          data.billableItem &&
          data.billableItem.id &&
          data.billableItem.text &&
          data.billableItem.service &&
          data.billableItem.price &&
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
                  price: data.billableItem.price,
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
    ],
  );

  return { handleSubmit };
};
