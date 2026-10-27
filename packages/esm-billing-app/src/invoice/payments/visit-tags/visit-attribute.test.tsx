import React from 'react';
import { render, renderHook, screen } from '@testing-library/react';
import { useVisit } from '@openmrs/esm-framework';
import { useParams } from 'react-router-dom';
import useSWR from 'swr';
import VisitAttributeTags from './visit-attribute.component';
import { usePatientPaymentInfo } from '../../../billing.resource';
import { PAYMENT_METHOD_VISIT_ATTRIBUTE_TYPE_UUID } from '../../../constants';

jest.mock('@openmrs/esm-framework', () => ({
  ...jest.requireActual('@openmrs/esm-framework'),
  useVisit: jest.fn(),
  useConfig: jest.fn(() => ({
    visitAttributeTypes: {
      paymentMethods: 'e6cb0c3b-04b0-4117-9bc6-ce24adbda802',
    },
    excludedPaymentMode: [],
  })),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(() => ({})),
}));

jest.mock('swr', () => ({
  __esModule: true,
  ...jest.requireActual('swr'),
  default: jest.fn(),
}));

const mockUseVisit = useVisit as jest.Mock;
const mockUseParams = useParams as jest.Mock;
const mockUseSWR = useSWR as jest.Mock;

describe('VisitAttributeTags and usePatientPaymentInfo', () => {
  const mockPaymentModes = [
    { uuid: 'mode-paying-uuid', name: 'Paying' },
    { uuid: 'mode-cbhi-uuid', name: 'CBHI' },
    { uuid: 'mode-credit-uuid', name: 'Credit' },
    { uuid: 'mode-waiver-uuid', name: 'Waiver' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({});
    mockUseSWR.mockImplementation((url: string | null) => {
      if (typeof url === 'string' && url.includes('/cashier/paymentMode')) {
        return {
          data: { data: { results: mockPaymentModes } },
          isLoading: false,
          error: null,
          mutate: jest.fn(),
        };
      }
      return { data: null, isLoading: false, error: null, mutate: jest.fn() };
    });
  });

  it('returns null paymentType when there is no active visit', () => {
    mockUseVisit.mockReturnValue({
      activeVisit: null,
      isLoading: false,
    });

    const { result } = renderHook(() => usePatientPaymentInfo('patient-1'));
    expect(result.current.activeVisit).toBeNull();
    expect(result.current.paymentType).toBeNull();

    const { container } = render(<VisitAttributeTags patientUuid="patient-1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('returns null paymentType when active visit has stopDatetime (ended visit)', () => {
    mockUseVisit.mockReturnValue({
      activeVisit: {
        uuid: 'visit-1',
        stopDatetime: '2026-10-26T12:00:00.000Z',
        attributes: [
          {
            attributeType: { uuid: PAYMENT_METHOD_VISIT_ATTRIBUTE_TYPE_UUID, name: 'Payment method' },
            value: 'mode-paying-uuid',
          },
        ],
      },
      isLoading: false,
    });

    const { result } = renderHook(() => usePatientPaymentInfo('patient-1'));
    expect(result.current.activeVisit).toBeNull();
    expect(result.current.paymentType).toBeNull();

    const { container } = render(<VisitAttributeTags patientUuid="patient-1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing while visit is loading', () => {
    mockUseVisit.mockReturnValue({
      activeVisit: null,
      isLoading: true,
    });

    const { container } = render(<VisitAttributeTags patientUuid="patient-1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('resolves payment mode name from payment mode UUID and renders tag', () => {
    mockUseVisit.mockReturnValue({
      activeVisit: {
        uuid: 'visit-1',
        stopDatetime: null,
        attributes: [
          {
            attributeType: { uuid: PAYMENT_METHOD_VISIT_ATTRIBUTE_TYPE_UUID, name: 'Payment method' },
            value: 'mode-paying-uuid',
          },
        ],
      },
      isLoading: false,
    });

    const { result } = renderHook(() => usePatientPaymentInfo('patient-1'));
    expect(result.current.paymentType).toBe('Paying');

    render(<VisitAttributeTags patientUuid="patient-1" />);
    expect(screen.getByText('Paying')).toBeInTheDocument();
  });

  it('resolves CBHI payment mode correctly', () => {
    mockUseVisit.mockReturnValue({
      activeVisit: {
        uuid: 'visit-1',
        stopDatetime: null,
        attributes: [
          {
            attributeType: { uuid: PAYMENT_METHOD_VISIT_ATTRIBUTE_TYPE_UUID, name: 'Payment method' },
            value: 'mode-cbhi-uuid',
          },
        ],
      },
      isLoading: false,
    });

    const { result } = renderHook(() => usePatientPaymentInfo('patient-1'));
    expect(result.current.paymentType).toBe('CBHI');

    render(<VisitAttributeTags patientUuid="patient-1" />);
    expect(screen.getByText('CBHI')).toBeInTheDocument();
  });

  it('resolves Credit payment mode and only shows payment name without extra details', () => {
    mockUseVisit.mockReturnValue({
      activeVisit: {
        uuid: 'visit-1',
        stopDatetime: null,
        attributes: [
          {
            attributeType: { uuid: PAYMENT_METHOD_VISIT_ATTRIBUTE_TYPE_UUID, name: 'Payment method' },
            value: 'mode-credit-uuid',
          },
          {
            attributeType: { uuid: 'd824aa96-d2c7-4a52-aa8d-03f60a516083', name: 'Credit Details' },
            value: JSON.stringify({ creditCompany: 'Ethio Telecom' }),
          },
        ],
      },
      isLoading: false,
    });

    const { result } = renderHook(() => usePatientPaymentInfo('patient-1'));
    expect(result.current.paymentType).toBe('Credit');

    render(<VisitAttributeTags patientUuid="patient-1" />);
    expect(screen.getByText('Credit')).toBeInTheDocument();
    expect(screen.queryByText(/Ethio Telecom/i)).not.toBeInTheDocument();
  });

  it('resolves patientUuid from route params if prop is not provided', () => {
    mockUseParams.mockReturnValue({ patientUuid: 'route-patient-uuid' });
    mockUseVisit.mockReturnValue({
      activeVisit: {
        uuid: 'visit-1',
        stopDatetime: null,
        attributes: [
          {
            attributeType: { uuid: PAYMENT_METHOD_VISIT_ATTRIBUTE_TYPE_UUID, name: 'Payment method' },
            value: 'mode-waiver-uuid',
          },
        ],
      },
      isLoading: false,
    });

    render(<VisitAttributeTags />);
    expect(mockUseVisit).toHaveBeenCalledWith('route-patient-uuid');
    expect(screen.getByText('Waiver')).toBeInTheDocument();
  });

  it('renders nothing when active visit has no payment method and no billing info', () => {
    mockUseVisit.mockReturnValue({
      activeVisit: {
        uuid: 'visit-1',
        stopDatetime: null,
        attributes: [],
      },
      isLoading: false,
    });

    const { container } = render(<VisitAttributeTags patientUuid="patient-1" />);
    expect(container).toBeEmptyDOMElement();
  });
});
