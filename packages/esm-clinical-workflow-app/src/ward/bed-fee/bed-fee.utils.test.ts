import type { Visit } from '@openmrs/esm-framework';
import type { BillableService } from './bed-fee.resource';
import {
  findEncounterDatetimeByType,
  getBedStayWindow,
  getVisitPaymentModeUuid,
  selectServicePrice,
  serviceMatchesBedFeeConcept,
} from './bed-fee.utils';

const IPD_DISCHARGE_ENCOUNTER_TYPE = 'ipd-discharge-encounter-type';
const PAYMENT_METHOD_ATTRIBUTE_TYPE = 'payment-method-attribute-type';
const CBHI_PAYMENT_MODE = 'cbhi-payment-mode';
const BED_FEE_CONCEPT = 'daily-bed-fee-concept';

describe('getBedStayWindow', () => {
  it('counts the admission and discharge day, so a same-day stay is one day', () => {
    expect(getBedStayWindow('2026-08-20T09:00:00.000+0300', '2026-08-20T18:00:00.000+0300').daysInWard).toBe(1);
  });

  it('counts inclusive calendar days across a multi-day stay', () => {
    expect(getBedStayWindow('2026-08-20T23:00:00.000+0300', '2026-08-24T01:00:00.000+0300').daysInWard).toBe(5);
  });

  it('bills up to today when the patient has no discharge encounter yet', () => {
    const today = new Date().toISOString();
    expect(getBedStayWindow(today, null).daysInWard).toBe(1);
  });

  it('returns no days when the admission datetime is missing or invalid', () => {
    expect(getBedStayWindow(null, null).daysInWard).toBe(0);
    expect(getBedStayWindow('not-a-date', null).daysInWard).toBe(0);
    expect(getBedStayWindow(null, null).billStartDate).toBeNull();
  });

  it('scopes the billing window to whole days', () => {
    const { billStartDate, billEndDate } = getBedStayWindow('2026-08-20T09:00:00.000Z', '2026-08-22T09:00:00.000Z');
    expect(billStartDate?.getHours()).toBe(0);
    expect(billEndDate.getHours()).toBe(23);
  });
});

describe('findEncounterDatetimeByType', () => {
  const visit = {
    uuid: 'visit-uuid',
    encounters: [
      { uuid: 'e1', encounterType: { uuid: 'other-type' }, encounterDatetime: '2026-08-21T10:00:00.000Z' },
      {
        uuid: 'e2',
        encounterType: { uuid: IPD_DISCHARGE_ENCOUNTER_TYPE },
        encounterDatetime: '2026-08-24T10:00:00.000Z',
      },
    ],
  } as unknown as Visit;

  it('returns the datetime of the matching encounter', () => {
    expect(findEncounterDatetimeByType(visit, IPD_DISCHARGE_ENCOUNTER_TYPE)).toBe('2026-08-24T10:00:00.000Z');
  });

  it('returns null when the visit or encounter type is missing', () => {
    expect(findEncounterDatetimeByType(visit, 'absent-type')).toBeNull();
    expect(findEncounterDatetimeByType(null, IPD_DISCHARGE_ENCOUNTER_TYPE)).toBeNull();
    expect(findEncounterDatetimeByType(visit, '')).toBeNull();
  });
});

describe('selectServicePrice', () => {
  const service = {
    uuid: 'bed-fee-service',
    name: 'Daily bed fee',
    servicePrices: [
      { uuid: 'cash-price', name: 'Cash', price: 200, paymentMode: { uuid: 'cash-payment-mode', name: 'Cash' } },
      { uuid: 'cbhi-price', name: 'CBHI', price: 150, paymentMode: { uuid: CBHI_PAYMENT_MODE, name: 'CBHI' } },
    ],
  } as BillableService;

  it('prefers the price matching the visit payment mode', () => {
    expect(selectServicePrice(service, CBHI_PAYMENT_MODE)?.price).toBe(150);
  });

  it('falls back to the first price when the payment mode has no price', () => {
    expect(selectServicePrice(service, 'insurance-payment-mode')?.price).toBe(200);
    expect(selectServicePrice(service, null)?.price).toBe(200);
  });

  it('returns null when the service has no prices', () => {
    expect(selectServicePrice({ ...service, servicePrices: [] }, CBHI_PAYMENT_MODE)).toBeNull();
    expect(selectServicePrice(null, CBHI_PAYMENT_MODE)).toBeNull();
  });
});

describe('serviceMatchesBedFeeConcept', () => {
  const bedFeeService = {
    uuid: 'bed-fee-service',
    name: 'Daily bed fee',
    concept: { uuid: BED_FEE_CONCEPT },
    servicePrices: [],
  } as BillableService;

  it('matches a service carrying the configured bed fee concept', () => {
    expect(serviceMatchesBedFeeConcept(bedFeeService, BED_FEE_CONCEPT)).toBe(true);
  });

  it('does not match other services', () => {
    expect(serviceMatchesBedFeeConcept({ ...bedFeeService, concept: { uuid: 'other' } }, BED_FEE_CONCEPT)).toBe(false);
    expect(serviceMatchesBedFeeConcept({ ...bedFeeService, concept: undefined }, BED_FEE_CONCEPT)).toBe(false);
    expect(serviceMatchesBedFeeConcept(null, BED_FEE_CONCEPT)).toBe(false);
  });

  it('never matches when no bed fee concept is configured', () => {
    expect(serviceMatchesBedFeeConcept(bedFeeService, '')).toBe(false);
    expect(serviceMatchesBedFeeConcept(bedFeeService, undefined)).toBe(false);
  });
});

describe('getVisitPaymentModeUuid', () => {
  it('reads the payment mode from a string attribute value', () => {
    const visit = {
      attributes: [{ attributeType: { uuid: PAYMENT_METHOD_ATTRIBUTE_TYPE }, value: CBHI_PAYMENT_MODE }],
    } as unknown as Visit;
    expect(getVisitPaymentModeUuid(visit, PAYMENT_METHOD_ATTRIBUTE_TYPE)).toBe(CBHI_PAYMENT_MODE);
  });

  it('reads the payment mode from an object attribute value', () => {
    const visit = {
      attributes: [{ attributeType: { uuid: PAYMENT_METHOD_ATTRIBUTE_TYPE }, value: { uuid: CBHI_PAYMENT_MODE } }],
    } as unknown as Visit;
    expect(getVisitPaymentModeUuid(visit, PAYMENT_METHOD_ATTRIBUTE_TYPE)).toBe(CBHI_PAYMENT_MODE);
  });

  it('returns null when the visit has no payment method attribute', () => {
    expect(getVisitPaymentModeUuid({ attributes: [] } as unknown as Visit, PAYMENT_METHOD_ATTRIBUTE_TYPE)).toBeNull();
    expect(getVisitPaymentModeUuid(null, PAYMENT_METHOD_ATTRIBUTE_TYPE)).toBeNull();
  });
});
