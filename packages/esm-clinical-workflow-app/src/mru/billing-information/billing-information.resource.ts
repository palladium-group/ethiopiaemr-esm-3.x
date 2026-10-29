import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { z } from 'zod';
import dayjs from 'dayjs';
// Create the billing form schema factory with conditional validation based on skip logic
import type { TFunction } from 'i18next';
import {
  isCbhiPaymentMode,
  isShiPaymentMode,
  isInsurancePaymentMode,
  isCreditCompanyPaymentMode,
  INSURANCE_ATTRIBUTE_UUIDS,
  CBHI_ATTRIBUTE_UUIDS,
  SHI_ATTRIBUTE_UUIDS,
  CREDIT_COMPANY_ATTRIBUTE_UUIDS,
  hasAttributeValue,
} from './billing-constants';

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
  hasValidCard = false,
) => {
  return z
    .object({
      billingTypeUuid: z.string().optional(),
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

      // Billable service is required when creating billing information (not in edit mode and card is not valid)
      if (!isEditMode && !hasValidCard && !data.billableItem) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('billableServiceRequired', 'Billable service is required'),
          path: ['billableItem'],
        });
      }

      const selectedBillingType = billingTypes?.find((bt) => bt.uuid === data.billingTypeUuid);

      // Validate required attributes for each payment mode
      if (data.billingTypeUuid) {
        if (isInsurancePaymentMode(data.billingTypeUuid, selectedBillingType?.name)) {
          const insuranceId = data.attributes?.[INSURANCE_ATTRIBUTE_UUIDS.insuranceId] ?? data.attributes?.insuranceId;
          if (!hasAttributeValue(insuranceId)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: t('insuranceIdRequired', 'Insurance ID is required'),
              path: ['attributes', INSURANCE_ATTRIBUTE_UUIDS.insuranceId],
            });
          }

          const expiryDate =
            data.attributes?.[INSURANCE_ATTRIBUTE_UUIDS.insuranceExpiryDate] ?? data.attributes?.insuranceExpiryDate;
          if (!hasAttributeValue(expiryDate)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: t('insuranceExpiryDateRequired', 'Insurance Expiry Date is required'),
              path: ['attributes', INSURANCE_ATTRIBUTE_UUIDS.insuranceExpiryDate],
            });
          }

          const accidentDate =
            data.attributes?.[INSURANCE_ATTRIBUTE_UUIDS.accidentDate] ?? data.attributes?.accidentDate;
          if (!hasAttributeValue(accidentDate)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: t('accidentDateRequired', 'Date of the accident is required'),
              path: ['attributes', INSURANCE_ATTRIBUTE_UUIDS.accidentDate],
            });
          }
        } else if (isCbhiPaymentMode(data.billingTypeUuid, selectedBillingType?.name)) {
          const cbhiId = data.attributes?.[CBHI_ATTRIBUTE_UUIDS.cbhiId] ?? data.attributes?.cbhiId;
          if (!hasAttributeValue(cbhiId)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: t('cbhiIdRequired', 'CBHI ID is required'),
              path: ['attributes', CBHI_ATTRIBUTE_UUIDS.cbhiId],
            });
          }

          const expiryDate =
            data.attributes?.[CBHI_ATTRIBUTE_UUIDS.cbhiExpiryDate] ??
            data.attributes?.cbhiExpiryDate ??
            data.attributes?.expiryDate;
          if (!hasAttributeValue(expiryDate)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: t('cbhiExpiryDateRequired', 'CBHI Expiry Date is required'),
              path: ['attributes', CBHI_ATTRIBUTE_UUIDS.cbhiExpiryDate],
            });
          }
        } else if (isShiPaymentMode(data.billingTypeUuid, selectedBillingType?.name)) {
          const shiId = data.attributes?.[SHI_ATTRIBUTE_UUIDS.shiId] ?? data.attributes?.shiId;
          if (!hasAttributeValue(shiId)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: t('shiIdRequired', 'SHI ID is required'),
              path: ['attributes', SHI_ATTRIBUTE_UUIDS.shiId],
            });
          }

          const expiryDate = data.attributes?.[SHI_ATTRIBUTE_UUIDS.shiExpiryDate] ?? data.attributes?.shiExpiryDate;
          if (!hasAttributeValue(expiryDate)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: t('shiExpiryDateRequired', 'SHI Expiry Date is required'),
              path: ['attributes', SHI_ATTRIBUTE_UUIDS.shiExpiryDate],
            });
          }
        } else if (isCreditCompanyPaymentMode(data.billingTypeUuid, selectedBillingType?.name)) {
          const creditCompany =
            data.attributes?.[CREDIT_COMPANY_ATTRIBUTE_UUIDS.creditCompany] ?? data.attributes?.creditCompany;
          if (!hasAttributeValue(creditCompany)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: t('creditCompanyRequired', 'Credit company is required'),
              path: ['attributes', CREDIT_COMPANY_ATTRIBUTE_UUIDS.creditCompany],
            });
          }
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
  cbhi?: Partial<Record<string, string>>;
  insurance?: Partial<Record<string, string>>;
  shi?: Partial<Record<string, string>>;
  creditCompany?: string;
};

const FIELD_ALIAS_TO_DEFAULT_UUID: Record<string, string> = {
  // Insurance
  insuranceId: INSURANCE_ATTRIBUTE_UUIDS.insuranceId,
  insuranceName: INSURANCE_ATTRIBUTE_UUIDS.insuranceName,
  insuranceCode: INSURANCE_ATTRIBUTE_UUIDS.insuranceCode,
  insuranceZone: INSURANCE_ATTRIBUTE_UUIDS.insuranceZone,
  insuranceExpiryDate: INSURANCE_ATTRIBUTE_UUIDS.insuranceExpiryDate,
  accidentDate: INSURANCE_ATTRIBUTE_UUIDS.accidentDate,
  accidentPlace: INSURANCE_ATTRIBUTE_UUIDS.accidentPlace,
  policeOfficerName: INSURANCE_ATTRIBUTE_UUIDS.policeOfficerName,
  policeOfficerPhone: INSURANCE_ATTRIBUTE_UUIDS.policeOfficerPhone,
  atFaultDriverPlateNo: INSURANCE_ATTRIBUTE_UUIDS.atFaultDriverPlateNo,
  // CBHI
  cbhiRegion: CBHI_ATTRIBUTE_UUIDS.cbhiRegion,
  cbhiZone: CBHI_ATTRIBUTE_UUIDS.cbhiZone,
  cbhiWoreda: CBHI_ATTRIBUTE_UUIDS.cbhiWoreda,
  cbhiId: CBHI_ATTRIBUTE_UUIDS.cbhiId,
  cbhiExpiryDate: CBHI_ATTRIBUTE_UUIDS.cbhiExpiryDate,
  expiryDate: CBHI_ATTRIBUTE_UUIDS.cbhiExpiryDate,
  id: CBHI_ATTRIBUTE_UUIDS.id,
  fullName: CBHI_ATTRIBUTE_UUIDS.fullName,
  accountNo: CBHI_ATTRIBUTE_UUIDS.accountNo,
  membershipType: CBHI_ATTRIBUTE_UUIDS.membershipType,
  insuredId: CBHI_ATTRIBUTE_UUIDS.insuredId,
  // SHI
  shiId: SHI_ATTRIBUTE_UUIDS.shiId,
  shiExpiryDate: SHI_ATTRIBUTE_UUIDS.shiExpiryDate,
  // Credit Company
  creditCompany: CREDIT_COMPANY_ATTRIBUTE_UUIDS.creditCompany,
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

  // Each field is saved as a separate attribute now
  if (attributes) {
    const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

    const addedAttributeUuids = new Set<string>();

    Object.entries(attributes).forEach(([key, value]) => {
      if (!hasAttributeValue(value)) {
        return;
      }

      let targetAttrUuid: string | undefined;
      if (isUuid(key)) {
        targetAttrUuid = key;
      } else {
        // Check config map overrides first, then fallback to default constants
        const cbhiMap = visitAttributeTypeUuidsMap.cbhi as Record<string, string> | undefined;
        const insMap = visitAttributeTypeUuidsMap.insurance as Record<string, string> | undefined;
        const shiMap = visitAttributeTypeUuidsMap.shi as Record<string, string> | undefined;

        targetAttrUuid =
          (key === 'expiryDate' ? cbhiMap?.cbhiExpiryDate || cbhiMap?.expiryDate : cbhiMap?.[key]) ??
          (key === 'cbhiExpiryDate' ? cbhiMap?.cbhiExpiryDate || cbhiMap?.expiryDate : undefined) ??
          insMap?.[key] ??
          shiMap?.[key] ??
          (key === 'creditCompany' ? visitAttributeTypeUuidsMap.creditCompany : undefined) ??
          FIELD_ALIAS_TO_DEFAULT_UUID[key];
      }

      if (targetAttrUuid && !addedAttributeUuids.has(targetAttrUuid)) {
        addedAttributeUuids.add(targetAttrUuid);
        visitAttributePayload.push({
          attributeType: targetAttrUuid,
          value: String(value),
        });
      }
    });
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

/**
 * Saves or updates the patient's lastConsultationDate person attribute with today's date.
 */
export const saveLastConsultationDate = async (patientUuid: string, attributeTypeUuid: string, dateStr?: string) => {
  if (!patientUuid || !attributeTypeUuid) {
    return;
  }
  const dateValue = dateStr || dayjs().format('YYYY-MM-DD');

  // Check if person attribute already exists
  const response = await openmrsFetch(
    `${restBaseUrl}/person/${patientUuid}/attribute?v=custom:(uuid,value,attributeType:(uuid))`,
  );
  const existingAttrs =
    (response?.data?.results as Array<{ uuid: string; value: string; attributeType?: { uuid: string } }> | undefined) ??
    [];
  const existingAttr = existingAttrs.find((attr) => attr.attributeType?.uuid === attributeTypeUuid);

  if (existingAttr?.uuid) {
    return openmrsFetch(`${restBaseUrl}/person/${patientUuid}/attribute/${existingAttr.uuid}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ value: dateValue }),
    });
  } else {
    return openmrsFetch(`${restBaseUrl}/person/${patientUuid}/attribute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        attributeType: attributeTypeUuid,
        value: dateValue,
      }),
    });
  }
};
