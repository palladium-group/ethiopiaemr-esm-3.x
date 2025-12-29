import { Encounter, fetchCurrentPatient, launchWorkspace2, showModal, showSnackbar } from '@openmrs/esm-framework';
import { createVisitForPatient, getCurrentVisitForPatient } from './triage/triage.resource';

export const handleStartVisitAndLaunchTriageForm = async (
  patientUuid: string,
  formUuid: string,
  formName: string,
  visitTypeUuid: string,
) => {
  if (!patientUuid?.trim()) {
    showSnackbar({
      title: 'Error',
      kind: 'error',
      subtitle: 'Patient UUID is required',
      isLowContrast: true,
    });
    return;
  }

  if (!formUuid?.trim()) {
    showSnackbar({
      title: 'Error',
      kind: 'error',
      subtitle: 'Form UUID is required',
      isLowContrast: true,
    });
    return;
  }

  if (!formName?.trim()) {
    showSnackbar({
      title: 'Error',
      kind: 'error',
      subtitle: 'Form name is required',
      isLowContrast: true,
    });
    return;
  }

  if (!visitTypeUuid?.trim()) {
    showSnackbar({
      title: 'Error',
      kind: 'error',
      subtitle: 'Visit type UUID is required',
      isLowContrast: true,
    });
    return;
  }

  try {
    const patient = await fetchCurrentPatient(patientUuid);

    if (!patient) {
      throw new Error('Failed to fetch patient data');
    }

    let activeVisit = await getCurrentVisitForPatient(patientUuid);
    if (!activeVisit) {
      const visitResponse = await createVisitForPatient(patientUuid, visitTypeUuid);
      if (!visitResponse.ok) {
        throw new Error(visitResponse.data?.error?.message || 'Error starting visit for patient');
      }
      activeVisit = visitResponse.data;
    }

    if (!activeVisit?.uuid || !activeVisit?.visitType?.uuid) {
      throw new Error('Invalid visit data received');
    }

    const handleShowModal = (encounter: Encounter) => {
      const dispose = showModal('transition-patient-to-latest-queue-modal', {
        activeVisit: activeVisit,
        closeModal: () => dispose(),
      });
    };

    launchWorkspace2(
      'clinical-workflow-patient-form-entry-workspace',
      {
        formEntryWorkspaceName: formName,
        patient: patient,
        visitContext: activeVisit,
        form: {
          visitUuid: activeVisit.uuid,
          uuid: formUuid,
          visitTypeUuid: activeVisit.visitType.uuid,
        },
        encounterUuid: '',
        handlePostResponse: handleShowModal,
      },
      {
        patientUuid: patientUuid,
        patient: patient,
        visitContext: activeVisit,
      },
    );

    // Set z-index for workspace container
    setTimeout(() => {
      const workspaceContainer = document.getElementById('omrs-workspaces-container');
      if (workspaceContainer) {
        workspaceContainer.style.zIndex = '100';
      }
    }, 0);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';

    showSnackbar({
      title: 'Error starting visit for patient',
      kind: 'error',
      subtitle: errorMessage,
      isLowContrast: true,
    });
  }
};
