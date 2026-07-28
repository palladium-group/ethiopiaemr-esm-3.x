import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import useSWR from 'swr';
import { type Procedure, type ProcedureListResponse } from '../../types';

export const useProcedures = (reportType: string) => {
  const url = `${restBaseUrl}/procedure?reportType=${reportType}&v=full`;
  const { data, isLoading, error, mutate } = useSWR<{ data: ProcedureListResponse }>(url, openmrsFetch);
  return {
    orders: data?.data?.results ?? [],
    isLoading,
    error,
    mutate,
  };
};

export const useProcedure = (procedureUuid: string) => {
  const url = procedureUuid ? `${restBaseUrl}/procedure/${procedureUuid}?v=full` : null;
  const { data, isLoading, error } = useSWR<{ data: Procedure }>(url, openmrsFetch);
  return {
    procedure: data?.data ?? null,
    isLoading,
    error,
  };
};
