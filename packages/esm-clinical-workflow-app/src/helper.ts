import { fetchCurrentPatient, launchWorkspace, showModal, showSnackbar } from '@openmrs/esm-framework';
import { createVisitForPatient, fetchQueueEntryForPatient, getCurrentVisitForPatient } from './triage/triage.resource';

const handleShowModal = async (patientUuid: string) => {
  // fetch queue entry using patient uuid,
  const queueEntry = await fetchQueueEntryForPatient(patientUuid);
  const dispose = showModal('move-queue-entry-modal', {
    queueEntry: queueEntry,
    closeModal: () => dispose(),
  });
};

export const handleStartVisitAndLaunchTriageForm = async (patientUuid: string) => {
  const patient = await fetchCurrentPatient(patientUuid);
  let activeVisit = await getCurrentVisitForPatient(patientUuid);
  if (!activeVisit) {
    // start a new visit
    const visitResponse = await createVisitForPatient(patientUuid);
    if (visitResponse.ok) {
      const { data: visit } = visitResponse;
      activeVisit = visit;
    }
  }

  launchWorkspace('patient-form-entry-workspace', {
    patientUuid: patientUuid,
    patient: patient,
    visitContext: activeVisit,
    label: 'test',
    formInfo: {
      encounterUuid: '',
      visitUuid: activeVisit.uuid,
      formUuid: '37f6bd8d-586a-4169-95fa-5781f987fe62',
      visitTypeUuid: activeVisit.visitType.uuid,
      handlePostResponse: (encounter: any) => {
        handleShowModal(patientUuid);
      },
    },
  });
};
