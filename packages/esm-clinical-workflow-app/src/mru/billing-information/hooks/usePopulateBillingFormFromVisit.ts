import { useEffect, useRef } from 'react';
import { UseFormSetValue } from 'react-hook-form';
import type { BillingFormData } from '../billing-information.resource';
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
};

/**
 * Hook to populate billing form fields from existing visit attributes
 */
export const usePopulateBillingFormFromVisit = ({
  activeVisit,
  billingTypes,
  billingVisitAttributeTypes,
  setValue,
}: UsePopulateBillingFormFromVisitParams) => {
  // Track if form has been populated from visit attributes
  const hasPopulatedFormRef = useRef(false);

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

    // Parse Payment Attributes Summary if it exists
    let parsedAttributes: Record<string, any> = {};
    if (paymentAttributesSummaryAttribute?.value) {
      try {
        parsedAttributes = JSON.parse(paymentAttributesSummaryAttribute.value);
      } catch (error) {
        console.error('Error parsing payment attributes summary:', error);
      }
    }

    // Determine sub-type based on attributes
    if (billingVisitAttributeTypes.freeType && parsedAttributes[billingVisitAttributeTypes.freeType]) {
      const freeSubTypeValue = parsedAttributes[billingVisitAttributeTypes.freeType];
      setValue('freeSubType', freeSubTypeValue, { shouldDirty: false });
      // Set the freeType attribute
      setValue(`attributes.${billingVisitAttributeTypes.freeType}`, freeSubTypeValue, { shouldDirty: false });
    }

    if (billingVisitAttributeTypes.creditType && parsedAttributes[billingVisitAttributeTypes.creditType]) {
      const creditSubTypeValue = parsedAttributes[billingVisitAttributeTypes.creditType];
      setValue('creditSubType', creditSubTypeValue, { shouldDirty: false });
      // Set the creditType attribute
      setValue(`attributes.${billingVisitAttributeTypes.creditType}`, creditSubTypeValue, { shouldDirty: false });
    }

    // Populate all other attributes from the parsed summary
    Object.entries(parsedAttributes).forEach(([attrTypeUuid, value]) => {
      // Skip freeType and creditType as they're already handled above
      if (
        attrTypeUuid !== billingVisitAttributeTypes.freeType &&
        attrTypeUuid !== billingVisitAttributeTypes.creditType
      ) {
        setValue(`attributes.${attrTypeUuid}`, value, { shouldDirty: false });
      }
    });

    // Mark as populated
    hasPopulatedFormRef.current = true;
  }, [activeVisit?.uuid, activeVisit?.attributes, billingTypes, billingVisitAttributeTypes, setValue]);

  // Reset the populated flag when visit changes
  useEffect(() => {
    hasPopulatedFormRef.current = false;
  }, [activeVisit?.uuid]);
};
