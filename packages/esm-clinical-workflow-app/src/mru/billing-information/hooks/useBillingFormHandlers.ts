import { useCallback, useEffect, useRef } from 'react';
import { UseFormGetValues, UseFormSetValue } from 'react-hook-form';
import type { BillingFormData } from '../billing-information.resource';

type BillingTypeFormState = {
  attributes: Record<string, unknown>;
};

type UseBillingFormHandlersParams = {
  billingTypeUuid?: string;
  visitUuid?: string;
  getValues: UseFormGetValues<BillingFormData>;
  setValue: UseFormSetValue<BillingFormData>;
};

const restoreBillingTypeState = (
  cachedState: BillingTypeFormState | undefined,
  getValues: UseFormGetValues<BillingFormData>,
  setValue: UseFormSetValue<BillingFormData>,
) => {
  const currentAttributes = getValues('attributes') || {};
  const cachedAttributes = cachedState?.attributes ?? {};

  Object.keys(currentAttributes).forEach((attrTypeUuid) => {
    setValue(`attributes.${attrTypeUuid}`, undefined, { shouldDirty: false });
  });

  setValue('attributes', cachedAttributes, { shouldDirty: false });

  Object.entries(cachedAttributes).forEach(([attrTypeUuid, value]) => {
    setValue(`attributes.${attrTypeUuid}`, value, { shouldDirty: false });
  });
};

/**
 * Hook to handle billing form payment mode selection and attribute cache management
 */
export const useBillingFormHandlers = ({
  billingTypeUuid,
  visitUuid,
  getValues,
  setValue,
}: UseBillingFormHandlersParams) => {
  const billingTypeStateCacheRef = useRef<Record<string, BillingTypeFormState>>({});

  useEffect(() => {
    billingTypeStateCacheRef.current = {};
  }, [visitUuid]);

  const handleBillingTypeChange = useCallback(
    (uuid: string) => {
      if (uuid === billingTypeUuid) {
        return;
      }

      const currentValues = getValues();
      const currentBillingTypeUuid = currentValues.billingTypeUuid;

      if (currentBillingTypeUuid) {
        billingTypeStateCacheRef.current[currentBillingTypeUuid] = {
          attributes: { ...(currentValues.attributes || {}) },
        };
      }

      const cachedState = billingTypeStateCacheRef.current[uuid];

      setValue('billingTypeUuid', uuid, { shouldDirty: true });
      restoreBillingTypeState(cachedState, getValues, setValue);
    },
    [billingTypeUuid, getValues, setValue],
  );

  return {
    handleBillingTypeChange,
  };
};
