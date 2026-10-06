import { useEffect, useMemo, useState } from 'react';
import { useConfig, useVisit } from '@openmrs/esm-framework';
import { usePaymentModes } from '../../billing.resource';
import { BillingConfig } from '../../config-schema';
import useBillableServices from '../../hooks/useBillableServices';
import { BillingService, LineItem, MappedBill, PaymentMethod, PaymentStatus } from '../../types';

export const lineItemName = (lineItem: LineItem) =>
  lineItem?.billableService?.split(':')[1] || lineItem?.item?.split(':')[1] || '--';

export const lineItemTotal = (lineItem: LineItem) => Number(lineItem.price) * Number(lineItem.quantity);

export const isPayable = (lineItem: LineItem) =>
  lineItem.paymentStatus !== PaymentStatus.PAID && lineItem.paymentStatus !== PaymentStatus.EXEMPTED;

export type LineItemMethod = { uuid: string; name: string };

/**
 * The payment method a line item is paid by: the price configured for the visit's payment method when the
 * item's billable service has one, otherwise the service's first configured price. Null when the service has
 * no configured price.
 */
export function resolveLineItemMethod(
  lineItem: LineItem,
  billableServices: Array<BillingService> = [],
  visitMethodUuid?: string,
): LineItemMethod | null {
  const serviceUuid = lineItem.billableService?.split(':')[0];
  const service = billableServices?.find((candidate) => candidate.uuid === serviceUuid);
  const servicePrice =
    service?.servicePrices?.find((price) => price.paymentMode.uuid === visitMethodUuid) ?? service?.servicePrices?.[0];
  return servicePrice ? { uuid: servicePrice.paymentMode.uuid, name: servicePrice.paymentMode.name } : null;
}

export type PaymentGroup = {
  /** The payment method's uuid, or null for items whose service has no configured price. */
  methodUuid: string | null;
  amount: number;
  lineItems: Array<LineItem>;
};

/** Totals the given line items per payment method, in the order the methods first appear. */
export function buildPaymentGroups(
  lineItems: Array<LineItem>,
  methodOf: (lineItem: LineItem) => LineItemMethod | null,
): Array<PaymentGroup> {
  const groups: Array<PaymentGroup> = [];
  lineItems.forEach((lineItem) => {
    const methodUuid = methodOf(lineItem)?.uuid ?? null;
    let group = groups.find((candidate) => candidate.methodUuid === methodUuid);
    if (!group) {
      group = { methodUuid, amount: 0, lineItems: [] };
      groups.push(group);
    }
    group.amount += lineItemTotal(lineItem);
    group.lineItems.push(lineItem);
  });
  return groups;
}

/** Which unpaid line items are ticked. Paid and exempted items can never be ticked. */
export function useLineItemSelection(bill: MappedBill, onChange?: (lineItems: Array<LineItem>) => void) {
  // The invoice page rebuilds the bill object on every render, so key the items off their content rather
  // than the array's identity. Otherwise reporting the selection upward would reset it on every render.
  const signature = (bill?.lineItems ?? [])
    .map((lineItem) => `${lineItem.uuid}:${lineItem.paymentStatus}:${lineItem.price}:${lineItem.quantity}`)
    .join('|');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const lineItems = useMemo(() => bill?.lineItems ?? [], [signature]);
  const payable = useMemo(() => lineItems.filter(isPayable), [lineItems]);
  const [selectedUuids, setSelectedUuids] = useState<Set<string>>(
    () => new Set(payable.map((lineItem) => lineItem.uuid)),
  );

  useEffect(() => {
    setSelectedUuids(new Set(payable.map((lineItem) => lineItem.uuid)));
  }, [payable]);

  const selectedLineItems = useMemo(
    () => payable.filter((lineItem) => selectedUuids.has(lineItem.uuid)),
    [payable, selectedUuids],
  );

  useEffect(() => {
    onChange?.(selectedLineItems);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLineItems]);

  const toggle = (uuid: string) =>
    setSelectedUuids((previous) => {
      const next = new Set(previous);
      if (next.has(uuid)) {
        next.delete(uuid);
      } else {
        next.add(uuid);
      }
      return next;
    });

  return {
    lineItems,
    payable,
    selectedLineItems,
    isSelected: (uuid: string) => selectedUuids.has(uuid),
    toggle,
    selectAll: () => setSelectedUuids(new Set(payable.map((lineItem) => lineItem.uuid))),
    clear: () => setSelectedUuids(new Set()),
  };
}

/** How the selected line items are paid by default, from the visit's payment method and the service prices. */
export function usePaymentPlan(bill: MappedBill, selectedLineItems: Array<LineItem>) {
  const { visitAttributeTypes } = useConfig<BillingConfig>();
  const { activeVisit } = useVisit(bill?.patientUuid);
  const { paymentModes, isLoading: isLoadingPaymentModes, error: paymentModesError } = usePaymentModes();
  const { billableServices, isLoading: isLoadingBillableServices } = useBillableServices();

  const visitMethodUuid = activeVisit?.attributes?.find(
    (attribute) => attribute.attributeType.uuid === visitAttributeTypes?.paymentMethods,
  )?.value as string | undefined;

  const methodOf = (lineItem: LineItem) => resolveLineItemMethod(lineItem, billableServices, visitMethodUuid);

  return {
    groups: buildPaymentGroups(selectedLineItems, methodOf),
    methodOf,
    visitMethodUuid,
    paymentModes: (paymentModes ?? []) as Array<PaymentMethod>,
    isLoading: isLoadingPaymentModes || isLoadingBillableServices,
    paymentModesError,
  };
}
