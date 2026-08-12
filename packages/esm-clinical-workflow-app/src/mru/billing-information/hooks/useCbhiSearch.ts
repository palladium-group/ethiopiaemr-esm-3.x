import { openmrsFetch, restBaseUrl, useDebounce } from '@openmrs/esm-framework';
import useSWR from 'swr';

export type CbhiEligibilityMember = {
  id: string;
  fullName: string;
  accountNo: string | null;
  membershipType: string | null;
  cbhiId: string;
  insuredId: string | null;
  gender?: string | null;
  age?: number | null;
  status?: string | null;
  relationshipType?: string | null;
  firstName?: string | null;
  fathersName?: string | null;
  grandFathersName?: string | null;
};

export type CbhiEligibilityPage = {
  content: CbhiEligibilityMember[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  empty?: boolean;
};

export type CbhiEligibilityApiResponse = {
  data: CbhiEligibilityPage;
  message: string | null;
  success: boolean;
  notFound?: boolean;
  serviceUnavailable?: boolean;
};

export type CbhiPersistFields = Pick<
  CbhiEligibilityMember,
  'id' | 'fullName' | 'accountNo' | 'membershipType' | 'cbhiId' | 'insuredId'
>;

export type UseCbhiSearchResult = {
  results: CbhiEligibilityMember[];
  isLoading: boolean;
  error: Error | undefined;
};

export const useCbhiSearch = (searchTerm: string): UseCbhiSearchResult => {
  const debouncedSearchTerm = useDebounce(searchTerm.trim(), 300);
  const shouldSearch = debouncedSearchTerm.length >= 2;

  const url = shouldSearch
    ? `${restBaseUrl}/ethiopiaemrcustommodule/cbhi/eligibility?${new URLSearchParams({
        searchTerm: debouncedSearchTerm,
        page: '1',
        limit: '25',
        sortBy: 'id',
        sortDirection: 'desc',
      }).toString()}`
    : null;

  const { data, error, isLoading } = useSWR<{ data: CbhiEligibilityApiResponse }>(url, openmrsFetch);

  return {
    results: data?.data?.data?.content ?? [],
    isLoading: Boolean(shouldSearch && isLoading),
    error,
  };
};
