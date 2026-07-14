import useSWR from 'swr';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';

const VISIT_DIAGNOSES_REP =
  'custom:(encounters:(uuid,diagnoses:(uuid,display,rank,voided,diagnosis:(coded:(display)))))';

interface VisitDiagnosisRow {
  rank?: number;
  voided?: boolean;
  display?: string;
  diagnosis?: { coded?: { display?: string } };
}

interface VisitEncounterRow {
  diagnoses?: VisitDiagnosisRow[];
}

interface VisitWithDiagnoses {
  encounters?: VisitEncounterRow[];
}

export function getPrimaryDiagnosisLabels(visit: VisitWithDiagnoses | null | undefined): string[] {
  const labels = new Set<string>();
  for (const encounter of visit?.encounters ?? []) {
    for (const diagnosis of encounter.diagnoses ?? []) {
      if (diagnosis.voided || diagnosis.rank !== 1) {
        continue;
      }
      const label = diagnosis.display ?? diagnosis.diagnosis?.coded?.display;
      if (label) {
        labels.add(label);
      }
    }
  }
  return Array.from(labels);
}

export function useVisitPrimaryDiagnoses(visitUuid: string | undefined) {
  const { data, error, isLoading } = useSWR(visitUuid ? ['visit-primary-diagnoses', visitUuid] : null, async () => {
    const { data: visitData } = await openmrsFetch<VisitWithDiagnoses>(
      `${restBaseUrl}/visit/${visitUuid}?v=${VISIT_DIAGNOSES_REP}`,
    );
    return getPrimaryDiagnosisLabels(visitData);
  });

  return {
    primaryDiagnoses: data ?? [],
    isLoading,
    error,
  };
}

export function getEncounterProviderNames(
  encounterProviders: Array<{ provider?: { display?: string; person?: { display?: string } } }> | undefined,
): string {
  if (!encounterProviders?.length) {
    return '--';
  }

  return (
    encounterProviders
      .map((encounterProvider) => encounterProvider.provider?.display ?? encounterProvider.provider?.person?.display)
      .filter(Boolean)
      .join(', ') || '--'
  );
}
