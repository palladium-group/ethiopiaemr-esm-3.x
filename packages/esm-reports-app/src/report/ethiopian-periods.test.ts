import { FISCAL_YEARS, fiscalYearOf, monthsOfFiscalYear, serialiseMonths } from './ethiopian-periods';

describe('fiscal years', () => {
  it('spans 2017 to 2028 inclusive', () => {
    expect(FISCAL_YEARS[0]).toBe(2017);
    expect(FISCAL_YEARS[FISCAL_YEARS.length - 1]).toBe(2028);
    expect(FISCAL_YEARS).toHaveLength(12);
  });

  it('puts Hamle onward into the next fiscal year', () => {
    expect(fiscalYearOf(2018, 10)).toBe(2018); // Sene
    expect(fiscalYearOf(2018, 11)).toBe(2019); // Hamle
    expect(fiscalYearOf(2018, 12)).toBe(2019); // Nehase
    expect(fiscalYearOf(2019, 1)).toBe(2019); // Meskerem
  });
});

describe('months of a fiscal year', () => {
  it('runs Hamle of the prior year through Sene, without Pagume', () => {
    const months = monthsOfFiscalYear(2019);

    expect(months.map((m) => m.label)).toEqual([
      'Hamle 2018',
      'Nehase 2018',
      'Meskerem 2019',
      'Tikimt 2019',
      'Hidar 2019',
      'Tahsas 2019',
      'Tir 2019',
      'Yekatit 2019',
      'Megabit 2019',
      'Miyazia 2019',
      'Ginbot 2019',
      'Sene 2019',
    ]);
  });

  it('tags every month with the fiscal year that was asked for', () => {
    expect(monthsOfFiscalYear(2019).every((m) => m.fiscalYear === 2019)).toBe(true);
  });

  /** The earliest FY still offers all 12 of its months, opening at Hamle 2016. */
  it('gives the first fiscal year its full month list', () => {
    const months = monthsOfFiscalYear(2017);

    expect(months).toHaveLength(12);
    expect(months[0].label).toBe('Hamle 2016');
    expect(months[1].label).toBe('Nehase 2016');
    expect(months[2].label).toBe('Meskerem 2017');
    expect(months[months.length - 1].label).toBe('Sene 2017');
  });

  it('ends the last fiscal year at Sene 2028', () => {
    const months = monthsOfFiscalYear(2028);

    expect(months[months.length - 1].label).toBe('Sene 2028');
  });

  it('serialises a selection as a comma-separated list', () => {
    const months = monthsOfFiscalYear(2019).slice(0, 2);

    expect(serialiseMonths(months)).toBe('Hamle 2018,Nehase 2018');
    expect(serialiseMonths([])).toBe('');
  });
});
