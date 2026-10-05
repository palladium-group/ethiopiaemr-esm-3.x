import { renderHook } from '@testing-library/react';
import useSWR from 'swr';
import dayjs from 'dayjs';
import { useConfig } from '@openmrs/esm-framework';
import { usePatientCardValidity } from './usePatientCardValidity';

jest.mock('@openmrs/esm-framework', () => ({
  ...jest.requireActual('@openmrs/esm-framework'),
  useConfig: jest.fn(),
  openmrsFetch: jest.fn(),
  restBaseUrl: '/ws/rest/v1',
}));

jest.mock('swr', () => jest.fn());

const ATTR_TYPE_UUID = 'c8e030e4-b778-43f1-b9f1-9878d655f412';

describe('usePatientCardValidity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useConfig as jest.Mock).mockReturnValue({
      cardValidity: {
        lastConsultationDateAttributeTypeUuid: ATTR_TYPE_UUID,
        validityDays: 30,
      },
    });
  });

  it('returns hasValidCard: false when patientUuid is null or empty', () => {
    (useSWR as unknown as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
    });

    const { result } = renderHook(() => usePatientCardValidity(null));

    expect(result.current.hasValidCard).toBe(false);
    expect(result.current.lastConsultationDate).toBeNull();
    expect(result.current.cardExpiryDate).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('returns hasValidCard: false when config has no lastConsultationDateAttributeTypeUuid', () => {
    (useConfig as jest.Mock).mockReturnValue({
      cardValidity: {
        lastConsultationDateAttributeTypeUuid: '',
        validityDays: 30,
      },
    });
    (useSWR as unknown as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
    });

    const { result } = renderHook(() => usePatientCardValidity('patient-1'));

    expect(result.current.hasValidCard).toBe(false);
  });

  it('returns hasValidCard: false when patient has no attributes matching', () => {
    (useSWR as unknown as jest.Mock).mockReturnValue({
      data: {
        data: {
          results: [],
        },
      },
      isLoading: false,
    });

    const { result } = renderHook(() => usePatientCardValidity('patient-1'));

    expect(result.current.hasValidCard).toBe(false);
    expect(result.current.lastConsultationDate).toBeNull();
  });

  it('returns hasValidCard: true when patient paid consultation within the validity window', () => {
    const consultationDate = dayjs().subtract(5, 'day').format('YYYY-MM-DD');

    (useSWR as unknown as jest.Mock).mockReturnValue({
      data: {
        data: {
          results: [
            {
              uuid: 'attr-1',
              value: consultationDate,
              attributeType: { uuid: ATTR_TYPE_UUID },
            },
          ],
        },
      },
      isLoading: false,
    });

    const { result } = renderHook(() => usePatientCardValidity('patient-1'));

    expect(result.current.hasValidCard).toBe(true);
    expect(result.current.lastConsultationDate).toEqual(dayjs(consultationDate).toDate());
    expect(result.current.cardExpiryDate).toEqual(dayjs(consultationDate).add(30, 'day').toDate());
  });

  it('returns hasValidCard: false when consultation date has expired', () => {
    const consultationDate = dayjs().subtract(35, 'day').format('YYYY-MM-DD');

    (useSWR as unknown as jest.Mock).mockReturnValue({
      data: {
        data: {
          results: [
            {
              uuid: 'attr-1',
              value: consultationDate,
              attributeType: { uuid: ATTR_TYPE_UUID },
            },
          ],
        },
      },
      isLoading: false,
    });

    const { result } = renderHook(() => usePatientCardValidity('patient-1'));

    expect(result.current.hasValidCard).toBe(false);
    expect(result.current.lastConsultationDate).toEqual(dayjs(consultationDate).toDate());
  });

  it('picks the latest consultation date if multiple attributes exist', () => {
    const olderDate = dayjs().subtract(40, 'day').format('YYYY-MM-DD');
    const newerDate = dayjs().subtract(2, 'day').format('YYYY-MM-DD');

    (useSWR as unknown as jest.Mock).mockReturnValue({
      data: {
        data: {
          results: [
            {
              uuid: 'attr-1',
              value: olderDate,
              attributeType: { uuid: ATTR_TYPE_UUID },
            },
            {
              uuid: 'attr-2',
              value: newerDate,
              attributeType: { uuid: ATTR_TYPE_UUID },
            },
          ],
        },
      },
      isLoading: false,
    });

    const { result } = renderHook(() => usePatientCardValidity('patient-1'));

    expect(result.current.hasValidCard).toBe(true);
    expect(result.current.lastConsultationDate).toEqual(dayjs(newerDate).toDate());
  });

  it('evaluates card validity directly from providedAttributes without making an attribute fetch request', () => {
    const consultationDate = dayjs().subtract(5, 'day').toISOString();
    const providedAttributes = [
      {
        uuid: 'attr-1',
        value: consultationDate,
        attributeType: { uuid: ATTR_TYPE_UUID },
      },
    ];

    const { result } = renderHook(() => usePatientCardValidity('patient-1', providedAttributes));

    // useSWR should be called with null url because attributes were provided in-memory
    expect(useSWR).toHaveBeenCalledWith(null, expect.any(Function), expect.any(Object));
    expect(result.current.hasValidCard).toBe(true);
    expect(result.current.lastConsultationDate).toEqual(dayjs(consultationDate).toDate());
    expect(result.current.isLoading).toBe(false);
  });

  it('returns hasValidCard: false when providedAttributes is empty array without making an attribute fetch request', () => {
    const { result } = renderHook(() => usePatientCardValidity('patient-1', []));

    expect(useSWR).toHaveBeenCalledWith(null, expect.any(Function), expect.any(Object));
    expect(result.current.hasValidCard).toBe(false);
    expect(result.current.lastConsultationDate).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});
