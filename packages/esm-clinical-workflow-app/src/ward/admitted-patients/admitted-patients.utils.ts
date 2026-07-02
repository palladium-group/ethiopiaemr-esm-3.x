import type { PatientIdentifier } from '@openmrs/esm-framework';
import type { Bed, BedLayout } from './ward.types';

const OPENMRS_ID_TYPE = 'dfacd928-0370-4315-99d7-6ec1c9f7ae76';

export function bedLayoutToBed(bedLayout: BedLayout): Bed {
  return {
    id: bedLayout.bedId,
    uuid: bedLayout.bedUuid,
    bedNumber: bedLayout.bedNumber,
    bedType: bedLayout.bedType,
    row: bedLayout.rowNumber,
    column: bedLayout.columnNumber,
    status: bedLayout.status,
  };
}

export const getOpenmrsId = (identifiers: Array<PatientIdentifier>) => {
  return identifiers.find((id) => id.identifierType.uuid === OPENMRS_ID_TYPE)?.identifier ?? null;
};
