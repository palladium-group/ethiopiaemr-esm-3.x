import useSWR from 'swr';
import { openmrsFetch, restBaseUrl, useConfig } from '@openmrs/esm-framework';
import { type RadiologyConfig } from '../../config-schema';
import { type RadiologyOrder } from '../../radiology-imaging/types';

const customRepresentation =
  'custom:(uuid,orderNumber,patient:(uuid,display,identifiers,person:(uuid,display,age,gender,birthdate)),' +
  'concept:(uuid,display,conceptClass),action,careSetting,orderer:ref,urgency,instructions,' +
  'orderReasonNonCoded,orderReason,bodySite,laterality,commentToFulfiller,procedures,display,' +
  'fulfillerStatus,dateStopped,scheduledDate,dateActivated,fulfillerComment,encounter)';

const urgencyPriority: Record<string, number> = { STAT: 1, ON_SCHEDULED_DATE: 2, ROUTINE: 3 };

interface OrdersResponse {
  results: RadiologyOrder[];
}

export function usePatientOrders(patientUuid: string | null) {
  const { radiologyOrderTypeUuid } = useConfig<RadiologyConfig>();

  const url = patientUuid
    ? `${restBaseUrl}/order?patient=${patientUuid}&orderTypes=${radiologyOrderTypeUuid}&v=${encodeURIComponent(
        customRepresentation,
      )}`
    : null;

  const { data, isLoading, error } = useSWR<OrdersResponse>(url, (path: string) =>
    openmrsFetch<OrdersResponse>(path).then((res) => res.data),
  );

  const orders = (data?.results ?? []).sort(
    (a, b) =>
      (urgencyPriority[a.urgency] ?? Number.MAX_SAFE_INTEGER) - (urgencyPriority[b.urgency] ?? Number.MAX_SAFE_INTEGER),
  );

  return { orders, isLoading, error };
}
