import useSWR from 'swr';
import { openmrsFetch } from '@openmrs/esm-framework';

import { isExcludedPaymentMode } from '../billing-constants';

export const usePaymentModes = () => {
  const paymentModesUrl = `/ws/rest/v1/cashier/paymentMode?v=full`;
  const {
    data: paymentModesData,
    error,
    isLoading,
  } = useSWR<{ data: { results: any[] } }>(paymentModesUrl, openmrsFetch);

  const allBillingTypes = paymentModesData?.data?.results || [];
  const billingTypes = allBillingTypes.filter((mode) => !isExcludedPaymentMode(mode));

  return {
    billingTypes,
    isLoading,
    error,
  };
};
