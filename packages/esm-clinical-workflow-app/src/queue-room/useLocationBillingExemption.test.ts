import { renderHook } from '@testing-library/react';
import useSWR from 'swr';
import { useSession } from '@openmrs/esm-framework';
import {
  extractExemptLocationNames,
  isLocationMatchingExemptions,
  unescapeHtml,
  useLocationBillingExemption,
  EXEMPTIONS_GLOBAL_PROPERTY,
} from './useLocationBillingExemption';

jest.mock('@openmrs/esm-framework', () => ({
  ...jest.requireActual('@openmrs/esm-framework'),
  useSession: jest.fn(),
  openmrsFetch: jest.fn(),
  restBaseUrl: '/ws/rest/v1',
}));

jest.mock('swr', () => jest.fn());

const mockExemptionsJson = JSON.stringify({
  services: {
    'location:Obstetric And Gynecologic ER': [
      {
        concept: '228AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        description: 'Antepartum Hemorrhage',
      },
    ],
    'location:OPD 15 - ANC:all': [],
    'location:NICU:all': [],
    'location:ART:all': [],
    'location:Exempted Location': [
      {
        concept: '1019AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        description: 'CBC',
      },
      {
        concept: '167410AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        description: 'Consultation ',
      },
    ],
  },
  commodities: {},
});

describe('useLocationBillingExemption utilities', () => {
  describe('unescapeHtml', () => {
    it('unescapes HTML entities properly', () => {
      expect(unescapeHtml('location:Gynecology &amp; Obstetric:all')).toBe('location:Gynecology & Obstetric:all');
      expect(unescapeHtml('location:&quot;Test&quot;:all')).toBe('location:"Test":all');
      expect(unescapeHtml('location:Double &amp;amp; Escaped:all')).toBe('location:Double & Escaped:all');
    });
  });

  describe('extractExemptLocationNames', () => {
    it('extracts locations with :all suffix from services and excludes non-all locations', () => {
      const names = extractExemptLocationNames(mockExemptionsJson);
      expect(names).toEqual(['OPD 15 - ANC', 'NICU', 'ART']);
      expect(names).not.toContain('Obstetric And Gynecologic ER');
      expect(names).not.toContain('Exempted Location');
    });

    it('returns empty array when json is empty, null or invalid', () => {
      expect(extractExemptLocationNames(null)).toEqual([]);
      expect(extractExemptLocationNames('')).toEqual([]);
      expect(extractExemptLocationNames('{ invalid json }')).toEqual([]);
      expect(extractExemptLocationNames(JSON.stringify({ commodities: {} }))).toEqual([]);
    });

    it('handles escaped keys and whitespace', () => {
      const json = JSON.stringify({
        services: {
          'location: MCH &amp; ANC :all': [],
        },
      });
      expect(extractExemptLocationNames(json)).toEqual(['MCH & ANC']);
    });
  });

  describe('isLocationMatchingExemptions', () => {
    const exemptLocations = ['OPD 15 - ANC', 'NICU'];

    it('matches by location name case-insensitively', () => {
      expect(isLocationMatchingExemptions(exemptLocations, { name: 'opd 15 - anc' })).toBe(true);
      expect(isLocationMatchingExemptions(exemptLocations, { name: 'NICU' })).toBe(true);
    });

    it('matches by location display case-insensitively', () => {
      expect(isLocationMatchingExemptions(exemptLocations, { display: 'OPD 15 - ANC' })).toBe(true);
    });

    it('returns false for non-matching location or null', () => {
      expect(isLocationMatchingExemptions(exemptLocations, { name: 'General OPD' })).toBe(false);
      expect(isLocationMatchingExemptions(exemptLocations, null)).toBe(false);
      expect(isLocationMatchingExemptions([], { name: 'OPD 15 - ANC' })).toBe(false);
    });
  });
});

describe('useLocationBillingExemption hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSession as jest.Mock).mockReturnValue({
      sessionLocation: {
        uuid: 'anc-loc-uuid',
        name: 'OPD 15 - ANC',
        display: 'OPD 15 - ANC',
      },
    });

    (useSWR as unknown as jest.Mock).mockReturnValue({
      data: {
        data: {
          results: [
            {
              uuid: 'setting-1',
              property: EXEMPTIONS_GLOBAL_PROPERTY,
              value: mockExemptionsJson,
            },
          ],
        },
      },
      isLoading: false,
      error: null,
    });
  });

  it('identifies when session location is exempted for all services', () => {
    const { result } = renderHook(() => useLocationBillingExemption());
    expect(result.current.isLocationExempted).toBe(true);
    expect(result.current.exemptLocationNames).toEqual(['OPD 15 - ANC', 'NICU', 'ART']);
    expect(result.current.isLoading).toBe(false);
  });

  it('identifies when target location is exempted even if session location is not', () => {
    (useSession as jest.Mock).mockReturnValue({
      sessionLocation: {
        uuid: 'other-loc-uuid',
        name: 'General OPD',
        display: 'General OPD',
      },
    });

    const { result } = renderHook(() => useLocationBillingExemption({ name: 'NICU' }));
    expect(result.current.isLocationExempted).toBe(true);
  });

  it('returns false when neither session nor target location is exempted', () => {
    (useSession as jest.Mock).mockReturnValue({
      sessionLocation: {
        uuid: 'other-loc-uuid',
        name: 'General OPD',
        display: 'General OPD',
      },
    });

    const { result } = renderHook(() => useLocationBillingExemption({ name: 'Dental Clinic' }));
    expect(result.current.isLocationExempted).toBe(false);
  });

  it('handles loading state', () => {
    (useSWR as unknown as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    const { result } = renderHook(() => useLocationBillingExemption());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isLocationExempted).toBe(false);
  });
});
