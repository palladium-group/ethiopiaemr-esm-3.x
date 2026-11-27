import { useEffect, useRef } from 'react';
import { UseFormSetValue } from 'react-hook-form';
import {
  CBHI_VISIT_ATTRIBUTE_FIELDS,
  type BillingFormData,
  type CbhiVisitAttributeField,
} from '../billing-information.resource';
import type { ClinicalWorkflowConfig } from '../../../config-schema';

type VisitAttribute = {
  uuid: string;
  attributeType: {
    uuid: string;
  };
  value: string;
};

type UsePopulateBillingFormFromVisitParams = {
  activeVisit?: {
    uuid?: string;
    attributes?: VisitAttribute[];
  };
  billingTypes: Array<{ uuid: string; name?: string }>;
  billingVisitAttributeTypes: ClinicalWorkflowConfig['billingVisitAttributeTypes'];
  setValue: UseFormSetValue<BillingFormData>;
  hasValidCard?: boolean;
  lastVisitPaymentMethodUuid?: string | null;
};

/**
 * Hook to populate billing form fields from existing visit attributes
 */
export const usePopulateBillingFormFromVisit = ({
  activeVisit,
  billingTypes,
  billingVisitAttributeTypes,
  setValue,
  hasValidCard = false,
  lastVisitPaymentMethodUuid,
}: UsePopulateBillingFormFromVisitParams) => {
  // Track if form has been populated from visit attributes
  const hasPopulatedFormRef = useRef(false);

  // If active visit has no payment method yet, but the patient's card is valid,
  // auto-populate the payment method from their previous visit
  useEffect(() => {
    if (!hasValidCard || !lastVisitPaymentMethodUuid || !billingTypes || billingTypes.length === 0) {
      return;
    }

    const hasActivePaymentMethod = activeVisit?.attributes?.some(
      (attr) => attr.attributeType.uuid === billingVisitAttributeTypes.paymentMethod,
    );

    if (!hasActivePaymentMethod && !hasPopulatedFormRef.current) {
      const matchingType = billingTypes.find((bt) => bt.uuid === lastVisitPaymentMethodUuid);
      if (matchingType) {
        setValue('billingTypeUuid', lastVisitPaymentMethodUuid, { shouldDirty: true });
      }
    }
  }, [
    hasValidCard,
    lastVisitPaymentMethodUuid,
    activeVisit?.attributes,
    billingTypes,
    billingVisitAttributeTypes?.paymentMethod,
    setValue,
  ]);

  // Populate form with existing billing information from visit attributes
  useEffect(() => {
    if (!activeVisit?.attributes || !billingTypes || billingTypes.length === 0 || hasPopulatedFormRef.current) {
      return;
    }

    // Find Payment Method attribute (billingTypeUuid)
    const paymentMethodAttribute = activeVisit.attributes.find(
      (attr) => attr.attributeType.uuid === billingVisitAttributeTypes.paymentMethod,
    );

    // Find Payment Attributes Summary attribute
    const paymentAttributesSummaryAttribute = activeVisit.attributes.find(
      (attr) => attr.attributeType.uuid === billingVisitAttributeTypes.paymentAttributesSummary,
    );

    // If no payment method found, don't populate
    if (!paymentMethodAttribute) {
      return;
    }

    const existingBillingTypeUuid = paymentMethodAttribute.value;

    // Set billing type UUID
    setValue('billingTypeUuid', existingBillingTypeUuid, { shouldDirty: false });

    // Populate form with all visit attributes
    activeVisit.attributes.forEach((attr) => {
      if (attr.attributeType.uuid !== billingVisitAttributeTypes.paymentMethod) {
        setValue(`attributes.${attr.attributeType.uuid}`, attr.value, { shouldDirty: false });
      }
    });

    // Parse legacy Payment Attributes Summary if it exists
    let parsedAttributes: Record<string, any> = {};
    if (paymentAttributesSummaryAttribute?.value) {
      try {
        parsedAttributes = JSON.parse(paymentAttributesSummaryAttribute.value);
      } catch (error) {
        console.error('Error parsing payment attributes summary:', error);
      }
    }

    // Populate attributes from parsed legacy summary
    Object.entries(parsedAttributes).forEach(([attrTypeUuid, value]) => {
      setValue(`attributes.${attrTypeUuid}`, value, { shouldDirty: false });
    });

    // Backwards compatibility aliases
    const cbhiAttributeTypes = billingVisitAttributeTypes.cbhi || {};
    CBHI_VISIT_ATTRIBUTE_FIELDS.forEach((field: CbhiVisitAttributeField) => {
      const attributeTypeUuid = cbhiAttributeTypes[field];
      const val =
        (attributeTypeUuid
          ? activeVisit.attributes?.find((a) => a.attributeType.uuid === attributeTypeUuid)?.value
          : undefined) ??
        parsedAttributes[field] ??
        (attributeTypeUuid ? parsedAttributes[attributeTypeUuid] : undefined);

      if (val !== undefined && val !== null && val !== '') {
        setValue(`attributes.${field}`, val, { shouldDirty: false });
        if (attributeTypeUuid) {
          setValue(`attributes.${attributeTypeUuid}`, val, { shouldDirty: false });
        }
      }
    });

    const expiryVal =
      activeVisit.attributes?.find(
        (a) =>
          a.attributeType.uuid ===
          ((cbhiAttributeTypes as Record<string, string | undefined>)?.cbhiExpiryDate ||
            '77704fac-33eb-4732-acb0-8c2b0b2a256f'),
      )?.value ??
      parsedAttributes.expiryDate ??
      parsedAttributes.cbhiExpiryDate;

    if (expiryVal) {
      setValue('attributes.expiryDate', expiryVal, { shouldDirty: false });
      setValue('attributes.cbhiExpiryDate', expiryVal, { shouldDirty: false });
    }

    // Mark as populated
    hasPopulatedFormRef.current = true;
  }, [activeVisit?.uuid, activeVisit?.attributes, billingTypes, billingVisitAttributeTypes, setValue]);

  // Reset the populated flag when visit changes
  useEffect(() => {
    hasPopulatedFormRef.current = false;
  }, [activeVisit?.uuid]);
};
