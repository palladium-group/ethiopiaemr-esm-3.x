import { useMemo } from 'react';
import { openmrsFetch, restBaseUrl, type Visit } from '@openmrs/esm-framework';
import { type Order } from '@openmrs/esm-patient-common-lib';

type BillableService = {
  uuid: string;
  concept?: { uuid: string };
  servicePrices?: Array<{
    uuid: string;
    name?: string;
    price: number;
    paymentMode?: {
      uuid: string;
      name: string;
    };
  }>;
};

async function createCashierBillForLabOrder(
  order: Order,
  patientUuid: string,
  cashPointUuid: string,
  cashierUuid?: string,
  paymentModeUuid?: string,
) {
  try {
    if (!cashierUuid || !cashPointUuid) {
      return;
    }

    const labOrder: any = order as any;
    const conceptUuid: string | undefined = labOrder?.testType?.conceptUuid;

    if (!conceptUuid) {
      return;
    }

    const url = `${restBaseUrl}/cashier/billableService?v=custom:(uuid,concept:(uuid),servicePrices:(uuid,name,price,paymentMode:(uuid,name)))`;
    const response = await openmrsFetch<{ results: Array<BillableService> }>(url);
    const billableService = response?.data?.results?.find((item) => item?.concept?.uuid === conceptUuid) ?? null;

    if (!billableService || !billableService.servicePrices?.length) {
      return;
    }

    let chosenPrice = billableService.servicePrices[0];

    if (paymentModeUuid) {
      const matchedPrice = billableService.servicePrices.find(
        (sp) => sp.paymentMode && sp.paymentMode.uuid === paymentModeUuid,
      );
      if (matchedPrice) {
        chosenPrice = matchedPrice;
      }
    }

    const billPayload = {
      lineItems: [
        {
          billableService: billableService.uuid,
          quantity: 1,
          price: chosenPrice.price,
          priceName: chosenPrice.name || 'Default',
          priceUuid: chosenPrice.uuid,
          lineItemOrder: 0,
          paymentStatus: 'PENDING',
        },
      ],
      cashPoint: cashPointUuid,
      patient: patientUuid,
      status: 'PENDING',
      payments: [],
    };

    await openmrsFetch(`${restBaseUrl}/cashier/bill`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: billPayload,
    });
  } catch (error) {
    console.error('Error creating cashier bill for lab order', error);
  }
}

export function useLabOrderBilling(visitContext: Visit) {
  const selectedPaymentModeUuid = useMemo(() => {
    const attributes: any[] | undefined = (visitContext as any)?.attributes;
    if (!attributes?.length) {
      return undefined;
    }

    const paymentAttr = attributes.find((attr) => attr.attributeType?.name === 'Payment Method');
    return paymentAttr?.value as string | undefined;
  }, [visitContext]);

  const createBillForLabOrder = async (
    orders: any,
    patientUuid: string,
    cashPointUuid: string,
    cashierUuid?: string,
  ) => {
    const labOrders: any = orders as any;

    if (!labOrders) {
      return;
    }

    const billPromises = labOrders.map(
      async (order) =>
        await createCashierBillForLabOrder(order, patientUuid, cashPointUuid, cashierUuid, selectedPaymentModeUuid),
    );
    await Promise.all(billPromises);
  };

  return {
    createBillForLabOrder,
  };
}
