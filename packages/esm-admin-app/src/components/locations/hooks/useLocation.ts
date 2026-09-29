import { type FetchResponse, restBaseUrl, openmrsFetch } from '@openmrs/esm-framework';
import useSWR from 'swr';

export const saveOrUpdateLocation = async (locationPayload, locationUuid) => {
  if (typeof locationPayload === 'string' && typeof locationUuid === 'object') {
    const temp = locationPayload;
    locationPayload = locationUuid;
    locationUuid = temp;
  }

  const url = locationUuid ? `${restBaseUrl}/location/${locationUuid}` : `${restBaseUrl}/location`;
  return await openmrsFetch(url, {
    method: 'POST',
    body: locationPayload,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export type LocationDetails = {
  uuid: string;
  parentLocation: { uuid: string; display: string; tags: Array<{ uuid: string }> } | null;
  childLocations: Array<{ uuid: string }>;
  attributes: Array<{ uuid: string; attributeType: { uuid: string }; value: { uuid: string } | string }>;
};

/** Parent, children and active attributes needed by the location form (not part of the table's rep). */
export const useLocationDetails = (locationUuid?: string) => {
  const rep =
    'custom:(uuid,parentLocation:(uuid,display,tags:(uuid)),childLocations:(uuid),attributes:(uuid,attributeType:(uuid),value))';
  const { data, isLoading } = useSWR<FetchResponse<LocationDetails>>(
    locationUuid ? `${restBaseUrl}/location/${locationUuid}?v=${rep}` : null,
    openmrsFetch,
  );
  return { locationDetails: data?.data, isLoading };
};

export const useDepartmentTypes = (conceptSetUuid: string) => {
  const { data, isLoading } = useSWR<FetchResponse<{ setMembers: Array<{ uuid: string; display: string }> }>>(
    conceptSetUuid ? `${restBaseUrl}/concept/${conceptSetUuid}?v=custom:(setMembers:(uuid,display))` : null,
    openmrsFetch,
  );
  return { departmentTypes: data?.data?.setMembers ?? [], isLoading };
};

/** Concept-datatype attribute values come back as a concept ref; tolerate a raw uuid too. */
export const attributeValueUuid = (attribute?: LocationDetails['attributes'][number]): string | undefined => {
  const value: { uuid?: string } | string | undefined = attribute?.value;
  return typeof value === 'string' ? value : value?.uuid;
};

/**
 * Keeps the single Department Type attribute in sync on an existing location:
 * creates, updates or voids it. New locations send the attribute in the create payload instead.
 */
export const syncDepartmentTypeAttribute = async (
  locationUuid: string,
  attributeTypeUuid: string,
  existing: LocationDetails['attributes'][number] | undefined,
  departmentTypeUuid: string | null,
) => {
  const base = `${restBaseUrl}/location/${locationUuid}/attribute`;
  const headers = { 'Content-Type': 'application/json' };
  const existingValue = attributeValueUuid(existing);

  if (!departmentTypeUuid) {
    if (existing) {
      await openmrsFetch(`${base}/${existing.uuid}`, { method: 'DELETE' });
    }
    return;
  }
  if (!existing) {
    await openmrsFetch(base, {
      method: 'POST',
      headers,
      body: { attributeType: attributeTypeUuid, value: departmentTypeUuid },
    });
  } else if (existingValue !== departmentTypeUuid) {
    await openmrsFetch(`${base}/${existing.uuid}`, { method: 'POST', headers, body: { value: departmentTypeUuid } });
  }
};
