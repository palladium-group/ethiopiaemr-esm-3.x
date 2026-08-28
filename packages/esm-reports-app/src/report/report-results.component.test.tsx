import React from 'react';
import { render, screen } from '@testing-library/react';
import { type ReportDataSet } from '../api/report-request';
import ReportResults from './report-results.component';

function dataset(name: string, rows: Array<Record<string, unknown>>, columns: Array<string> = []): ReportDataSet {
  return { name, columns, rows };
}

describe('ReportResults', () => {
  it('renders a heading per dataset in the server-declared column order', () => {
    render(
      <ReportResults
        dataSets={[dataset('Totals', [{ count: 3, region: 'Addis' }], ['region', 'count'])]}
        feederDatasets={new Set()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Totals' })).toBeInTheDocument();
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
    expect(headers).toEqual(['region', 'count']);
  });

  it('hides feeder datasets', () => {
    render(
      <ReportResults
        dataSets={[dataset('Feeder', [{ a: 1 }]), dataset('Shown', [{ a: 1 }])]}
        feederDatasets={new Set(['Feeder'])}
      />,
    );

    expect(screen.queryByRole('heading', { name: 'Feeder' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Shown' })).toBeInTheDocument();
  });

  it('renders a blank-named dataset as a banner: no heading, no column header row', () => {
    render(<ReportResults dataSets={[dataset('  ', [{ facility: 'Facility: X' }])]} feederDatasets={new Set()} />);

    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader')).not.toBeInTheDocument();
    expect(screen.getByText('Facility: X')).toBeInTheDocument();
  });

  it('hoists the following title above a leading banner, rendering it exactly once', () => {
    render(
      <ReportResults
        dataSets={[dataset('', [{ facility: 'Facility: X' }]), dataset('Summary', [{ a: '1' }], ['a'])]}
        feederDatasets={new Set()}
      />,
    );

    const headings = screen.getAllByRole('heading');
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('Summary');
    // The banner still has no header row; the titled dataset keeps its own.
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['a']);
  });

  it('only suppresses the hoisted dataset heading, not a later namesake', () => {
    render(
      <ReportResults
        dataSets={[dataset('', [{ f: 'banner' }]), dataset('Summary', [{ a: '1' }]), dataset('Summary', [{ a: '2' }])]}
        feederDatasets={new Set()}
      />,
    );

    // One hoisted heading plus the second namesake's own heading.
    expect(screen.getAllByRole('heading', { name: 'Summary' })).toHaveLength(2);
  });

  it('does not hoist when the report does not lead with a banner', () => {
    render(
      <ReportResults
        dataSets={[dataset('Summary', [{ a: '1' }]), dataset('', [{ f: 'banner' }])]}
        feederDatasets={new Set()}
      />,
    );

    expect(screen.getAllByRole('heading', { name: 'Summary' })).toHaveLength(1);
  });

  it('drops an empty banner rather than showing an unattributed "No rows."', () => {
    render(<ReportResults dataSets={[dataset('', []), dataset('Summary', [{ a: '1' }])]} feederDatasets={new Set()} />);

    expect(screen.queryByText('No rows.')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Summary' })).toBeInTheDocument();
  });

  it('still reports empty rows for a named dataset', () => {
    render(<ReportResults dataSets={[dataset('Summary', [])]} feederDatasets={new Set()} />);

    expect(screen.getByRole('heading', { name: 'Summary' })).toBeInTheDocument();
    expect(screen.getByText('No rows.')).toBeInTheDocument();
  });

  it('appends undeclared row keys rather than dropping them', () => {
    render(<ReportResults dataSets={[dataset('Totals', [{ b: '2', a: '1' }], ['a'])]} feederDatasets={new Set()} />);

    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['a', 'b']);
  });

  it('shows an empty-state message when every dataset is a feeder', () => {
    render(<ReportResults dataSets={[dataset('Feeder', [{ a: 1 }])]} feederDatasets={new Set(['Feeder'])} />);

    expect(screen.getByText('No data returned.')).toBeInTheDocument();
  });
});
