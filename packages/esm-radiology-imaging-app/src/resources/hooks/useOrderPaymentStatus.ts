import { useMemo } from 'react';
import useSWR from 'swr';
import { useConfig } from '@openmrs/esm-framework';
import { type RadiologyConfig } from '../../config-schema';
import {
  deriveWorklistPaymentGate,
  fetchOrderBillLineItems,
  resolveOrderPaymentStatus,
  type BillLineItem,
} from '../cashier.resource';

export const orderPaymentStatusKey = (orderUuid: string) => `cashier-bill-line-item:${orderUuid}`;

export function useOrderPaymentStatus(orderUuid: string | undefined) {
  const { enforceBillPayment, billingStatusQueryUrl } = useConfig<RadiologyConfig>();

  const { data, error, isLoading, mutate } = useSWR<Array<BillLineItem>>(
    orderUuid ? orderPaymentStatusKey(orderUuid) : null,
    () => fetchOrderBillLineItems(orderUuid as string, billingStatusQueryUrl),
    { revalidateOnFocus: false },
  );

  const hasSuccessfulFetch = !error && data !== undefined;
  const { isPaid, paymentStatus } = useMemo(
    () => (hasSuccessfulFetch ? resolveOrderPaymentStatus(data) : { isPaid: false, paymentStatus: null }),
    [hasSuccessfulFetch, data],
  );

  const { canCreateWorklist, isUnpaid, hasPaymentStatusError } = deriveWorklistPaymentGate({
    enforceBillPayment,
    isLoading,
    error,
    isPaid,
  });

  return {
    isLoading,
    error,
    isPaid,
    isUnpaid,
    hasPaymentStatusError,
    paymentStatus,
    canCreateWorklist,
    mutate,
  };
}
