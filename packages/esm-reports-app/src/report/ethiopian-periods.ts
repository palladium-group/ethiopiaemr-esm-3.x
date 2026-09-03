/**
 * Ethiopian fiscal year and reporting-month options for the aggregate report filter.
 *
 * Mirrors the backend's EthiopianCalendar: a fiscal year runs Hamle → Sene and is
 * named for its ending year (FY 2018 = Hamle 2017 → Sene 2018). Only labels cross
 * the wire — the backend resolves each month to its day-21 → day-20 bounds — so
 * this file deliberately does no date arithmetic.
 */

/** Parameter names declared by EpiAggregateDataSetDefinition. */
export const FISCAL_YEAR_PARAM = 'fiscalYear';
export const MONTHS_PARAM = 'months';

/** EC month names by number, 1 (Meskerem) - 13 (Pagume). */
const MONTH_NAMES = [
  'Meskerem',
  'Tikimt',
  'Hidar',
  'Tahsas',
  'Tir',
  'Yekatit',
  'Megabit',
  'Miyazia',
  'Ginbot',
  'Sene',
  'Hamle',
  'Nehase',
  'Pagume',
];

const HAMLE = 11;
const SENE = 10;

/** Selectable fiscal years, inclusive. */
export const FIRST_FISCAL_YEAR = 2017;
export const LAST_FISCAL_YEAR = 2028;

/**
 * Bounds of the month list: the first fiscal year's opening Hamle through the last
 * one's closing Sene, so every listed FY offers its full 12 months.
 */
const FIRST_MONTH = { year: FIRST_FISCAL_YEAR - 1, month: HAMLE };
const LAST_MONTH = { year: LAST_FISCAL_YEAR, month: SENE };

export interface ReportingMonth {
  /** The EC year the month is named for. */
  year: number;
  /** 1 (Meskerem) - 13 (Pagume). */
  month: number;
  /** Display label and wire value, e.g. "Hamle 2018". */
  label: string;
  /** The fiscal year this month reports into. */
  fiscalYear: number;
}

export const FISCAL_YEARS: Array<number> = Array.from(
  { length: LAST_FISCAL_YEAR - FIRST_FISCAL_YEAR + 1 },
  (_, i) => FIRST_FISCAL_YEAR + i,
);

/** Hamle onward reports into the next fiscal year. */
function fiscalYearOf(year: number, month: number): number {
  return month >= HAMLE ? year + 1 : year;
}

function monthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

/**
 * The 12 months of a fiscal year in reporting order: Hamle and Nehase of the prior
 * EC year, then Meskerem through Sene of the FY's own year.
 *
 * Pagume is omitted — it is absorbed into the Meskerem period rather than reported
 * on its own.
 */
export function monthsOfFiscalYear(fiscalYear: number): Array<ReportingMonth> {
  const months: Array<ReportingMonth> = [];
  const push = (year: number, month: number) => {
    months.push({ year, month, label: monthLabel(year, month), fiscalYear });
  };

  push(fiscalYear - 1, HAMLE);
  push(fiscalYear - 1, HAMLE + 1); // Nehase
  for (let month = 1; month <= SENE; month++) {
    push(fiscalYear, month);
  }

  return months.filter(isWithinRange);
}

/** Keeps the list inside Hamle 2017 - Sene 2028. */
function isWithinRange(month: ReportingMonth): boolean {
  return (
    chronologicalKey(month) >= chronologicalKey(FIRST_MONTH) && chronologicalKey(month) <= chronologicalKey(LAST_MONTH)
  );
}

/**
 * Orders months by when they actually occur. Meskerem starts the EC year but Hamle
 * starts the fiscal year, so comparing raw month numbers would place Hamle 2017
 * after Meskerem 2017 and wrongly exclude the whole of FY 2017.
 */
function chronologicalKey({ year, month }: { year: number; month: number }): number {
  return year * 13 + month;
}

/** Serialises a selection for the `months` parameter. */
export function serialiseMonths(months: Array<ReportingMonth>): string {
  return months.map((m) => m.label).join(',');
}

export { fiscalYearOf, monthLabel };
