import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { z } from 'zod';
// Create the billing form schema factory with conditional validation based on skip logic
import type { TFunction } from 'i18next';

/**
 * Creates a cashier bill for the selected billable item
 */
export const createCashierBill = async (
  billableItem: {
    id: string;
    text: string;
    service: any;
    price: any;
  },
  patientUuid: string,
  cashPointUuid: string,
  cashierUuid: string,
) => {
  const billPayload = {
    lineItems: [
      {
        billableService: billableItem.service.uuid,
        quantity: 1,
        price: billableItem.price.price,
        priceName: billableItem.price.name || 'Default',
        priceUuid: billableItem.price.uuid,
        lineItemOrder: 0,
        paymentStatus: 'PENDING',
      },
    ],
    cashPoint: cashPointUuid,
    patient: patientUuid,
    status: 'PENDING',
    payments: [],
  };

  return openmrsFetch(`${restBaseUrl}/cashier/bill`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: billPayload,
  });
};

export const createBillingFormSchema = (
  t: TFunction,
  billingTypes?: Array<{ uuid: string; name?: string; attributeTypes?: Array<{ uuid: string; required?: boolean }> }>,
  isEditMode = false,
) => {
  return z
    .object({
      billingTypeUuid: z.string().optional(),
      creditSubType: z.string().optional(),
      attributes: z.record(z.string(), z.any()).optional(),
      billableItem: z
        .object({
          id: z.string(),
          text: z.string(),
          service: z.any(),
          price: z.any(),
        })
        .nullable()
        .optional(),
      cashPointUuid: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      // Billing type is required on submit
      if (!data.billingTypeUuid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('billingTypeRequired', 'Billing type is required'),
          path: ['billingTypeUuid'],
        });
        return;
      }

      // Billable service is required when creating billing information (not in edit mode)
      if (!isEditMode && !data.billableItem) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('billableServiceRequired', 'Billable service is required'),
          path: ['billableItem'],
        });
      }

      // Validate required attributes for the selected billing type
      if (billingTypes && data.billingTypeUuid) {
        const selectedBillingType = billingTypes.find((bt) => bt.uuid === data.billingTypeUuid);
        if (selectedBillingType?.attributeTypes) {
          selectedBillingType.attributeTypes.forEach((attrType) => {
            if (attrType.required) {
              const attrValue = data.attributes?.[attrType.uuid];
              if (!attrValue || (typeof attrValue === 'string' && attrValue.trim() === '')) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: t('attributeRequired', '{{attributeName}} is required', {
                    attributeName: attrType.uuid,
                  }),
                  path: ['attributes', attrType.uuid],
                });
              }
            }
          });
        }
      }

      // Validate cash point is required if billable item is selected
      if (data.billableItem && !data.cashPointUuid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('cashPointRequired', 'Cash point is required when a billable item is selected'),
          path: ['cashPointUuid'],
        });
      }
    });
};

export type BillingFormData = z.infer<ReturnType<typeof createBillingFormSchema>>;

export const CBHI_VISIT_ATTRIBUTE_FIELDS = [
  'id',
  'fullName',
  'accountNo',
  'membershipType',
  'cbhiId',
  'insuredId',
] as const;

export type CbhiVisitAttributeField = (typeof CBHI_VISIT_ATTRIBUTE_FIELDS)[number];

export type BillingVisitAttributeTypesMap = {
  paymentMethod: string;
  creditType?: string;
  creditTypeDetails?: string;
  paymentAttributesSummary?: string;
  cbhi?: Partial<Record<CbhiVisitAttributeField, string>>;
};

const hasAttributeValue = (value: unknown) =>
  value !== undefined && value !== null && !(typeof value === 'string' && value.trim() === '');

const transformFormObjectToVisitAttributes = (
  formObject: Record<string, any>,
  visitAttributeTypeUuidsMap: Record<string, string>,
) => {
  return Object.entries(formObject)
    .map(([key, value]) => ({
      attributeType: visitAttributeTypeUuidsMap[key],
      value: value,
    }))
    .filter((item) => {
      // Filter out undefined, null, or empty string values
      if (item.value === undefined || item.value === null || item.value === '') {
        return false;
      }
      // Filter out empty creditTypeDetails object
      if (item.value && typeof item.value === 'object' && !Array.isArray(item.value)) {
        const creditDetails = item.value as Record<string, any>;
        const hasAnyValue = Object.values(creditDetails).some((val) => val !== undefined && val !== null && val !== '');
        if (!hasAnyValue) {
          return false;
        }
      }
      return true;
    })
    .map((item) => ({
      attributeType: item.attributeType,
      value: item.value && typeof item.value === 'object' ? JSON.stringify(item.value) : item.value,
    }));
};

export const createBillingInformationVisitAttribute = (
  billingFormData: BillingFormData,
  visitAttributeTypeUuidsMap: BillingVisitAttributeTypesMap,
) => {
  const { billingTypeUuid, attributes } = billingFormData;

  const visitAttributePayload: Array<{ attributeType: { uuid: string } | string; value: string }> = [];

  // Add billing method
  if (billingTypeUuid && visitAttributeTypeUuidsMap.paymentMethod) {
    visitAttributePayload.push({
      attributeType: visitAttributeTypeUuidsMap.paymentMethod,
      value: billingTypeUuid,
    });
  }

  const cbhiAttributeTypes = visitAttributeTypeUuidsMap.cbhi || {};
  const cbhiFieldKeys = new Set<string>(CBHI_VISIT_ATTRIBUTE_FIELDS);
  const configuredCbhiAttributeUuids = new Set(
    Object.values(cbhiAttributeTypes).filter((uuid): uuid is string => Boolean(uuid)),
  );

  // Persist CBHI fields as independent visit attributes for reporting
  CBHI_VISIT_ATTRIBUTE_FIELDS.forEach((field) => {
    const attributeTypeUuid = cbhiAttributeTypes[field];
    const value = attributes?.[field];
    if (attributeTypeUuid && hasAttributeValue(value)) {
      visitAttributePayload.push({
        attributeType: attributeTypeUuid,
        value: String(value),
      });
    }
  });

  // Save remaining sub attributes as a stringified object under paymentAttributesSummary.
  // CBHI fields are excluded so they are not duplicated inside the summary blob.
  if (visitAttributeTypeUuidsMap.paymentAttributesSummary && attributes) {
    const paymentAttributesObject: Record<string, any> = {};

    Object.entries(attributes).forEach(([attrTypeUuid, value]) => {
      if (!hasAttributeValue(value)) {
        return;
      }
      if (cbhiFieldKeys.has(attrTypeUuid) || configuredCbhiAttributeUuids.has(attrTypeUuid)) {
        return;
      }
      paymentAttributesObject[attrTypeUuid] = value;
    });

    if (Object.keys(paymentAttributesObject).length > 0) {
      visitAttributePayload.push({
        attributeType: visitAttributeTypeUuidsMap.paymentAttributesSummary,
        value: JSON.stringify(paymentAttributesObject),
      });
    }
  }

  return visitAttributePayload;
};

/**
 * Updates a single visit attribute using the update endpoint
 */
export const updateVisitAttribute = (visitUuid: string, attributeUuid: string, value: string) => {
  return openmrsFetch(`${restBaseUrl}/visit/${visitUuid}/attribute/${attributeUuid}`, {
    method: 'POST',
    headers: {
      'Content-type': 'application/json',
    },
    body: {
      value: value,
    },
  });
};

export type VisitAttribute = {
  uuid: string;
  attributeType: {
    uuid: string;
  };
  value: string;
};

type VisitAttributePayloadItem = {
  attributeType: { uuid: string } | string;
  value: string;
};

/**
 * Creates or updates visit attributes with billing information in a single request.
 * Existing attributes are referenced by uuid; new ones are created via attributeType.
 */
export const updateVisitWithBillingInformation = async (
  visitAttributePayload: VisitAttributePayloadItem[],
  visitUuid: string,
  existingVisitAttributes?: VisitAttribute[],
) => {
  if (!visitUuid) {
    throw new Error('Visit UUID is required');
  }

  const attributes = visitAttributePayload.map((payload) => {
    const attributeTypeUuid =
      typeof payload.attributeType === 'string' ? payload.attributeType : payload.attributeType.uuid;

    const existingAttribute = existingVisitAttributes?.find((attr) => attr.attributeType.uuid === attributeTypeUuid);

    if (existingAttribute) {
      return {
        uuid: existingAttribute.uuid,
        value: payload.value,
      };
    }

    return {
      attributeType: attributeTypeUuid,
      value: payload.value,
    };
  });

  return openmrsFetch(`${restBaseUrl}/visit/${visitUuid}`, {
    method: 'POST',
    headers: {
      'Content-type': 'application/json',
    },
    body: {
      attributes,
    },
  });
};
