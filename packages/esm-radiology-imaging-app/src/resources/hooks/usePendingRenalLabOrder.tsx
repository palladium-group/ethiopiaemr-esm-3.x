import { useMemo } from 'react';
import useSWR from 'swr';
import { openmrsFetch, restBaseUrl, useConfig } from '@openmrs/esm-framework';
import { type RadiologyConfig } from '../../config-schema';

interface PendingLabOrderConcept {
  uuid: string;
  display: string;
}

export interface PendingRenalLabOrder {
  uuid: string;
  dateActivated: string;
  dateStopped: string | null;
  action: string;
  fulfillerStatus: string | null;
  concept: PendingLabOrderConcept;
}

interface OrdersResponse {
  results: Array<PendingRenalLabOrder>;
}

const orderRepresentation = 'custom:(uuid,dateActivated,dateStopped,action,fulfillerStatus,concept:(uuid,display))';

/** Allow lab orders placed slightly before the radiology order when signed in the same basket. */
const TOGETHER_WITH_TOLERANCE_MS = 60_000;

function isPendingRelativeToRadiologyOrder(
  labOrder: PendingRenalLabOrder,
  radiologyOrderDateActivated?: string | null,
): boolean {
  if (!radiologyOrderDateActivated) {
    return true;
  }

  const labActivatedAt = new Date(labOrder.dateActivated).getTime();
  const radiologyActivatedAt = new Date(radiologyOrderDateActivated).getTime();

  if (Number.isNaN(labActivatedAt) || Number.isNaN(radiologyActivatedAt)) {
    return true;
  }

  return labActivatedAt >= radiologyActivatedAt - TOGETHER_WITH_TOLERANCE_MS;
}

/**
 * Returns the most recent active renal-function lab order that was placed together with or after
 * the radiology order, when results are still outstanding.
 */
export function usePendingRenalLabOrder(
  patientUuid: string | null | undefined,
  renalConceptUuid: string,
  radiologyOrderDateActivated?: string | null,
) {
  const { labOrderTypeUuid } = useConfig<RadiologyConfig>();

  const url =
    patientUuid && labOrderTypeUuid
      ? `${restBaseUrl}/order?patient=${patientUuid}` +
        `&orderTypes=${labOrderTypeUuid}` +
        `&excludeCanceledAndExpired=true` +
        `&excludeDiscontinueOrders=true` +
        `&v=${encodeURIComponent(orderRepresentation)}`
      : null;

  const { data, error, isLoading } = useSWR<{ data: OrdersResponse }>(url, openmrsFetch);

  const pendingOrder = useMemo(() => {
    if (!renalConceptUuid) {
      return null;
    }

    const matchingOrders = (data?.data?.results ?? [])
      .filter((order) => {
        if (order.concept?.uuid !== renalConceptUuid) {
          return false;
        }
        if (order.dateStopped) {
          return false;
        }
        if ((order.action ?? '').toUpperCase() === 'DISCONTINUE') {
          return false;
        }
        if ((order.fulfillerStatus ?? '').toUpperCase() === 'COMPLETED') {
          return false;
        }
        return isPendingRelativeToRadiologyOrder(order, radiologyOrderDateActivated);
      })
      .sort((a, b) => b.dateActivated.localeCompare(a.dateActivated));

    return matchingOrders[0] ?? null;
  }, [data, radiologyOrderDateActivated, renalConceptUuid]);

  return {
    pendingOrder,
    hasPendingOrder: Boolean(pendingOrder),
    isLoading,
    error,
  };
}
