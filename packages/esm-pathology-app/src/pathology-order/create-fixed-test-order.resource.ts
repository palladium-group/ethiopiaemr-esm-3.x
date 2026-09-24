import { postOrder, type OrderPost } from '@openmrs/esm-patient-common-lib';

export type CreateFixedTestOrderArgs = {
  patientUuid: string;
  encounterUuid: string;
  ordererUuid: string;
  conceptUuid: string;
  careSettingUuid: string;
  /** OpenMRS order urgency. Defaults to ROUTINE. Frozen section uses STAT. */
  urgency?: string;
};

/**
 * Creates the fixed specialty TestOrder on a saved special-order encounter.
 * Used after Ampath form submit so the clinician never selects the lab test.
 */
export async function createFixedTestOrder({
  patientUuid,
  encounterUuid,
  ordererUuid,
  conceptUuid,
  careSettingUuid,
  urgency = 'ROUTINE',
}: CreateFixedTestOrderArgs) {
  const body: OrderPost = {
    action: 'NEW',
    type: 'testorder',
    patient: patientUuid,
    careSetting: careSettingUuid,
    orderer: ordererUuid,
    encounter: encounterUuid,
    concept: conceptUuid,
    urgency,
  };

  return postOrder(body);
}
