import { openmrsFetch, restBaseUrl, Visit } from '@openmrs/esm-framework';
import { mutate } from 'swr';

const queueEntryCustomRepresentation =
  'custom:(uuid,display,queue,status,patient:(uuid,display,person,identifiers:(uuid,display,identifier,identifierType)),visit:(uuid,display,startDatetime,encounters:(uuid,display,diagnoses,encounterDatetime,encounterType,obs,encounterProviders,voided),attributes:(uuid,display,value,attributeType)),priority,priorityComment,sortWeight,startedAt,endedAt,locationWaitingFor,queueComingFrom,providerWaitingFor,previousQueueEntry)';

export const TRIAGE_VISITS_CUSTOM_REPRESENTATION =
  'custom:(uuid,patient:(uuid,identifiers:(identifier,uuid),person:(age,display,gender,uuid)),visitType:(uuid,name,display),location:(uuid,name,display),startDatetime,stopDatetime)';

export function buildTriageActiveVisitsUrl({
  sessionLocation,
  attributeTypeUuid,
  triageId,
  startIndex,
  limit,
}: {
  sessionLocation: string;
  attributeTypeUuid: string;
  triageId: string;
  startIndex?: number;
  limit?: number;
}): string {
  const urlSearchParams = new URLSearchParams();
  urlSearchParams.append('includeParentLocations', 'true');
  urlSearchParams.append('includeInactive', 'false');
  urlSearchParams.append('totalCount', 'true');
  urlSearchParams.append('location', sessionLocation);
  urlSearchParams.append('attributeType', attributeTypeUuid);
  urlSearchParams.append('attributeValue', triageId);

  if (startIndex !== undefined) {
    urlSearchParams.append('startIndex', startIndex.toString());
  }
  if (limit !== undefined) {
    urlSearchParams.append('limit', limit.toString());
  }

  return `${restBaseUrl}/ethiopiaemrcustommodule/visit?v=${TRIAGE_VISITS_CUSTOM_REPRESENTATION}&${urlSearchParams.toString()}`;
}

export const createVisitForPatient = async (
  patientUuid: string,
  visitTypeUuid: string,
  sessionLocationUuid: string,
  triageAttribute?: { attributeTypeUuid: string; triageId: string },
) => {
  const url = `${restBaseUrl}/visit?v=full`;
  const payload: {
    patient: string;
    visitType: string;
    location: string;
    attributes?: Array<{ attributeType: string; value: string }>;
  } = {
    patient: patientUuid,
    visitType: visitTypeUuid,
    location: sessionLocationUuid,
  };

  if (triageAttribute?.attributeTypeUuid && triageAttribute.triageId) {
    payload.attributes = [
      {
        attributeType: triageAttribute.attributeTypeUuid,
        value: triageAttribute.triageId,
      },
    ];
  }

  return openmrsFetch<Visit>(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
};

type VisitAttributeLike = {
  uuid?: string;
  value?: unknown;
  attributeType?: {
    uuid?: string;
  };
};

const visitAttributeValue = (attribute: VisitAttributeLike | undefined): string | undefined => {
  if (attribute?.value == null) {
    return undefined;
  }
  return String(attribute.value);
};

export const ensureTriageVisitAttribute = async (
  visit: Visit,
  attributeTypeUuid: string,
  triageId: string,
): Promise<void> => {
  if (!visit?.uuid || !attributeTypeUuid || !triageId) {
    return;
  }

  const attributes = visit.attributes as VisitAttributeLike[] | undefined;
  const existing = attributes?.find((attr) => attr.attributeType?.uuid === attributeTypeUuid);
  const existingValue = visitAttributeValue(existing);
  if (existingValue === triageId) {
    return;
  }
  if (existingValue) {
    return;
  }

  await openmrsFetch(`${restBaseUrl}/visit/${visit.uuid}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      attributes: [
        {
          attributeType: attributeTypeUuid,
          value: triageId,
        },
      ],
    }),
  });
};

export const getCurrentVisitForPatient = async (patientUuid: string): Promise<Visit | undefined> => {
  const url = `${restBaseUrl}/visit?v=full&patient=${patientUuid}&includeInactive=false`;
  const { data } = await openmrsFetch<{ results: Array<Visit> }>(url);
  const currentVisit = data.results?.find((visit) => visit.stopDatetime === null);
  return currentVisit;
};

export const fetchQueueEntryForPatient = async (patientUuid: string): Promise<any | undefined> => {
  const url = `${restBaseUrl}/queue-entry?v=${queueEntryCustomRepresentation}&patient=${patientUuid}&includeInactive=false`;
  const { data } = await openmrsFetch<{ results: Array<unknown> }>(url);
  return data.results[0];
};

export const invalidateVisitCache = (patientUuid: string): void => {
  mutate(
    (key) =>
      typeof key === 'string' &&
      ((key.startsWith(`${restBaseUrl}/visit`) && key.includes(`patient=${patientUuid}`)) ||
        key.includes('/ethiopiaemrcustommodule/visit')),
    undefined,
    { revalidate: true },
  );
};
