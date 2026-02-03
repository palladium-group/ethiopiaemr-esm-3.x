import { useCallback, useMemo } from 'react';
import { UseFormSetValue } from 'react-hook-form';
import type { BillingFormData } from '../billing-information.resource';

type UseBillingFormHandlersParams = {
  billingTypeUuid?: string;
  billingTypes: Array<{ uuid: string; name?: string }>;
  setValue: UseFormSetValue<BillingFormData>;
};

/**
 * Hook to handle billing form interactions (billing type changes, content switcher, etc.)
 */
export const useBillingFormHandlers = ({ billingTypeUuid, billingTypes, setValue }: UseBillingFormHandlersParams) => {
  const handleBillingTypeChange = useCallback(
    (uuid: string) => {
      // Clear attributes and sub-types when changing billing type
      setValue('billingTypeUuid', uuid, { shouldDirty: true });
      setValue('creditSubType', undefined, { shouldDirty: false });
      setValue('freeSubType', undefined, { shouldDirty: false });
      setValue('attributes', {}, { shouldDirty: false });
    },
    [setValue],
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
