import { useEffect, useState } from 'react';
import { cbhiMockData, type CbhiRecord } from '../cbhi-mock-data';

// Placeholder URL for the future CBHI search API.
// When the API is ready, replace the implementation inside this hook
// with an openmrsFetch call that uses this URL.
export const CBHI_SEARCH_API_URL = '/cbhi/search';

export type UseCbhiSearchResult = {
  results: CbhiRecord[];
  isLoading: boolean;
};

export const useCbhiSearch = (searchTerm: string): UseCbhiSearchResult => {
  const [results, setResults] = useState<CbhiRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const trimmed = searchTerm.trim();

    if (!trimmed || trimmed.length < 3) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Simulate async API behavior so that swapping in the real API
    // later does not affect the rest of the UI.
    const handle = setTimeout(() => {
      const lower = trimmed.toLowerCase();
      const filtered = cbhiMockData.filter((record) => record.identification_number.toLowerCase().includes(lower));

      setResults(filtered);
      setIsLoading(false);
    }, 200);

    return () => clearTimeout(handle);
  }, [searchTerm]);

  return { results, isLoading };
};
