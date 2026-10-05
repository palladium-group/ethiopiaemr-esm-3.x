import { renderHook } from '@testing-library/react';
import useSWR from 'swr';
import { useLastVisitPaymentMethod } from './useLastVisitPaymentMethod';

jest.mock('@openmrs/esm-framework', () => ({
  ...jest.requireActual('@openmrs/esm-framework'),
  openmrsFetch: jest.fn(),
  restBaseUrl: '/ws/rest/v1',
}));

jest.mock('swr', () => jest.fn());

const PAYMENT_METHOD_ATTR_UUID = 'e6cb0c3b-04b0-4117-9bc6-ce24adbda802';
const CASH_UUID = 'cash-uuid-123';
const CBHI_UUID = 'cbhi-uuid-456';

describe('useLastVisitPaymentMethod', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSWR as unknown as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
    });
  });

  it('returns null when patientUuid or paymentMethodAttrTypeUuid is missing', () => {
    const { result } = renderHook(() => useLastVisitPaymentMethod(null, PAYMENT_METHOD_ATTR_UUID));
    expect(result.current.lastVisitPaymentMethodUuid).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('returns null when there are no closed visits', () => {
    (useSWR as unknown as jest.Mock).mockReturnValue({
      data: {
        data: {
          results: [
            {
              uuid: 'v-active',
              startDatetime: '2026-09-29T10:00:00.000Z',
              stopDatetime: null,
              attributes: [],
            },
          ],
        },
      },
      isLoading: false,
    });

    const { result } = renderHook(() => useLastVisitPaymentMethod('p1', PAYMENT_METHOD_ATTR_UUID));
    expect(result.current.lastVisitPaymentMethodUuid).toBeNull();
  });

  it('extracts payment method from the most recent closed visit', () => {
    (useSWR as unknown as jest.Mock).mockReturnValue({
      data: {
        data: {
          results: [
            {
              uuid: 'v-older',
              startDatetime: '2026-08-01T10:00:00.000Z',
              stopDatetime: '2026-08-01T12:00:00.000Z',
              attributes: [
                {
                  uuid: 'attr-1',
                  value: CASH_UUID,
                  attributeType: { uuid: PAYMENT_METHOD_ATTR_UUID },
                },
              ],
            },
            {
              uuid: 'v-newer',
              startDatetime: '2026-09-10T10:00:00.000Z',
              stopDatetime: '2026-09-10T12:00:00.000Z',
              attributes: [
                {
                  uuid: 'attr-2',
                  value: CBHI_UUID,
                  attributeType: { uuid: PAYMENT_METHOD_ATTR_UUID },
                },
              ],
            },
          ],
        },
      },
      isLoading: false,
    });

    const { result } = renderHook(() => useLastVisitPaymentMethod('p1', PAYMENT_METHOD_ATTR_UUID));
    expect(result.current.lastVisitPaymentMethodUuid).toBe(CBHI_UUID);
  });
});
