import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import { fhirBaseUrl, openmrsFetch } from '@openmrs/esm-framework';

interface FhirObservation {
  id: string;
  hasMember?: Array<{ reference: string }>;
  code?: { text?: string };
  valueQuantity?: { value?: number; unit?: string };
  referenceRange?: Array<{
    low?: { value: number };
    high?: { value: number };
    type?: { coding?: Array<{ code: string }> };
  }>;
  effectiveDateTime?: string;
  issued?: string;
  [key: string]: unknown;
}

export type InterpretationClass = 'high' | 'low' | 'normal' | 'notAvailable';

export interface RenalLabResult {
  testName: string;
  value: string;
  interpretation: string;
  interpretationClass: InterpretationClass;
}

type TFunction = (key: string, defaultValue: string) => string;

export function mapMembersToRenalResults(members: Array<FhirObservation>, t: TFunction): Array<RenalLabResult> {
  return members.map((obs) => {
    const testName = obs.code?.text ?? 'Unknown';
    const numericValue = obs.valueQuantity?.value;
    const unit = obs.valueQuantity?.unit ?? '';
    const value = numericValue === undefined ? 'N/A' : `${numericValue} ${unit}`.trim();

    const normalRange = obs.referenceRange?.find((r) => r.type?.coding?.some((c) => c.code === 'normal'));

    let interpretation = t('notAvailable', 'N/A');
    let interpretationClass: InterpretationClass = 'notAvailable';
    if (normalRange && numericValue !== undefined) {
      if (numericValue < (normalRange.low?.value ?? -Infinity)) {
        interpretation = t('low', 'Low');
        interpretationClass = 'low';
      } else if (numericValue > (normalRange.high?.value ?? Infinity)) {
        interpretation = t('high', 'High');
        interpretationClass = 'high';
      } else {
        interpretation = t('normal', 'Normal');
        interpretationClass = 'normal';
      }
    }

    return { testName, value, interpretation, interpretationClass };
  });
}

interface FhirBundleEntry {
  resource: FhirObservation;
}

interface FhirBundle {
  entry?: Array<FhirBundleEntry>;
}

export function useLatestRenalFunctionPanel(
  patientUuid: string,
  panelConceptUuid: string,
  validityPeriodInDays: number,
) {
  const { t } = useTranslation();
  const since = new Date();
  since.setDate(since.getDate() - validityPeriodInDays);

  const url =
    `${fhirBaseUrl}/Observation` +
    `?patient=${patientUuid}` +
    `&code=${panelConceptUuid}` +
    `&date=ge${since.toISOString().split('T')[0]}` +
    `&_include=Observation:has-member` +
    `&_sort=-date` +
    `&_count=1`;

  const lastResultUrl =
    patientUuid && panelConceptUuid
      ? `${fhirBaseUrl}/Observation?patient=${patientUuid}&code=${panelConceptUuid}&_sort=-date&_count=1`
      : null;

  const { data, error, isLoading } = useSWR<{ data: FhirBundle }>(
    patientUuid && panelConceptUuid ? url : null,
    openmrsFetch,
  );

  const { data: lastResultData } = useSWR<{ data: FhirBundle }>(lastResultUrl, openmrsFetch);

  const entries = data?.data?.entry ?? [];
  const panel = entries.find((e: FhirBundleEntry) => e.resource.hasMember !== undefined)?.resource;
  const members = entries.map((e: FhirBundleEntry) => e.resource).filter((r) => r.id !== panel?.id);
  const interpretedResults = mapMembersToRenalResults(members ?? [], t);

  const lastPanel = lastResultData?.data?.entry?.find(
    (e: FhirBundleEntry) => e.resource.hasMember !== undefined,
  )?.resource;
  const lastResultDate = lastPanel?.effectiveDateTime ?? lastPanel?.issued ?? null;

  return { panel, members, hasValidResult: Boolean(panel), isLoading, error, interpretedResults, lastResultDate };
}
