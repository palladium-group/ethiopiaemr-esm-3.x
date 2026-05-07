import { useMemo } from 'react';

export const useBillingType = (billingTypes: any[], billingTypeUuid?: string) => {
  const selectedBillingType = useMemo(
    () => billingTypes.find((bt) => bt.uuid === billingTypeUuid),
    [billingTypes, billingTypeUuid],
  );

  const isCreditType = useMemo(() => selectedBillingType?.name?.toLowerCase() === 'credit', [selectedBillingType]);

  return {
    selectedBillingType,
    isCreditType,
  };
};
