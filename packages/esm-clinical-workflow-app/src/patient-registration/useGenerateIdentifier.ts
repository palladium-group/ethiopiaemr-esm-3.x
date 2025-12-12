import useSWR from 'swr';
import { generateIdentifier } from './patient-registration.resource';

interface UseGenerateIdentifierReturn {
  identifierData: any;
  identifier: string | undefined;
  isLoading: boolean;
  error: any;
}

export const useGenerateIdentifier = (identifierSourceUuid: string | undefined): UseGenerateIdentifierReturn => {
  const {
    data: identifierData,
    error,
    isLoading,
  } = useSWR(identifierSourceUuid ? 'generateIdentifier' : null, () => generateIdentifier(identifierSourceUuid!));

  const identifier = identifierData?.data ? (identifierData.data as any)?.identifier : undefined;

  return {
    identifierData,
    identifier,
    isLoading,
    error,
  };
};
