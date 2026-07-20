import { openmrsFetch } from '@openmrs/esm-framework';
import {
  getApiErrorMessage,
  getElectiveSurgeryScheduleContactUrl,
  getElectiveSurgeryScheduleReadyToAdmitUrl,
  getElectiveSurgeryScheduleRemoveUrl,
  getElectiveSurgeryScheduleReturnUrl,
  getElectiveSurgeryScheduleUrl,
  getNearDeadlineUrl,
  parseNearDeadlineResponse,
  parseScheduleListResponse,
} from './elective-surgery-schedule.resource';

jest.mock('@openmrs/esm-framework', () => ({
  openmrsFetch: jest.fn(),
  restBaseUrl: '/openmrs/ws/rest/v1',
}));

const mockedOpenmrsFetch = openmrsFetch as jest.MockedFunction<typeof openmrsFetch>;

describe('elective-surgery-schedule.resource', () => {
  beforeEach(() => {
    mockedOpenmrsFetch.mockReset();
  });

  describe('URL builders', () => {
    it('builds list URL with category and showRemoved params', () => {
      const url = getElectiveSurgeryScheduleUrl({ category: 'A', showRemoved: true });
      expect(url).toBe('/openmrs/ws/rest/v1/ethiopiaemrcore/elective-surgery-schedule?category=A&showRemoved=true');
    });

    it('builds mutation URLs', () => {
      const uuid = 'schedule-uuid';
      expect(getElectiveSurgeryScheduleContactUrl(uuid)).toContain(`/elective-surgery-schedule/${uuid}/contact`);
      expect(getElectiveSurgeryScheduleReadyToAdmitUrl(uuid)).toContain(
        `/elective-surgery-schedule/${uuid}/ready-to-admit`,
      );
      expect(getElectiveSurgeryScheduleReturnUrl(uuid)).toContain(
        `/elective-surgery-schedule/${uuid}/return-from-admission`,
      );
      expect(getElectiveSurgeryScheduleRemoveUrl(uuid)).toContain(`/elective-surgery-schedule/${uuid}/remove`);
      expect(getNearDeadlineUrl()).toContain('/elective-surgery-schedule/near-deadline');
    });
  });

  describe('parseScheduleListResponse', () => {
    it('accepts arrays and results wrappers', () => {
      const items = [{ uuid: '1' }];
      expect(parseScheduleListResponse(items)).toEqual(items);
      expect(parseScheduleListResponse({ results: items })).toEqual(items);
      expect(parseScheduleListResponse(null)).toEqual([]);
    });
  });

  describe('parseNearDeadlineResponse', () => {
    it('extracts count from object or number payloads', () => {
      expect(parseNearDeadlineResponse({ count: 3 })).toBe(3);
      expect(parseNearDeadlineResponse(5)).toBe(5);
      expect(parseNearDeadlineResponse(null)).toBe(0);
    });
  });

  describe('getApiErrorMessage', () => {
    it('prefers responseBody error messages', () => {
      const message = getApiErrorMessage({ responseBody: { error: { message: 'Invalid transition' } } }, 'fallback');
      expect(message).toBe('Invalid transition');
    });

    it('falls back to generic message', () => {
      expect(getApiErrorMessage(null, 'fallback')).toBe('fallback');
    });
  });
});
