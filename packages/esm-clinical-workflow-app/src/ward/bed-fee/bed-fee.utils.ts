import type { Visit } from '@openmrs/esm-framework';
import dayjs from 'dayjs';
import type { BillableService, ServicePrice } from './bed-fee.resource';

export interface BedStayWindow {
  /** Inclusive calendar days between admission and discharge; the admission day itself counts as one day. */
  daysInWard: number;
  billStartDate: Date | null;
  billEndDate: Date;
}

/**
 * The stay is measured from the encounter that placed the patient in their current inpatient location,
 * so an inter-ward transfer restarts the count for the receiving ward.
 */
export function getBedStayWindow(
  admissionDatetime: string | null | undefined,
  ipdDischargeDatetime: string | null | undefined,
): BedStayWindow {
  const admissionDate = admissionDatetime ? dayjs(admissionDatetime) : null;
  const billStart = admissionDate?.isValid() ? admissionDate.startOf('day') : null;

  const dischargeDate = ipdDischargeDatetime ? dayjs(ipdDischargeDatetime) : null;
  const billEnd = dischargeDate?.isValid() ? dischargeDate.endOf('day') : dayjs().endOf('day');

  return {
    daysInWard: billStart ? Math.abs(billEnd.startOf('day').diff(billStart, 'days')) + 1 : 0,
    billStartDate: billStart?.toDate() ?? null,
    billEndDate: billEnd.toDate(),
  };
}

export function findEncounterDatetimeByType(visit: Visit | null | undefined, encounterTypeUuid: string): string | null {
  if (!visit?.encounters?.length || !encounterTypeUuid) {
    return null;
  }

  return (
    visit.encounters.find((encounter) => encounter.encounterType?.uuid === encounterTypeUuid)?.encounterDatetime ?? null
  );
}

export function selectServicePrice(
  service: BillableService | null | undefined,
  paymentModeUuid: string | null | undefined,
): ServicePrice | null {
  const prices = service?.servicePrices ?? [];
  if (!prices.length) {
    return null;
  }

  return prices.find((price) => price.paymentMode?.uuid === paymentModeUuid) ?? prices[0];
}

export function getVisitPaymentModeUuid(
  visit: Visit | null | undefined,
  paymentMethodAttributeTypeUuid: string,
): string | null {
  const attribute = visit?.attributes?.find(
    (candidate) => candidate.attributeType?.uuid === paymentMethodAttributeTypeUuid,
  );
  const value = attribute?.value as string | { uuid?: string } | undefined;

  if (!value) {
    return null;
  }

  return typeof value === 'string' ? value : value.uuid ?? null;
}

/**
 * Bed fee services are recognised by the concept configured on the ward app, because concepts come
 * from the shared metadata package and are identical across facilities, whereas the billable
 * services wrapping them are created locally at each facility with local prices.
 */
export function serviceMatchesBedFeeConcept(
  service: BillableService | null | undefined,
  bedFeeConceptUuid: string | null | undefined,
): boolean {
  return Boolean(bedFeeConceptUuid) && service?.concept?.uuid === bedFeeConceptUuid;
}

/** Ethiopian Birr is the only currency configured across this distribution. */
const BED_FEE_CURRENCY = 'ETB';

export function formatBedFeeAmount(amount: number): string {
  const locale = localStorage.getItem('i18nextLng') ?? 'en';

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: BED_FEE_CURRENCY,
    minimumFractionDigits: 2,
  }).format(amount);
}
