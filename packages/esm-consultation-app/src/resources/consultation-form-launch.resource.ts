import type { TFunction } from 'i18next';
import type { KeyedMutator } from 'swr';
import {
  fetchCurrentPatient,
  launchWorkspace2,
  showSnackbar,
  type Encounter,
  type Visit,
} from '@openmrs/esm-framework';
import { invalidateVisitAndEncounterData } from '@openmrs/esm-patient-common-lib';
import type { ConsultationConceptUuids } from '../config-schema';
import { CONSULTATION_FORM_NAME } from '../constants';
import { revalidateConsultationsInbox, revalidatePatientConsultations } from './consultation-cache.resource';
import { validateSavedConsultationEncounter } from './consultation-form-validation.resource';
import { syncConsultationEncounterProviders } from './consultation-encounter-providers.resource';
import { getActiveVisitForPatient } from './consultation-visit.resource';
import { buildConsultationFormWorkspaceData } from '../workspaces/consultation-form.workspace';

type LaunchConsultationFormEntryOptions = {
  patientUuid: string;
  encounterUuid?: string;
  formUuid: string;
  workspaceName: string;
  globalMutate: KeyedMutator<unknown>;
  conceptUuids: ConsultationConceptUuids;
  onConsultationSaved?: () => void;
  t: TFunction;
  sessionLocationUuid?: string;
  currentProviderUuid?: string;
  requestingProviderUuid?: string;
  hasRequiredPrivilege?: boolean;
  visitContext?: Visit | null;
  mutateVisitContext?: (() => Promise<unknown> | void) | null;
  startVisitIfNeeded?: () => Promise<boolean>;
};

export async function launchConsultationFormEntry({
  patientUuid,
  encounterUuid = '',
  formUuid,
  workspaceName,
  globalMutate,
  conceptUuids,
  onConsultationSaved,
  t,
  sessionLocationUuid,
  currentProviderUuid,
  requestingProviderUuid,
  hasRequiredPrivilege = true,
  visitContext,
  mutateVisitContext,
  startVisitIfNeeded,
}: LaunchConsultationFormEntryOptions): Promise<boolean> {
  if (!patientUuid?.trim()) {
    return false;
  }

  if (!hasRequiredPrivilege) {
    showSnackbar({
      title: t('error', 'Error'),
      kind: 'error',
      subtitle: t('consultationPrivilegeRequired', 'You do not have permission to perform this consultation action.'),
      isLowContrast: true,
    });
    return false;
  }

  if (!sessionLocationUuid) {
    showSnackbar({
      title: t('error', 'Error'),
      kind: 'error',
      subtitle: t('sessionLocationRequired', 'A session location is required to save a consultation.'),
      isLowContrast: true,
    });
    return false;
  }

  if (!currentProviderUuid) {
    showSnackbar({
      title: t('error', 'Error'),
      kind: 'error',
      subtitle: t(
        'providerRequired',
        'Your user account must be linked to a provider before you can save a consultation.',
      ),
      isLowContrast: true,
    });
    return false;
  }

  if (startVisitIfNeeded) {
    const didStartVisit = await startVisitIfNeeded();
    if (!didStartVisit) {
      return false;
    }
  }

  if (mutateVisitContext) {
    await mutateVisitContext();
  }

  const [patient, fetchedVisit] = await Promise.all([
    fetchCurrentPatient(patientUuid),
    getActiveVisitForPatient(patientUuid),
  ]);
  const visit = fetchedVisit ?? (visitContext?.stopDatetime == null ? visitContext : null);

  if (!patient) {
    throw new Error('Failed to fetch patient data');
  }

  if (!visit?.uuid || !visit.visitType?.uuid) {
    throw new Error(t('consultationVisitRequired', 'An active visit is required to open the consultation form.'));
  }

  const handlePostResponse = (savedEncounter: Encounter) => {
    if (savedEncounter.uuid && currentProviderUuid) {
      syncConsultationEncounterProviders({
        encounterUuid: savedEncounter.uuid,
        currentProviderUuid,
        mode: encounterUuid ? 'respond' : 'create',
        requestingProviderUuid: encounterUuid ? requestingProviderUuid : undefined,
      }).catch((syncError) => {
        console.error('Failed to sync consultation encounter provider roles:', syncError);
      });
    }

    invalidateVisitAndEncounterData(globalMutate, patientUuid);
    Promise.all([revalidateConsultationsInbox(globalMutate), revalidatePatientConsultations(globalMutate, patientUuid)])
      .then(() => {
        onConsultationSaved?.();
      })
      .catch((revalidationError) => {
        console.error('Error revalidating consultation data:', revalidationError);
        onConsultationSaved?.();
      });

    const validation = validateSavedConsultationEncounter(
      savedEncounter,
      conceptUuids,
      encounterUuid ? 'respond' : 'create',
    );

    if (!validation.isValid) {
      showSnackbar({
        title: t('consultationValidationError', 'Consultation form incomplete'),
        kind: 'warning',
        subtitle: encounterUuid
          ? t(
              'consultationIncompleteResponse',
              'Both brief finding and recommendation are required to complete the consultation.',
            )
          : t(
              'consultationIncompleteRequest',
              'Consulted department, consultation type, and reason for consultation are required.',
            ),
        isLowContrast: true,
      });
      return;
    }

    showSnackbar({
      title: t('consultationSaved', 'Consultation saved'),
      kind: 'success',
      subtitle: encounterUuid
        ? t('consultationResponseSaved', 'Consultation response saved successfully.')
        : t('consultationRequestSaved', 'Consultation request sent successfully.'),
      isLowContrast: true,
    });
  };

  const workspaceData = buildConsultationFormWorkspaceData(
    patient,
    visit,
    formUuid,
    CONSULTATION_FORM_NAME,
    encounterUuid,
    handlePostResponse,
  );

  launchWorkspace2(workspaceName, workspaceData, {
    patient,
    patientUuid,
    visitContext: visit,
    mutateVisitContext: mutateVisitContext ?? null,
  });

  return true;
}
