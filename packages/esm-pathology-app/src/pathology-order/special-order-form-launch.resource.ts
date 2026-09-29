import type { TFunction } from 'i18next';
import { openmrsFetch, restBaseUrl, showSnackbar, type Encounter, type Obs, type Visit } from '@openmrs/esm-framework';
import type { SampleTypeOrderMapping } from '../config-schema';
import { createFixedTestOrder, type CreateFixedTestOrderArgs } from './create-fixed-test-order.resource';

export type BuildSpecialOrderFormLaunchPropsArgs = {
  /** Display name for this service area (e.g. Histopathology). */
  serviceAreaLabel: string;
  formUuid: string;
  sampleTypeConceptUuid: string;
  sampleTypeToOrderConcept: Array<SampleTypeOrderMapping>;
  careSettingUuid: string;
  patientUuid: string;
  visitContext?: Visit;
  ordererUuid?: string;
  t: TFunction;
};

const encounterWithObsRepresentation =
  'custom:(uuid,obs:(uuid,concept:(uuid),value:(uuid),' +
  'groupMembers:(uuid,concept:(uuid),value:(uuid),' +
  'groupMembers:(uuid,concept:(uuid),value:(uuid)))))';

type SampleTypeObs = {
  uuid?: string;
  concept?: { uuid?: string };
  value?: string | { uuid?: string } | unknown;
  groupMembers?: Array<SampleTypeObs>;
};

type EncounterObsPayload = {
  uuid: string;
  obs?: Array<SampleTypeObs>;
};

function valueAsConceptUuid(value: unknown): string | null {
  if (value && typeof value === 'object' && value !== null && 'uuid' in value) {
    const uuid = (value as { uuid?: string }).uuid;
    return uuid || null;
  }
  if (typeof value === 'string' && value) {
    return value;
  }
  return null;
}

/**
 * Resolves the Sample type answer concept UUID from encounter observations.
 * Recurses into obs groups (common in O3 form-engine forms).
 */
export function resolveSampleTypeAnswerUuid(
  obs: Array<SampleTypeObs> | undefined,
  sampleTypeConceptUuid: string,
): string | null {
  if (!obs?.length || !sampleTypeConceptUuid) {
    return null;
  }

  for (const observation of obs) {
    if (observation?.concept?.uuid === sampleTypeConceptUuid) {
      const answerUuid = valueAsConceptUuid(observation.value);
      if (answerUuid) {
        return answerUuid;
      }
    }
    const nested = resolveSampleTypeAnswerUuid(observation.groupMembers, sampleTypeConceptUuid);
    if (nested) {
      return nested;
    }
  }
  return null;
}

/**
 * Looks up the TestOrder concept for a Sample type answer.
 */
export function resolveOrderConceptUuid(
  answerConceptUuid: string | null,
  mappings: Array<SampleTypeOrderMapping> | undefined,
): string | null {
  if (!answerConceptUuid || !mappings?.length) {
    return null;
  }
  const match = mappings.find((entry) => entry.answerConceptUuid === answerConceptUuid);
  return match?.orderConceptUuid ?? null;
}

/**
 * Looks up the optional order urgency for a Sample type answer (defaults to ROUTINE).
 */
export function resolveOrderUrgency(
  answerConceptUuid: string | null,
  mappings: Array<SampleTypeOrderMapping> | undefined,
): CreateFixedTestOrderArgs['urgency'] {
  if (!answerConceptUuid || !mappings?.length) {
    return 'ROUTINE';
  }
  const match = mappings.find((entry) => entry.answerConceptUuid === answerConceptUuid);
  return match?.urgency?.trim().toUpperCase() === 'STAT' ? 'STAT' : 'ROUTINE';
}

async function loadEncounterObs(encounterUuid: string): Promise<EncounterObsPayload['obs']> {
  const url = `${restBaseUrl}/encounter/${encounterUuid}?v=${encodeURIComponent(encounterWithObsRepresentation)}`;
  const response = await openmrsFetch<EncounterObsPayload>(url);
  return response.data?.obs ?? [];
}

/**
 * Workspace props for the exported special-order form entry workspace.
 * After the Ampath form saves the Lab Order encounter + context obs, creates the TestOrder
 * selected by the form's Sample type answer.
 */
export function buildSpecialOrderFormLaunchProps({
  serviceAreaLabel,
  formUuid,
  sampleTypeConceptUuid,
  sampleTypeToOrderConcept,
  careSettingUuid,
  patientUuid,
  visitContext,
  ordererUuid,
  t,
}: BuildSpecialOrderFormLaunchPropsArgs) {
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
      let obs: Array<SampleTypeObs> = (savedEncounter.obs as Array<Obs> as Array<SampleTypeObs>) ?? [];
      let answerConceptUuid = resolveSampleTypeAnswerUuid(obs, sampleTypeConceptUuid);

      if (!answerConceptUuid) {
        obs = (await loadEncounterObs(savedEncounter.uuid)) ?? [];
        answerConceptUuid = resolveSampleTypeAnswerUuid(obs, sampleTypeConceptUuid);
      }

      const orderConceptUuid = resolveOrderConceptUuid(answerConceptUuid, sampleTypeToOrderConcept);
      if (!orderConceptUuid) {
        showSnackbar({
          kind: 'error',
          title: t('specialOrderSaveIncomplete', 'Request incomplete'),
          subtitle: t(
            'specialOrderSampleTypeRequired',
            'The request form was saved, but Sample type was missing or not mapped to a lab test. The lab order was not created.',
          ),
        });
        return;
      }

      await createFixedTestOrder({
        patientUuid,
        encounterUuid: savedEncounter.uuid,
        ordererUuid,
        conceptUuid: orderConceptUuid,
        careSettingUuid,
        urgency: resolveOrderUrgency(answerConceptUuid, sampleTypeToOrderConcept),
      });
      showSnackbar({
        kind: 'success',
        title: t('pathologyOrderCreated', 'Pathology order created'),
        subtitle: t(
          'specialOrderCreatedSubtitle',
          'The {{typeOfSample}} request was saved and the lab order was sent.',
          { typeOfSample: serviceAreaLabel },
        ),
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
    workspaceTitle: serviceAreaLabel,
    form: {
      uuid: formUuid,
      visitUuid: visitContext?.uuid,
      visitTypeUuid: visitContext?.visitType?.uuid,
    },
    encounterUuid: '',
    handlePostResponse,
  };
}
