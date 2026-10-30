import { useMemo } from 'react';

export const useBillingType = (billingTypes: any[], billingTypeUuid?: string) => {
  const selectedBillingType = useMemo(
    () => billingTypes.find((bt) => bt.uuid === billingTypeUuid),
    [billingTypes, billingTypeUuid],
  );

  return {
    selectedBillingType,
  };
};
