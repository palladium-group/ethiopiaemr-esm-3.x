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
