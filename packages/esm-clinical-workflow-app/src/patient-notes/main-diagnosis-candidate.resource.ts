import useSWR from 'swr';
import {
  resolveMainDiagnosisCandidatesForPrimaries,
  type MainDiagnosisCandidate,
  type ResolveMainDiagnosisCandidateOptions,
} from './main-diagnosis-candidate.utils';

function mainDiagnosisCandidatesSwrKey(
  primaryConceptUuids: ReadonlyArray<string>,
  options: ResolveMainDiagnosisCandidateOptions,
  enabled: boolean,
): readonly [string, string, string, string] | null {
  if (!enabled || !primaryConceptUuids.length) {
    return null;
  }
  const sortedUuids = [...primaryConceptUuids].sort().join(',');
  return ['mainDiagnosisCandidates', sortedUuids, options.esvIcd11ConceptSourceUuid, options.diagnosisConceptClass];
}

export function useMainDiagnosisCandidates(
  primaryConceptUuids: ReadonlyArray<string>,
  options: ResolveMainDiagnosisCandidateOptions,
  enabled = true,
) {
  const { data, error, isLoading, isValidating } = useSWR<Array<MainDiagnosisCandidate>>(
    mainDiagnosisCandidatesSwrKey(primaryConceptUuids, options, enabled),
    () => resolveMainDiagnosisCandidatesForPrimaries([...primaryConceptUuids], options),
  );

  return {
    mainDiagnosisCandidates: data ?? [],
    error,
    isLoading: isLoading || isValidating,
  };
}
