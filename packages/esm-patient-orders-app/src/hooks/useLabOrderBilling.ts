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
    const conceptUuid: string | undefined = labOrder?.concept?.uuid ?? labOrder?.drug?.concept?.uuid;

    if (!conceptUuid) {
      return;
    }

    const url = `${restBaseUrl}/cashier/billableService?v=custom:(uuid,concept:(uuid),servicePrices:(uuid,name,price,paymentMode:(uuid,name)))`;
    const response = await openmrsFetch<{ data: { results: Array<BillableService> } }>(url);
    const billableService = response?.data?.data?.results?.find((item) => item?.concept?.uuid === conceptUuid) ?? null;

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
          order: labOrder.uuid,
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
    const paymentMethodAttributeTypeUuid = 'e6cb0c3b-04b0-4117-9bc6-ce24adbda802';
    const paymentAttr = attributes.find((attr) => attr.attributeType?.uuid === paymentMethodAttributeTypeUuid);
    return paymentAttr?.value as string | undefined;
  }, [visitContext]);

  const createBillForLabOrder = async (
    order: Order,
    patientUuid: string,
    cashPointUuid: string,
    cashierUuid?: string,
  ) => {
    const labOrder: any = order as any;
    const isLabOrder =
      labOrder?.concept?.conceptClass?.display &&
      typeof labOrder.concept.conceptClass.display === 'string' &&
      labOrder.concept.conceptClass.display.toLowerCase().includes('lab');

    if (!isLabOrder) {
      return;
    }

    await createCashierBillForLabOrder(order, patientUuid, cashPointUuid, cashierUuid, selectedPaymentModeUuid);
  };

  return {
    createBillForLabOrder,
  };
}
