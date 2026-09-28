import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import {
  Button,
  Dropdown,
  FilterableMultiSelect,
  InlineLoading,
  InlineNotification,
  Layer,
  TextInput,
} from '@carbon/react';
import { OpenmrsDatePicker } from '@openmrs/esm-framework';
import { useReportDefinition } from '../api/reports.resource';
import { runReport, fetchFeederDatasetNames, downloadReportDesign, type ReportDataSet } from '../api/report-request';
import {
  FISCAL_YEARS,
  FISCAL_YEAR_PARAM,
  MONTHS_PARAM,
  monthsOfFiscalYear,
  serialiseMonths,
  type ReportingMonth,
} from './ethiopian-periods';
import ReportResults from './report-results.component';
import styles from './report-runner.component.scss';

// The conventional names for a report's date-range pair, matched case-insensitively
// and tolerant of a separator (`start_date`, `begin-date`). A report whose bounds are
// named otherwise simply goes unconstrained.
const START_PARAM_PATTERN = /^(start|begin)[_-]?(date)?$/i;
const END_PARAM_PATTERN = /^(end|stop)[_-]?(date)?$/i;

const ReportRunner: React.FC = () => {
  const { t } = useTranslation();
  const { reportUuid } = useParams<{ reportUuid: string }>();
  const { reportDefinition, isLoading, error } = useReportDefinition(reportUuid);

  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [selectedMonths, setSelectedMonths] = useState<Array<ReportingMonth>>([]);
  const [results, setResults] = useState<Array<ReportDataSet> | null>(null);
  const [feederDatasets, setFeederDatasets] = useState<Set<string>>(() => new Set());
  const [running, setRunning] = useState(false);
  const [downloadingUuid, setDownloadingUuid] = useState<string | null>(null);
  const [status, setStatus] = useState<{ text: string; kind: 'success' | 'error' } | null>(null);
  const downloadAbortRef = useRef<AbortController | null>(null);

  // Clear the previous report's results when the route changes, and abort any
  // in-flight download poll.
  useEffect(() => {
    setResults(null);
    setFeederDatasets(new Set());
    setStatus(null);
    setSelectedMonths([]);
    return () => {
      downloadAbortRef.current?.abort();
    };
  }, [reportUuid]);

  const params = useMemo(() => reportDefinition?.parameters ?? [], [reportDefinition]);

  // A report declaring both of these is period-filtered by Ethiopian fiscal year and
  // month rather than by a date range, and renders dropdowns instead of date pickers.
  const usesEthiopianPeriod = useMemo(
    () => params.some((p) => p.name === FISCAL_YEAR_PARAM) && params.some((p) => p.name === MONTHS_PARAM),
    [params],
  );

  const fiscalYear = paramValues[FISCAL_YEAR_PARAM];
  // The months on offer follow the chosen FY, so a month outside it can't be picked.
  const monthOptions = useMemo(() => (fiscalYear ? monthsOfFiscalYear(Number(fiscalYear)) : []), [fiscalYear]);

  const allFilled = useMemo(
    () => params.every((p) => paramValues[p.name] && paramValues[p.name].length > 0),
    [params, paramValues],
  );

  const setParam = useCallback((name: string, value: string) => {
    setParamValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  /** Changing the FY clears any months, which belonged to the previous year's list. */
  const handleFiscalYearChange = useCallback((year: number | null) => {
    setSelectedMonths([]);
    setParamValues((prev) => ({
      ...prev,
      [FISCAL_YEAR_PARAM]: year === null ? '' : String(year),
      [MONTHS_PARAM]: '',
    }));
  }, []);

  /**
   * Stores the selection in the FY's own month order rather than the order the user
   * ticked them, so the report's rows always read chronologically.
   */
  const handleMonthsChange = useCallback(
    (months: Array<ReportingMonth>) => {
      const ordered = monthOptions.filter((option) => months.some((m) => m.label === option.label));
      setSelectedMonths(ordered);
      setParam(MONTHS_PARAM, serialiseMonths(ordered));
    },
    [monthOptions, setParam],
  );

  /** True for either form the backend may report: "java.util.Date" or a bare "date". */
  const isDateParam = useCallback((type: string | undefined | null) => {
    if (!type) {
      return false;
    }
    return type === 'date' || type.toLowerCase().endsWith('.date') || type.toLowerCase() === 'date';
  }, []);

  // Detected by name so any report using the conventional start/end date pair gets
  // the range constraint below; reports without one are unaffected.
  const startParam = useMemo(
    () => params.find((p) => isDateParam(p.type) && START_PARAM_PATTERN.test(p.name))?.name,
    [params, isDateParam],
  );
  const endParam = useMemo(
    () => params.find((p) => isDateParam(p.type) && END_PARAM_PATTERN.test(p.name))?.name,
    [params, isDateParam],
  );

  // Memoized on the raw string, not recomputed per render: OpenmrsDatePicker keys
  // its own `minDate` memo off object identity, so a fresh Date each render would
  // churn the constraint all the way down into the underlying calendar.
  const startRaw = startParam ? paramValues[startParam] : undefined;
  const endRaw = endParam ? paramValues[endParam] : undefined;
  const startDateValue = useMemo(() => parseIsoDate(startRaw), [startRaw]);
  const endDateValue = useMemo(() => parseIsoDate(endRaw), [endRaw]);
  const endBeforeStart = startDateValue !== null && endDateValue !== null && endDateValue < startDateValue;

  // `allFilled` already covers this, since months serialise to '' when empty; kept
  // separate so the user is told what is missing rather than just seeing a dead button.
  const noMonthsSelected = usesEthiopianPeriod && selectedMonths.length === 0;

  const handleRun = useCallback(async () => {
    if (noMonthsSelected) {
      setStatus({ text: t('selectAtLeastOneMonth', 'Please select at least one month.'), kind: 'error' });
      return;
    }
    if (!reportUuid || !allFilled) {
      setStatus({ text: t('fillAllFields', 'Please fill in all required fields.'), kind: 'error' });
      return;
    }
    // Backstop for the calendar's minDate, which a typed-in value bypasses.
    if (endBeforeStart) {
      setStatus({
        text: t('endDateBeforeStartDate', 'End date must be on or after the begin date.'),
        kind: 'error',
      });
      return;
    }
    setRunning(true);
    setStatus({ text: t('running', 'Running report, please wait…'), kind: 'success' });
    try {
      // Run in parallel: the feeder list decides which datasets stay hidden.
      const [dataSets, feeders] = await Promise.all([
        runReport(reportUuid, paramValues),
        fetchFeederDatasetNames(reportUuid),
      ]);
      setResults(dataSets);
      setFeederDatasets(feeders);
      setStatus({ text: t('reportCompleted', 'Report completed successfully.'), kind: 'success' });
    } catch (e) {
      setStatus({
        text: (e as Error)?.message ?? t('reportFailed', 'Report evaluation failed on the server.'),
        kind: 'error',
      });
    } finally {
      setRunning(false);
    }
  }, [reportUuid, allFilled, endBeforeStart, noMonthsSelected, paramValues, t]);

  const handleDownload = useCallback(
    async (designUuid: string) => {
      if (noMonthsSelected) {
        setStatus({ text: t('selectAtLeastOneMonth', 'Please select at least one month.'), kind: 'error' });
        return;
      }
      if (!reportUuid || !allFilled) {
        setStatus({ text: t('fillAllFields', 'Please fill in all required fields.'), kind: 'error' });
        return;
      }
      // Same range guard as handleRun: a design render of an inverted range is just
      // as empty as an on-screen one, and just as unexplained.
      if (endBeforeStart) {
        setStatus({
          text: t('endDateBeforeStartDate', 'End date must be on or after the begin date.'),
          kind: 'error',
        });
        return;
      }
      downloadAbortRef.current?.abort();
      const controller = new AbortController();
      downloadAbortRef.current = controller;
      setDownloadingUuid(designUuid);
      setStatus({ text: t('generatingDownload', 'Generating download, please wait…'), kind: 'success' });
      try {
        await downloadReportDesign(reportUuid, designUuid, paramValues, controller.signal);
        setStatus({ text: t('downloadReady', 'Download ready.'), kind: 'success' });
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') {
          return;
        }
        setStatus({ text: (e as Error)?.message ?? t('downloadFailed', 'Download failed.'), kind: 'error' });
      } finally {
        setDownloadingUuid(null);
      }
    },
    [reportUuid, allFilled, endBeforeStart, noMonthsSelected, paramValues, t],
  );

  if (isLoading) {
    return (
      <div className={styles.container}>
        <InlineLoading description={t('loading', 'Loading…')} />
      </div>
    );
  }

  if (error || !reportDefinition) {
    return (
      <div className={styles.container}>
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          title={t('errorLoadingReport', 'Could not load this report.')}
          subtitle={(error as Error)?.message ?? ''}
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>{reportDefinition.name}</h2>
      {reportDefinition.description && <p className={styles.description}>{reportDefinition.description}</p>}

      <Layer className={styles.formPanel}>
        <div className={styles.fields}>
          {params.map((param) =>
            param.name === FISCAL_YEAR_PARAM ? (
              <Dropdown
                key={param.name}
                id={`param-${param.name}`}
                titleText={param.label}
                label={t('selectFiscalYear', 'Select a fiscal year')}
                className={styles.field}
                items={FISCAL_YEARS}
                itemToString={(year: number | null) => (year === null ? '' : String(year))}
                selectedItem={fiscalYear ? Number(fiscalYear) : null}
                onChange={({ selectedItem }: { selectedItem: number | null }) => handleFiscalYearChange(selectedItem)}
              />
            ) : param.name === MONTHS_PARAM ? (
              <FilterableMultiSelect
                key={param.name}
                id={`param-${param.name}`}
                titleText={param.label}
                placeholder={
                  fiscalYear
                    ? t('selectMonths', 'Select one or more months')
                    : t('selectFiscalYearFirst', 'Select a fiscal year first')
                }
                className={styles.monthField}
                disabled={!fiscalYear}
                items={monthOptions}
                itemToString={(month: ReportingMonth | null) => month?.label ?? ''}
                /* Keyed on label so the chosen months survive the list being rebuilt. */
                initialSelectedItems={monthOptions.filter((option) =>
                  selectedMonths.some((m) => m.label === option.label),
                )}
                /* Identity, because the default sorts by label — which would order
                   the months alphabetically (Ginbot, Hamle, Hidar…) instead of
                   chronologically. monthOptions is already in fiscal-year order. */
                sortItems={(items: Array<ReportingMonth>) => items}
                /* 'fixed' keeps the chronological order on reopen; the default
                   'top-after-reopen' hoists ticked months to the top. */
                selectionFeedback="fixed"
                onChange={({ selectedItems }: { selectedItems: Array<ReportingMonth> }) =>
                  handleMonthsChange(selectedItems ?? [])
                }
              />
            ) : isDateParam(param.type) ? (
              /* The shared EMR picker, so dates follow the deployment's configured
                 calendar. It returns a JS Date, stored here as a Gregorian ISO string. */
              <OpenmrsDatePicker
                key={param.name}
                id={`param-${param.name}`}
                labelText={param.label}
                className={styles.field}
                value={paramValues[param.name] || null}
                /* Only the end date is bounded. Capping the start date at the current
                   end date would strand the user in the period they just ran, since
                   advancing to a later one sets the start date first. */
                minDate={param.name === endParam ? startDateValue ?? undefined : undefined}
                /* Left undefined rather than false when the range is fine: the picker
                   resolves `invalid ?? isInvalid`, so an explicit false would suppress
                   its own validity signal on every date field. */
                invalid={param.name === endParam && endBeforeStart ? true : undefined}
                invalidText={t('endDateBeforeStartDate', 'End date must be on or after the begin date.')}
                onChange={(date) => setParam(param.name, date ? formatIsoDate(date) : '')}
              />
            ) : (
              <TextInput
                key={param.name}
                id={`param-${param.name}`}
                labelText={param.label}
                size="md"
                className={styles.field}
                value={paramValues[param.name] ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setParam(param.name, e.target.value)}
              />
            ),
          )}
        </div>

        <div className={styles.actions}>
          <Button
            kind="primary"
            disabled={running || !allFilled || endBeforeStart || noMonthsSelected}
            onClick={handleRun}>
            {running ? <InlineLoading description={t('running', 'Running…')} /> : t('runReport', 'Run Report')}
          </Button>
          {reportDefinition.designs.map((design) => (
            <Button
              key={design.uuid}
              kind="tertiary"
              disabled={downloadingUuid !== null || endBeforeStart || noMonthsSelected}
              onClick={() => handleDownload(design.uuid)}>
              {downloadingUuid === design.uuid ? (
                <InlineLoading description={t('generatingDownload', 'Generating…')} />
              ) : (
                `${t('download', 'Download')} ${design.name}`
              )}
            </Button>
          ))}
        </div>

        {status && (
          <InlineNotification
            className={styles.status}
            kind={status.kind}
            lowContrast
            hideCloseButton
            title={status.text}
          />
        )}
      </Layer>

      {results && <ReportResults dataSets={results} feederDatasets={feederDatasets} />}
    </div>
  );
};

/**
 * Parses a yyyy-MM-dd value as local midnight, which `new Date(s)` would read as
 * UTC. Rejects anything that isn't three numbers; a value that parses but doesn't
 * exist (2025-02-30) still rolls over, which is harmless here since date params
 * only ever come from the picker.
 */
function parseIsoDate(value: string | undefined): Date | null {
  if (!value) {
    return null;
  }
  const [y, m, d] = value.split('-').map(Number);
  return Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d) ? new Date(y, m - 1, d) : null;
}

function formatIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default ReportRunner;
