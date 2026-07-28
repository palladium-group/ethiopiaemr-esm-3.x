import dayjs from 'dayjs';
import { useRef } from 'react';
import {
  restBaseUrl,
  useConfig,
  useOpenmrsFetchAll,
  useOpenmrsPagination,
  openmrsFetch,
  type FulfillerStatus,
} from '@openmrs/esm-framework';
import { type RadiologyConfig } from '../../config-schema';
import { type RadiologyOrder } from '../../radiology-imaging/types';
import useSWR from 'swr';

const customRepresentation =
  'custom:(uuid,orderNumber,patient:(uuid,display,identifiers,person:(uuid,display,age,gender,birthdate)),' +
  'concept:(uuid,display,conceptClass),action,careSetting,orderer:ref,urgency,instructions,' +
  'orderReasonNonCoded,orderReason,bodySite,laterality,commentToFulfiller,procedures,display,' +
  'fulfillerStatus,dateStopped,scheduledDate,dateActivated,fulfillerComment,encounter)';

const urgencyPriority: Record<string, number> = { STAT: 1, ON_SCHEDULED_DATE: 2, ROUTINE: 3 };

function buildOrdersUrl(
  radiologyOrderTypeUuid: string,
  dateRange?: [Date, Date],
  fulfillerStatus?: string | null,
): string {
  const [from, to] = dateRange ?? [dayjs().startOf('day').toDate(), new Date()];
  const fulfillerStatusParam = fulfillerStatus ? `&fulfillerStatus=${fulfillerStatus}` : '';
  const includeNullFulfillerStatusParam = fulfillerStatus === null ? '&includeNullFulfillerStatus=true' : '';

  return (
    `${restBaseUrl}/order?v=${encodeURIComponent(customRepresentation)}` +
    `&orderTypes=${radiologyOrderTypeUuid}` +
    `&activatedOnOrAfterDate=${from.toISOString()}` +
    `&activatedOnOrBeforeDate=${to.toISOString()}` +
    fulfillerStatusParam +
    includeNullFulfillerStatusParam
  );
}

function processOrders(orders: RadiologyOrder[] | undefined, fulfillerComment?: string): RadiologyOrder[] {
  const isActive = (o: RadiologyOrder) => !o.dateStopped || dayjs(o.dateStopped).isAfter(dayjs());

  const filtered = orders
    ? orders.filter(isActive).filter((o) => (fulfillerComment ? o.fulfillerComment === fulfillerComment : true))
    : [];

  return [...filtered].sort(
    (a, b) =>
      (urgencyPriority[a.urgency] ?? Number.MAX_SAFE_INTEGER) - (urgencyPriority[b.urgency] ?? Number.MAX_SAFE_INTEGER),
  );
}

function useInitialLoadingOnly(isLoading: boolean, hasData: boolean) {
  const hasLoadedOnce = useRef(false);
  if (hasData) {
    hasLoadedOnce.current = true;
  }
  return isLoading && !hasLoadedOnce.current;
}

export const useOrders = (dateRange?: [Date, Date], fulfillerStatus?: string | null, fulfillerComment?: string) => {
  const { radiologyOrderTypeUuid } = useConfig<RadiologyConfig>();
  const url = buildOrdersUrl(radiologyOrderTypeUuid, dateRange, fulfillerStatus);

  const {
    data: orders,
    isLoading,
    error,
    goTo,
    currentPage,
    totalCount,
    mutate,
  } = useOpenmrsPagination<RadiologyOrder>(url, 10, { swrConfig: { keepPreviousData: true } });

  const isInitialLoading = useInitialLoadingOnly(isLoading, orders !== undefined);
  const ordersSortedByUrgency = processOrders(orders, fulfillerComment);

  return { orders: ordersSortedByUrgency, isLoading: isInitialLoading, error, goTo, currentPage, totalCount, mutate };
};

/** Fetches every page of matching orders for client-side filtering and pagination. */
export const useAllOrders = (dateRange?: [Date, Date], fulfillerStatus?: string | null, fulfillerComment?: string) => {
  const { radiologyOrderTypeUuid } = useConfig<RadiologyConfig>();
  const url = buildOrdersUrl(radiologyOrderTypeUuid, dateRange, fulfillerStatus);

  const {
    data: orders,
    isLoading,
    error,
    mutate,
  } = useOpenmrsFetchAll<RadiologyOrder>(url, {
    swrInfiniteConfig: { keepPreviousData: true },
  });

  const isInitialLoading = useInitialLoadingOnly(isLoading, orders !== undefined);
  const ordersSortedByUrgency = processOrders(orders, fulfillerComment);

  return { orders: ordersSortedByUrgency, isLoading: isInitialLoading, error, mutate };
};

export async function updateOrderFulfillmentStatus(orderUuid: string, status: FulfillerStatus): Promise<void> {
  await openmrsFetch(`${restBaseUrl}/order/${orderUuid}/fulfillerdetails`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fulfillerStatus: status }),
  });
}

export async function declineOrder(orderUuid: string, reason: string): Promise<void> {
  await openmrsFetch(`${restBaseUrl}/order/${orderUuid}/fulfillerdetails`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fulfillerStatus: 'DECLINED', fulfillerComment: reason }),
  });
}

export function useOrder(orderUuid: string) {
  const url = `${restBaseUrl}/order/${orderUuid}?v=${encodeURIComponent(customRepresentation)}`;
  const { data, isLoading, error, mutate } = useSWR<RadiologyOrder>(url, (path: string) =>
    openmrsFetch<RadiologyOrder>(path).then((res) => res.data),
  );
  return { order: data, isLoading, error, mutate };
}
