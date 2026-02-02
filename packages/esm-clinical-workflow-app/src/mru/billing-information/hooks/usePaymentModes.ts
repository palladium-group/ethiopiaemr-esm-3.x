import useSWR from 'swr';
import { openmrsFetch } from '@openmrs/esm-framework';

export const usePaymentModes = () => {
  const paymentModesUrl = `/ws/rest/v1/cashier/paymentMode?v=full`;
  const {
    data: paymentModesData,
    error,
    isLoading,
  } = useSWR<{ data: { results: any[] } }>(paymentModesUrl, openmrsFetch);

  return {
    billingTypes: paymentModesData?.data?.results || [],
    isLoading,
    error,
  };
};
