import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { z } from 'zod';
// Create the billing form schema factory with conditional validation based on skip logic
import type { TFunction } from 'i18next';

export const createBillingFormSchema = (
  t: TFunction,
  billingTypes?: Array<{ uuid: string; name?: string; attributeTypes?: Array<{ uuid: string; required?: boolean }> }>,
) => {
  return z
    .object({
      billingTypeUuid: z.string().optional(),
      creditSubType: z.string().optional(),
      freeSubType: z.string().optional(),
      attributes: z.record(z.string(), z.any()).optional(),
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
    paymentAttributesSummary?: string;
  },
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

  // Save sub attributes (from attributes object) as a stringified object under the paymentAttributesSummary key
  // Format: {attributeUuid: value}
  // Only includes sub attributes, not the main paymentMethod attribute
  if (visitAttributeTypeUuidsMap.paymentAttributesSummary && attributes) {
    const paymentAttributesObject: Record<string, any> = {};

    // Add sub attributes from the attributes object using their UUIDs as keys
    Object.entries(attributes).forEach(([attrTypeUuid, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        paymentAttributesObject[attrTypeUuid] = value;
      }
    });

    // Only add the summary if there are sub attributes to save
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

/**
 * Creates or updates visit attributes with billing information
 * If attributes already exist, uses the update endpoint for each attribute
 * Otherwise, uses the create endpoint
 */
export const updateVisitWithBillingInformation = async (
  visitAttributePayload: Array<{ attributeType: { uuid: string } | string; value: string }>,
  visitUuid: string,
  existingVisitAttributes?: VisitAttribute[],
) => {
  if (!visitUuid) {
    throw new Error('Visit UUID is required');
  }

  // If we have existing attributes, update them individually
  if (existingVisitAttributes && existingVisitAttributes.length > 0) {
    const updatePromises: Promise<any>[] = [];

    for (const payload of visitAttributePayload) {
      const attributeTypeUuid =
        typeof payload.attributeType === 'string' ? payload.attributeType : payload.attributeType.uuid;

      // Find existing attribute with matching attribute type
      const existingAttribute = existingVisitAttributes.find((attr) => attr.attributeType.uuid === attributeTypeUuid);

      if (existingAttribute) {
        // Update existing attribute
        updatePromises.push(updateVisitAttribute(visitUuid, existingAttribute.uuid, payload.value));
      } else {
        // Create new attribute using the original endpoint
        updatePromises.push(
          openmrsFetch(`${restBaseUrl}/visit/${visitUuid}`, {
            method: 'POST',
            headers: {
              'Content-type': 'application/json',
            },
            body: {
              attributes: [payload],
            },
          }),
        );
      }
    }

    // Wait for all updates to complete
    const results = await Promise.all(updatePromises);
    // Return the first successful response (they should all succeed or all fail)
    return results[0];
  }

  // No existing attributes, use the create endpoint
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
