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
import { CONSULTATION_FORM_NAME } from '../constants';
import { getActiveVisitForPatient } from './consultation-visit.resource';
import { buildConsultationFormWorkspaceData } from '../workspaces/consultation-form.workspace';

type LaunchConsultationFormEntryOptions = {
  patientUuid: string;
  encounterUuid?: string;
  formUuid: string;
  workspaceName: string;
  globalMutate: KeyedMutator<unknown>;
  onConsultationSaved?: () => void;
  t: TFunction;
  sessionLocationUuid?: string;
  currentProviderUuid?: string;
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
  onConsultationSaved,
  t,
  sessionLocationUuid,
  currentProviderUuid,
  visitContext,
  mutateVisitContext,
  startVisitIfNeeded,
}: LaunchConsultationFormEntryOptions): Promise<boolean> {
  if (!patientUuid?.trim()) {
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

  const handlePostResponse = (_encounter: Encounter) => {
    invalidateVisitAndEncounterData(globalMutate, patientUuid);
    onConsultationSaved?.();
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
