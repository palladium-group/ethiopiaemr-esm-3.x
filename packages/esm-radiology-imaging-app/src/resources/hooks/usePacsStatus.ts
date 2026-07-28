import useSWR from 'swr';
import { checkPacsHealth } from '../pacs.resource';

export function usePacsStatus() {
  const { data, isLoading } = useSWR<boolean>('pacs-health', checkPacsHealth, {
    refreshInterval: 30_000,
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  return {
    isOnline: data ?? true,
    isLoading,
  };
}
