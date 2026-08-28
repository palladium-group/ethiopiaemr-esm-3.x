import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { Button, InlineLoading, InlineNotification, Layer, TextInput } from '@carbon/react';
import { OpenmrsDatePicker } from '@openmrs/esm-framework';
import { useReportDefinition } from '../api/reports.resource';
import { runReport, fetchFeederDatasetNames, downloadReportDesign, type ReportDataSet } from '../api/report-request';
import ReportResults from './report-results.component';
import styles from './report-runner.component.scss';

const ReportRunner: React.FC = () => {
  const { t } = useTranslation();
  const { reportUuid } = useParams<{ reportUuid: string }>();
  const { reportDefinition, isLoading, error } = useReportDefinition(reportUuid);

  const [paramValues, setParamValues] = useState<Record<string, string>>({});
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
    return () => {
      downloadAbortRef.current?.abort();
    };
  }, [reportUuid]);

  const params = useMemo(() => reportDefinition?.parameters ?? [], [reportDefinition]);

  const allFilled = useMemo(
    () => params.every((p) => paramValues[p.name] && paramValues[p.name].length > 0),
    [params, paramValues],
  );

  const setParam = useCallback((name: string, value: string) => {
    setParamValues((prev) => ({ ...prev, [name]: value }));
  }, []);

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
    () => params.find((p) => isDateParam(p.type) && /^start(date)?$/i.test(p.name))?.name,
    [params, isDateParam],
  );
  const endParam = useMemo(
    () => params.find((p) => isDateParam(p.type) && /^end(date)?$/i.test(p.name))?.name,
    [params, isDateParam],
  );

  /** Parses a yyyy-MM-dd value as local midnight, which `new Date(s)` would read as UTC. */
  const parseIsoDate = useCallback((value: string | undefined): Date | null => {
    if (!value) {
      return null;
    }
    const [y, m, d] = value.split('-').map(Number);
    return Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d) ? new Date(y, m - 1, d) : null;
  }, []);

  const startDateValue = startParam ? parseIsoDate(paramValues[startParam]) : null;
  const endDateValue = endParam ? parseIsoDate(paramValues[endParam]) : null;
  const endBeforeStart = startDateValue !== null && endDateValue !== null && endDateValue < startDateValue;

  const handleRun = useCallback(async () => {
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
  }, [reportUuid, allFilled, endBeforeStart, paramValues, t]);

  const handleDownload = useCallback(
    async (designUuid: string) => {
      if (!reportUuid || !allFilled) {
        setStatus({ text: t('fillAllFields', 'Please fill in all required fields.'), kind: 'error' });
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
    [reportUuid, allFilled, paramValues, t],
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
            isDateParam(param.type) ? (
              /* The shared EMR picker, so dates follow the deployment's configured
                 calendar. It returns a JS Date, stored here as a Gregorian ISO string. */
              <OpenmrsDatePicker
                key={param.name}
                id={`param-${param.name}`}
                labelText={param.label}
                className={styles.field}
                value={paramValues[param.name] || null}
                /* Only the end date is bounded. Capping the begin date at the current
                   end date would strand the user in the period they just ran, since
                   advancing to a later one sets the begin date first. */
                minDate={param.name === endParam ? startDateValue ?? undefined : undefined}
                invalid={param.name === endParam && endBeforeStart}
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
          <Button kind="primary" disabled={running || !allFilled || endBeforeStart} onClick={handleRun}>
            {running ? <InlineLoading description={t('running', 'Running…')} /> : t('runReport', 'Run Report')}
          </Button>
          {reportDefinition.designs.map((design) => (
            <Button
              key={design.uuid}
              kind="tertiary"
              disabled={downloadingUuid !== null}
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

function formatIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default ReportRunner;
