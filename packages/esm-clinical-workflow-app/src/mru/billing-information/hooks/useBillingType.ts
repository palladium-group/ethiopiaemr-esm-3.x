import { useMemo } from 'react';

export const useBillingType = (billingTypes: any[], billingTypeUuid?: string) => {
  const selectedBillingType = useMemo(
    () => billingTypes.find((bt) => bt.uuid === billingTypeUuid),
    [billingTypes, billingTypeUuid],
  );

  const isCreditType = useMemo(() => selectedBillingType?.name?.toLowerCase() === 'credit', [selectedBillingType]);

  const isFreeType = useMemo(() => selectedBillingType?.name?.toLowerCase() === 'free', [selectedBillingType]);

  return {
    selectedBillingType,
    isCreditType,
    isFreeType,
  };
};
