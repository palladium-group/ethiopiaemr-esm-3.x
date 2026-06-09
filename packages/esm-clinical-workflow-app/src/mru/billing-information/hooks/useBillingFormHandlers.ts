import { useCallback, useEffect, useMemo, useRef } from 'react';
import { UseFormGetValues, UseFormSetValue } from 'react-hook-form';
import type { BillingFormData } from '../billing-information.resource';

type BillingTypeFormState = {
  attributes: Record<string, unknown>;
  creditSubType?: string;
};

type UseBillingFormHandlersParams = {
  billingTypeUuid?: string;
  billingTypes: Array<{ uuid: string; name?: string }>;
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

  setValue('creditSubType', cachedState?.creditSubType, { shouldDirty: false });
  setValue('attributes', cachedAttributes, { shouldDirty: false });

  Object.entries(cachedAttributes).forEach(([attrTypeUuid, value]) => {
    setValue(`attributes.${attrTypeUuid}`, value, { shouldDirty: false });
  });
};

/**
 * Hook to handle billing form interactions (billing type changes, content switcher, etc.)
 */
export const useBillingFormHandlers = ({
  billingTypeUuid,
  billingTypes,
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
          creditSubType: currentValues.creditSubType,
        };
      }

      const cachedState = billingTypeStateCacheRef.current[uuid];

      setValue('billingTypeUuid', uuid, { shouldDirty: true });
      restoreBillingTypeState(cachedState, getValues, setValue);
    },
    [billingTypeUuid, getValues, setValue],
  );

  const selectedIndex = useMemo(() => {
    if (!billingTypeUuid) {
      return -1;
    }
    return billingTypes.findIndex((bt) => bt.uuid === billingTypeUuid);
  }, [billingTypeUuid, billingTypes]);

  const handleContentSwitcherChange = useCallback(
    ({ index }: { index: number }) => {
      if (index >= 0 && index < billingTypes.length) {
        handleBillingTypeChange(billingTypes[index].uuid);
      }
    },
    [billingTypes, handleBillingTypeChange],
  );

  return {
    handleBillingTypeChange,
    selectedIndex,
    handleContentSwitcherChange,
  };
};
