import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useReportDefinition } from '../api/reports.resource';
import { runReport, fetchFeederDatasetNames, downloadReportDesign } from '../api/report-request';
import ReportRunner from './report-runner.component';

jest.mock('react-router-dom', () => ({ useParams: () => ({ reportUuid: 'report-uuid' }) }));
jest.mock('../api/reports.resource', () => ({ useReportDefinition: jest.fn() }));
jest.mock('../api/report-request', () => ({
  runReport: jest.fn(),
  fetchFeederDatasetNames: jest.fn(),
  downloadReportDesign: jest.fn(),
}));
jest.mock('./report-results.component', () => ({
  __esModule: true,
  default: () => <div data-testid="results" />,
}));

/**
 * Stands in for OpenmrsDatePicker with a plain text input, so a test can set a
 * yyyy-MM-dd value directly. `minDate`/`invalid` are surfaced as data attributes
 * so the constraint handed to the real picker can be asserted.
 */
jest.mock('@openmrs/esm-framework', () => ({
  OpenmrsDatePicker: ({ id, labelText, value, minDate, invalid, invalidText, onChange }: any) => (
    <div>
      <label htmlFor={id}>{labelText}</label>
      <input
        id={id}
        value={value ?? ''}
        data-min-date={minDate ? formatForTest(minDate) : ''}
        data-invalid={invalid === undefined ? 'undefined' : String(invalid)}
        onChange={(e) => onChange?.(e.target.value ? parseForTest(e.target.value) : null)}
      />
      {invalid && <span>{invalidText}</span>}
    </div>
  ),
}));

function formatForTest(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(
    2,
    '0',
  )}`;
}

function parseForTest(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const mockUseReportDefinition = jest.mocked(useReportDefinition);
const mockRunReport = jest.mocked(runReport);
const mockFetchFeeders = jest.mocked(fetchFeederDatasetNames);
const mockDownload = jest.mocked(downloadReportDesign);

const reportDefinition = {
  uuid: 'report-uuid',
  name: 'ART Register',
  description: null,
  indicator: false,
  parameters: [
    { name: 'startDate', label: 'Start Date', type: 'java.util.Date' },
    { name: 'endDate', label: 'End Date', type: 'java.util.Date' },
  ],
  designs: [{ uuid: 'design-uuid', name: 'Excel' }],
};

/** Sets a whole yyyy-MM-dd value at once, mimicking a date typed past the calendar. */
function setDate(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

beforeEach(() => {
  mockUseReportDefinition.mockReturnValue({ reportDefinition, isLoading: false, error: undefined } as any);
  mockRunReport.mockResolvedValue([]);
  mockFetchFeeders.mockResolvedValue(new Set());
  mockDownload.mockResolvedValue(undefined);
});

describe('ReportRunner date range constraint', () => {
  it("bounds the end date's calendar by the chosen start date", async () => {
    render(<ReportRunner />);

    setDate('Start Date', '2025-03-01');

    expect(screen.getByLabelText('End Date')).toHaveAttribute('data-min-date', '2025-03-01');
    // The start date itself stays unbounded so the user can advance to a later period.
    expect(screen.getByLabelText('Start Date')).toHaveAttribute('data-min-date', '');
  });

  it('leaves `invalid` undefined when the range is valid, so the picker keeps its own signal', async () => {
    render(<ReportRunner />);

    setDate('Start Date', '2025-03-01');
    setDate('End Date', '2025-03-31');

    expect(screen.getByLabelText('Start Date')).toHaveAttribute('data-invalid', 'undefined');
    expect(screen.getByLabelText('End Date')).toHaveAttribute('data-invalid', 'undefined');
  });

  it('flags the end date and blocks running when it precedes the start date', async () => {
    render(<ReportRunner />);

    setDate('Start Date', '2025-03-31');
    setDate('End Date', '2025-03-01');

    expect(screen.getByLabelText('End Date')).toHaveAttribute('data-invalid', 'true');
    expect(screen.getByText('End date must be on or after the begin date.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /run report/i })).toBeDisabled();
    expect(mockRunReport).not.toHaveBeenCalled();
  });

  it('blocks downloading an inverted range too', async () => {
    render(<ReportRunner />);

    setDate('Start Date', '2025-03-31');
    setDate('End Date', '2025-03-01');

    expect(screen.getByRole('button', { name: /download excel/i })).toBeDisabled();
    expect(mockDownload).not.toHaveBeenCalled();
  });

  it('runs the report once the range is valid', async () => {
    render(<ReportRunner />);

    setDate('Start Date', '2025-03-01');
    setDate('End Date', '2025-03-31');
    await userEvent.click(screen.getByRole('button', { name: /run report/i }));

    expect(mockRunReport).toHaveBeenCalledWith('report-uuid', { startDate: '2025-03-01', endDate: '2025-03-31' });
    expect(await screen.findByTestId('results')).toBeInTheDocument();
  });

  it('accepts an end date equal to the start date', async () => {
    render(<ReportRunner />);

    setDate('Start Date', '2025-03-01');
    setDate('End Date', '2025-03-01');

    expect(screen.getByLabelText('End Date')).toHaveAttribute('data-invalid', 'undefined');
    expect(screen.getByRole('button', { name: /run report/i })).toBeEnabled();
  });

  it('leaves reports without a start/end pair unconstrained', async () => {
    mockUseReportDefinition.mockReturnValue({
      reportDefinition: {
        ...reportDefinition,
        parameters: [{ name: 'asOfDate', label: 'As Of', type: 'java.util.Date' }],
      },
      isLoading: false,
      error: undefined,
    } as any);
    render(<ReportRunner />);

    setDate('As Of', '2025-03-01');

    expect(screen.getByLabelText('As Of')).toHaveAttribute('data-min-date', '');
    expect(screen.getByRole('button', { name: /run report/i })).toBeEnabled();
  });
});

/** The aggregate report, filtered by Ethiopian fiscal year and month. */
const aggregateDefinition = {
  uuid: 'report-uuid',
  name: 'EPI Aggregate Reporting Form',
  description: null,
  indicator: true,
  parameters: [
    { name: 'fiscalYear', label: 'Fiscal Year', type: 'java.lang.String' },
    { name: 'months', label: 'Month(s)', type: 'java.lang.String' },
  ],
  designs: [{ uuid: 'design-uuid', name: 'Excel' }],
};

async function chooseFiscalYear(year: string) {
  await userEvent.click(screen.getByRole('combobox', { name: /fiscal year/i }));
  await userEvent.click(await screen.findByRole('option', { name: year }));
}

async function chooseMonths(...labels: Array<string>) {
  await userEvent.click(screen.getByRole('combobox', { name: /month/i }));
  for (const label of labels) {
    await userEvent.click(await screen.findByRole('option', { name: label }));
  }
}

describe('ReportRunner Ethiopian period filter', () => {
  beforeEach(() => {
    mockUseReportDefinition.mockReturnValue({
      reportDefinition: aggregateDefinition,
      isLoading: false,
      error: undefined,
    } as any);
  });

  it('shows dropdowns rather than date pickers', () => {
    render(<ReportRunner />);

    expect(screen.getByRole('combobox', { name: /fiscal year/i })).toBeInTheDocument();
    expect(screen.queryByLabelText('Start Date')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('End Date')).not.toBeInTheDocument();
  });

  it('blocks running until a month is picked', async () => {
    render(<ReportRunner />);

    expect(screen.getByRole('button', { name: /run report/i })).toBeDisabled();

    await chooseFiscalYear('2019');
    expect(screen.getByRole('button', { name: /run report/i })).toBeDisabled();

    await chooseMonths('Hamle 2018');
    expect(screen.getByRole('button', { name: /run report/i })).toBeEnabled();
  });

  /** Carbon sorts by label unless told otherwise, which would read Ginbot, Hamle, Hidar… */
  it('lists the months chronologically, not alphabetically', async () => {
    render(<ReportRunner />);

    await chooseFiscalYear('2019');
    await userEvent.click(screen.getByRole('combobox', { name: /month/i }));

    const listed = (await screen.findAllByRole('option')).map((o) => o.textContent);
    expect(listed).toEqual([
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

  it('offers only the chosen fiscal year’s months', async () => {
    render(<ReportRunner />);

    await chooseFiscalYear('2019');
    await userEvent.click(screen.getByRole('combobox', { name: /month/i }));

    expect(await screen.findByRole('option', { name: 'Hamle 2018' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Sene 2019' })).toBeInTheDocument();
    // Belongs to FY 2020, so it must not be selectable here.
    expect(screen.queryByRole('option', { name: 'Hamle 2019' })).not.toBeInTheDocument();
  });

  it('sends several months as one comma-separated value', async () => {
    render(<ReportRunner />);

    await chooseFiscalYear('2019');
    await chooseMonths('Hamle 2018', 'Nehase 2018');
    await userEvent.click(screen.getByRole('button', { name: /run report/i }));

    expect(mockRunReport).toHaveBeenCalledWith('report-uuid', {
      fiscalYear: '2019',
      months: 'Hamle 2018,Nehase 2018',
    });
  });

  it('sends months in fiscal-year order however they were ticked', async () => {
    render(<ReportRunner />);

    await chooseFiscalYear('2019');
    await chooseMonths('Meskerem 2019', 'Hamle 2018');
    await userEvent.click(screen.getByRole('button', { name: /run report/i }));

    expect(mockRunReport).toHaveBeenCalledWith('report-uuid', {
      fiscalYear: '2019',
      months: 'Hamle 2018,Meskerem 2019',
    });
  });

  it('clears the months when the fiscal year changes', async () => {
    render(<ReportRunner />);

    await chooseFiscalYear('2019');
    await chooseMonths('Hamle 2018');
    await chooseFiscalYear('2020');

    expect(screen.getByRole('button', { name: /run report/i })).toBeDisabled();
  });
});
