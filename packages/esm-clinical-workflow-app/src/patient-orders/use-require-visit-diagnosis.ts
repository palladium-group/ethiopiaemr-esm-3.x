import { useMemo } from 'react';
import { useConfig, useVisit } from '@openmrs/esm-framework';
import type { ClinicalWorkflowConfig } from '../config-schema';
import { useActiveVisitWithEncounters, visitHasPrimaryDiagnosis } from '../patient-notes/visit-main-diagnosis.resource';

/**
 * Status for the order-basket diagnosis banner.
 * Does not control whether orders can be saved — that is enforced by the
 * ethiopiaemrcore backend global properties / validator.
 */
export function useRequireVisitDiagnosis(patientUuid: string) {
  const { showOrderBasketDiagnosisBanner } = useConfig<ClinicalWorkflowConfig>();
  const { activeVisit, isValidating: isLoadingActiveVisit } = useVisit(patientUuid || null);
  const { visitWithEncounters, isLoading: isLoadingVisitDiagnoses } = useActiveVisitWithEncounters(
    patientUuid,
    activeVisit?.uuid,
  );

  const hasPrimaryDiagnosis = useMemo(() => visitHasPrimaryDiagnosis(visitWithEncounters), [visitWithEncounters]);

  const isChecking =
    Boolean(showOrderBasketDiagnosisBanner && activeVisit?.uuid) && (isLoadingActiveVisit || isLoadingVisitDiagnoses);

  return {
    hasPrimaryDiagnosis,
    isChecking,
    showOrderBasketDiagnosisBanner,
    shouldShowBanner:
      Boolean(showOrderBasketDiagnosisBanner && activeVisit?.uuid) && !isChecking && !hasPrimaryDiagnosis,
  };
}
