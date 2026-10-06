import { renderHook } from '@testing-library/react';
import { useFhirFetchAll } from '@openmrs/esm-framework';
import { useQueueLocations } from './queue-entries.resource';

jest.mock('@openmrs/esm-framework', () => ({
  ...jest.requireActual('@openmrs/esm-framework'),
  useFhirFetchAll: jest.fn(),
  getLocale: () => 'en',
}));

const mockUseFhirFetchAll = useFhirFetchAll as jest.Mock;

describe('useQueueLocations', () => {
  it('sorts the queue locations by name', () => {
    mockUseFhirFetchAll.mockReturnValue({
      data: [
        { id: 'b', name: 'Triage' },
        { id: 'a', name: 'Cashier' },
      ],
      isLoading: false,
    });

    const { result } = renderHook(() => useQueueLocations());

    expect(result.current.queueLocations.map((location) => location.id)).toEqual(['a', 'b']);
  });

  it('ignores empty entries and locations without a name', () => {
    mockUseFhirFetchAll.mockReturnValue({ data: [undefined, { id: 'a' }, null], isLoading: false });

    const { result } = renderHook(() => useQueueLocations());

    expect(result.current.queueLocations).toEqual([{ id: 'a' }]);
  });

  it('returns an empty list when the only result is an empty entry', () => {
    mockUseFhirFetchAll.mockReturnValue({ data: [undefined], isLoading: false });

    const { result } = renderHook(() => useQueueLocations());

    expect(result.current.queueLocations).toEqual([]);
  });
});
