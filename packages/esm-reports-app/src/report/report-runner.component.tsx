import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import {
  Button,
  DatePicker,
  DatePickerInput,
  InlineLoading,
  InlineNotification,
  Layer,
  TextInput,
} from '@carbon/react';
import { useConfig } from '@openmrs/esm-framework';
import { type EthiopiaReportsConfig } from '../config-schema';
import { useReportDefinition } from '../api/reports.resource';
import { runReport, downloadReportDesign, type ReportDataSet } from '../api/report-request';
import ReportResults from './report-results.component';
import styles from './report-runner.component.scss';

const ReportRunner: React.FC = () => {
  const { t } = useTranslation();
  const { reportUuid } = useParams<{ reportUuid: string }>();
  const config = useConfig<EthiopiaReportsConfig>();
  const { reportDefinition, isLoading, error } = useReportDefinition(reportUuid);

  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Array<ReportDataSet> | null>(null);
  const [running, setRunning] = useState(false);
  const [downloadingUuid, setDownloadingUuid] = useState<string | null>(null);
  const [status, setStatus] = useState<{ text: string; kind: 'success' | 'error' } | null>(null);
  const downloadAbortRef = useRef<AbortController | null>(null);

  // Abort any in-flight download poll when the component unmounts or the report changes.
  useEffect(() => {
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

  // The backend reports a parameter's type as its fully-qualified Java class name
  // (e.g. "java.util.Date"), while older/other sources may send a bare "date".
  // Normalize so any Date-like type renders the Carbon date picker.
  const isDateParam = useCallback((type: string | undefined | null) => {
    if (!type) {
      return false;
    }
    return type === 'date' || type.toLowerCase().endsWith('.date') || type.toLowerCase() === 'date';
  }, []);

  const handleRun = useCallback(async () => {
    if (!reportUuid || !allFilled) {
      setStatus({ text: t('fillAllFields', 'Please fill in all required fields.'), kind: 'error' });
      return;
    }
    setRunning(true);
    setStatus({ text: t('running', 'Running report, please wait…'), kind: 'success' });
    try {
      const dataSets = await runReport(reportUuid, paramValues);
      setResults(dataSets);
      setStatus({ text: t('reportCompleted', 'Report completed successfully.'), kind: 'success' });
    } catch (e) {
      setStatus({
        text: (e as Error)?.message ?? t('reportFailed', 'Report evaluation failed on the server.'),
        kind: 'error',
      });
    } finally {
      setRunning(false);
    }
  }, [reportUuid, allFilled, paramValues, t]);

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
              <DatePicker
                key={param.name}
                datePickerType="single"
                dateFormat="Y-m-d"
                className={styles.field}
                onChange={(dates: Array<Date>) => {
                  // Carbon's single DatePicker fires onChange with an empty array when it
                  // closes without a (re)selection — e.g. when focus moves to the other
                  // date field. Treat that as "no change" so it doesn't clobber a value the
                  // user already picked. An explicit clear is handled via the input's
                  // onChange below.
                  const d = dates?.[0];
                  if (d) {
                    setParam(param.name, formatIsoDate(d));
                  }
                }}>
                <DatePickerInput
                  id={`param-${param.name}`}
                  labelText={param.label}
                  placeholder="yyyy-mm-dd"
                  size="md"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    if (!e.target.value) {
                      setParam(param.name, '');
                    }
                  }}
                />
              </DatePicker>
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
          <Button kind="primary" disabled={running || !allFilled} onClick={handleRun}>
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

      {results && (
        <ReportResults
          reportUuid={reportUuid}
          dataSets={results}
          columnOrderByUuid={config.columnOrderByUuid}
          hiddenDatasets={config.hiddenDatasets}
        />
      )}
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
