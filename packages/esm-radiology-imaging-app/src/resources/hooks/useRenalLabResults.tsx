import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import useSWRImmutable from 'swr/immutable';
import { fhirBaseUrl, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';

interface FhirCoding {
  system?: string;
  code?: string;
  display?: string;
}

interface FhirObservation {
  id: string;
  hasMember?: Array<{ reference: string }>;
  code?: {
    text?: string;
    coding?: Array<FhirCoding>;
  };
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
    const testName = obs.code?.text ?? obs.code?.coding?.[0]?.display ?? 'Unknown';
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

interface ConceptSetMember {
  uuid: string;
  display: string;
}

interface ConceptSetResponse {
  uuid: string;
  display: string;
  setMembers?: Array<ConceptSetMember>;
}

function getObservationConceptUuid(obs: FhirObservation): string | undefined {
  return obs.code?.coding?.find((coding) => Boolean(coding.code))?.code;
}

function getObservationDate(obs: FhirObservation): string | null {
  return obs.effectiveDateTime ?? obs.issued ?? null;
}

function toDateKey(iso: string): string {
  return iso.split('T')[0];
}

/**
 * Selects one Observation per set-member concept from the most recent calendar day
 * that has results (optionally restricted to observations on/after `sinceDate`).
 */
export function selectLatestPanelDraw(
  observations: Array<FhirObservation>,
  memberUuids: Set<string>,
  sinceDate?: Date,
): Array<FhirObservation> {
  const relevant = observations.filter((obs) => {
    const conceptUuid = getObservationConceptUuid(obs);
    if (!conceptUuid || !memberUuids.has(conceptUuid)) {
      return false;
    }

    const dateStr = getObservationDate(obs);
    if (!dateStr) {
      return false;
    }

    if (sinceDate && new Date(dateStr) < sinceDate) {
      return false;
    }

    return true;
  });

  if (!relevant.length) {
    return [];
  }

  relevant.sort((a, b) => {
    const dateA = getObservationDate(a) ?? '';
    const dateB = getObservationDate(b) ?? '';
    return dateB.localeCompare(dateA);
  });

  const latestDay = toDateKey(getObservationDate(relevant[0])!);
  const onLatestDay = relevant.filter((obs) => {
    const dateStr = getObservationDate(obs);
    return Boolean(dateStr && toDateKey(dateStr) === latestDay);
  });

  const seenConcepts = new Set<string>();
  const selected: Array<FhirObservation> = [];

  for (const obs of onLatestDay) {
    const conceptUuid = getObservationConceptUuid(obs);
    if (!conceptUuid || seenConcepts.has(conceptUuid)) {
      continue;
    }
    seenConcepts.add(conceptUuid);
    selected.push(obs);
  }

  return selected;
}

export function getLatestObservationDate(observations: Array<FhirObservation>): string | null {
  let latest: string | null = null;

  for (const obs of observations) {
    const dateStr = getObservationDate(obs);
    if (!dateStr) {
      continue;
    }
    if (!latest || dateStr > latest) {
      latest = dateStr;
    }
  }

  return latest;
}

function useRenalPanelSetMembers(panelConceptUuid: string) {
  const url = panelConceptUuid
    ? `${restBaseUrl}/concept/${panelConceptUuid}?v=custom:(uuid,display,setMembers:(uuid,display))`
    : null;

  const { data, error, isLoading } = useSWRImmutable<{ data: ConceptSetResponse }>(url, openmrsFetch);

  return {
    setMembers: data?.data?.setMembers ?? [],
    error,
    isLoading,
  };
}

export function useLatestRenalFunctionPanel(
  patientUuid: string,
  panelConceptUuid: string,
  validityPeriodInDays: number,
) {
  const { t } = useTranslation();
  const { setMembers, error: conceptError, isLoading: isLoadingConcepts } = useRenalPanelSetMembers(panelConceptUuid);

  const memberUuids = useMemo(() => new Set(setMembers.map((member) => member.uuid)), [setMembers]);
  const memberCodeParam = setMembers.map((member) => member.uuid).join(',');

  const since = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - validityPeriodInDays);
    date.setHours(0, 0, 0, 0);
    return date;
  }, [validityPeriodInDays]);

  // Fetch enough observations to cover one full panel draw (and history for lastResultDate).
  // Results are stored under set-member concepts, not the panel concept itself.
  const observationsUrl =
    patientUuid && memberCodeParam
      ? `${fhirBaseUrl}/Observation` +
        `?patient=${patientUuid}` +
        `&code=${memberCodeParam}` +
        `&_sort=-date` +
        `&_count=${Math.max(setMembers.length * 5, 20)}`
      : null;

  const {
    data,
    error: observationsError,
    isLoading: isLoadingObservations,
  } = useSWR<{ data: FhirBundle }>(observationsUrl, openmrsFetch);

  const allObservations = useMemo(() => (data?.data?.entry ?? []).map((entry) => entry.resource), [data]);

  const members = useMemo(
    () => selectLatestPanelDraw(allObservations, memberUuids, since),
    [allObservations, memberUuids, since],
  );

  const interpretedResults = useMemo(() => mapMembersToRenalResults(members, t), [members, t]);

  const lastResultDate = useMemo(() => {
    const memberObservations = allObservations.filter((obs) => {
      const conceptUuid = getObservationConceptUuid(obs);
      return Boolean(conceptUuid && memberUuids.has(conceptUuid));
    });
    return getLatestObservationDate(memberObservations);
  }, [allObservations, memberUuids]);

  const isLoading = isLoadingConcepts || Boolean(observationsUrl && isLoadingObservations);
  const error = conceptError ?? observationsError;
  const hasValidResult = members.length > 0;

  return {
    panel: null,
    members,
    hasValidResult,
    isLoading,
    error,
    interpretedResults,
    lastResultDate,
  };
}
