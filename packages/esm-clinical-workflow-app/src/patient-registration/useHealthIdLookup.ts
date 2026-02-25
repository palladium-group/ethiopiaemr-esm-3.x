import useSWR from 'swr';
import { fetchPatientByHealthId, type HealthIdPatient } from './patient-registration.resource';

interface UseHealthIdLookupReturn {
  patient: HealthIdPatient | null;
  isLoading: boolean;
  isNotFound: boolean;
  error: Error | null;
}

export function useHealthIdLookup(submittedHealthId: string | null, lookupUrl: string): UseHealthIdLookupReturn {
  const swrKey = submittedHealthId && lookupUrl ? ['healthIdLookup', submittedHealthId, lookupUrl] : null;

  const { data, error, isLoading } = useSWR<HealthIdPatient>(
    swrKey,
    () => fetchPatientByHealthId(submittedHealthId!, lookupUrl),
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );

  const isNotFound = !isLoading && (!!error || (!!data && !data.success));
  const patient = data?.success ? data : null;

  return { patient, isLoading, isNotFound, error: error ?? null };
}
