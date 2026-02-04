import { useCallback } from 'react';
import { showSnackbar } from '@openmrs/esm-framework';
import type { TFunction } from 'i18next';
import {
  type BillingFormData,
  createBillingInformationVisitAttribute,
  updateVisitWithBillingInformation,
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
}: UseBillingFormSubmissionParams) => {
  const handleSubmit = useCallback(
    async (data: BillingFormData) => {
      try {
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
            error: error.message,
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
    ],
  );

  return { handleSubmit };
};
