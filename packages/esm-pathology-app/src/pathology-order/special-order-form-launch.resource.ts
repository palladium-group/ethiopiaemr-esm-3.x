import type { TFunction } from 'i18next';
import { showSnackbar, type Encounter, type Visit } from '@openmrs/esm-framework';
import { createFixedTestOrder } from './create-fixed-test-order.resource';

export type SpecialOrderLaunchKind = 'pathology' | 'cytology';

export type BuildSpecialOrderFormLaunchPropsArgs = {
  kind: SpecialOrderLaunchKind;
  formUuid: string;
  orderConceptUuid: string;
  careSettingUuid: string;
  patientUuid: string;
  visitContext?: Visit;
  ordererUuid?: string;
  t: TFunction;
};

/**
 * Workspace props for the exported special-order form entry workspace.
 * After the Ampath form saves the Lab Order encounter + context obs, creates the fixed TestOrder.
 */
export function buildSpecialOrderFormLaunchProps({
  kind,
  formUuid,
  orderConceptUuid,
  careSettingUuid,
  patientUuid,
  visitContext,
  ordererUuid,
  t,
}: BuildSpecialOrderFormLaunchPropsArgs) {
  const workspaceTitle =
    kind === 'pathology'
      ? t('pathologyOrderForm', 'Pathology order form')
      : t('cytologyOrderForm', 'Cytology order form');

  const handlePostResponse = async (savedEncounter: Encounter) => {
    if (!savedEncounter?.uuid) {
      showSnackbar({
        kind: 'error',
        title: t('specialOrderSaveIncomplete', 'Request incomplete'),
        subtitle: t(
          'specialOrderMissingEncounter',
          'The request form was saved, but no encounter was returned. The lab order was not created.',
        ),
      });
      return;
    }

    if (!ordererUuid) {
      showSnackbar({
        kind: 'error',
        title: t('specialOrderSaveIncomplete', 'Request incomplete'),
        subtitle: t(
          'specialOrderProviderRequired',
          'The request form was saved, but your user is not linked to a provider, so the lab order was not created.',
        ),
      });
      return;
    }

    try {
      await createFixedTestOrder({
        patientUuid,
        encounterUuid: savedEncounter.uuid,
        ordererUuid,
        conceptUuid: orderConceptUuid,
        careSettingUuid,
      });
      showSnackbar({
        kind: 'success',
        title:
          kind === 'pathology'
            ? t('pathologyOrderCreated', 'Pathology order created')
            : t('cytologyOrderCreated', 'Cytology order created'),
        subtitle: t('specialOrderCreatedSubtitle', 'The request details were saved and the lab order was sent.'),
        isLowContrast: true,
      });
    } catch (error) {
      console.error('Failed to create fixed special-order TestOrder', error);
      showSnackbar({
        kind: 'error',
        title: t('specialOrderSaveIncomplete', 'Request incomplete'),
        subtitle: t(
          'specialOrderOrderCreateFailed',
          'The request details were saved, but creating the lab order failed. Please try again or contact support.',
        ),
      });
    }
  };

  return {
    workspaceTitle,
    form: {
      uuid: formUuid,
      visitUuid: visitContext?.uuid,
      visitTypeUuid: visitContext?.visitType?.uuid,
    },
    encounterUuid: '',
    handlePostResponse,
  };
}
