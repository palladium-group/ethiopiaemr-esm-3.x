import { CONSULTATIONS_INBOX_SWR_KEY } from '../constants';
import { getConsultationsInboxSwrKey } from './consultation-cache.resource';

describe('consultation-cache.resource', () => {
  it('builds the shared inbox SWR key', () => {
    expect(getConsultationsInboxSwrKey('location-uuid', 'encounter-type-uuid')).toEqual([
      CONSULTATIONS_INBOX_SWR_KEY,
      'location-uuid',
      'encounter-type-uuid',
    ]);
  });
});
