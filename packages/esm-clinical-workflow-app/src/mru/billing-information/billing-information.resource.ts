import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { z } from 'zod';
// Create the billing form schema factory with conditional validation based on skip logic
export const createBillingFormSchema = (t: (key: string, defaultValue?: string) => string) => {
  return z
    .object({
      billingType: z.enum(['credit', 'free', 'cash']).optional(),
      creditType: z.string().optional(),
      name: z.string().optional(),
      code: z.string().optional(),
      id: z.string().optional(),
      expiryDate: z.string().optional(),
      zone: z.string().optional(),
      freeType: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      // Billing type is required on submit
      if (!data.billingType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('billingTypeRequired', 'Billing type is required'),
          path: ['billingType'],
        });
        return;
      }

      // Credit billing type validation
      if (data.billingType === 'credit') {
        // Credit type is required
        if (!data.creditType || data.creditType.trim() === '') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t('creditTypeRequired', 'Credit type is required'),
            path: ['creditType'],
          });
        }

        // If creditType is insurance, require additional fields
        if (data.creditType === 'insurance') {
          if (!data.id || data.id.trim() === '') {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: t('idRequired', 'ID is required'),
              path: ['id'],
            });
          }
        }
      }

      // Free billing type validation
      if (data.billingType === 'free') {
        if (!data.freeType || data.freeType.trim() === '') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t('freeTypeRequired', 'Free type is required'),
            path: ['freeType'],
          });
        }
      }
    });
};

export type BillingFormData = z.infer<ReturnType<typeof createBillingFormSchema>>;

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
  visitAttributeTypeUuidsMap: {
    paymentMethod: string;
    creditType: string;
    creditTypeDetails: string;
    freeType: string;
  },
) => {
  const { billingType, creditType, name, code, id, expiryDate, zone, freeType } = billingFormData;

  const formObject = {
    paymentMethod: billingType,
    creditType: creditType,
    creditTypeDetails: {
      name: name,
      code: code,
      id: id,
      expiryDate: expiryDate,
      zone: zone,
    },
    freeType: freeType,
  };

  const visitAttributePayload = transformFormObjectToVisitAttributes(formObject, visitAttributeTypeUuidsMap);

  return visitAttributePayload;
};

export const updateVisitWithBillingInformation = (
  visitAttributePayload: Array<{ attributeType: string; value: string }>,
  visitUuid: string,
) => {
  return openmrsFetch(`${restBaseUrl}/visit/${visitUuid}`, {
    method: 'POST',
    headers: {
      'Content-type': 'application/json',
    },
    body: {
      attributes: visitAttributePayload,
    },
  });
};
