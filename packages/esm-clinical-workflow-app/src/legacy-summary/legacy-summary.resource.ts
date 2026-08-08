import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import useSWR from 'swr';

export interface LegacyDiagnosis {
  display: string;
  order?: string;
  certainty?: string;
  recordedDate: string;
}

export interface LegacyMedication {
  display: string;
  orderDate: string;
}

export interface LegacySummary {
  diagnoses?: Array<LegacyDiagnosis>;
  medications?: Array<LegacyMedication>;
}

export interface TimelineEntry {
  type: 'diagnosis' | 'medication';
  date: string;
  display: string;
  detail?: string;
}

const fetcher = async (url: string) => {
  const response = await openmrsFetch<LegacySummary>(url);
  return response.data;
};

export function useLegacySummary(patientUuid: string) {
  const url = patientUuid ? `${restBaseUrl}/legacysummary/${patientUuid}` : null;
  return useSWR<LegacySummary>(url, fetcher, {
    shouldRetryOnError: false,
  });
}

export function buildTimeline(summary: LegacySummary): Array<TimelineEntry> {
  const entries: Array<TimelineEntry> = [];

  (summary.diagnoses ?? []).forEach((d) => {
    entries.push({
      type: 'diagnosis',
      date: d.recordedDate,
      display: d.display,
      detail: d.order ?? d.certainty,
    });
  });

  (summary.medications ?? []).forEach((m) => {
    entries.push({
      type: 'medication',
      date: m.orderDate,
      display: m.display,
    });
  });

  return entries.sort((a, b) => a.date.localeCompare(b.date));
}

export function isEmptySummary(summary?: LegacySummary): boolean {
  if (!summary) {
    return true;
  }
  return !(summary.diagnoses?.length || summary.medications?.length);
}
