import { fetchCurrentPatient, launchWorkspace, showSnackbar } from '@openmrs/esm-framework';
import { createVisitForPatient } from './triage/triage.resource';

export const handleStartVisitAndLaunchTriageForm = async (patientUuid: string, formUuid: string, t) => {
  const patient = await fetchCurrentPatient(patientUuid);
  const visitResponse = await createVisitForPatient(patientUuid);
  if (visitResponse.ok) {
    // launch triage form based on switch button value
    const { data: visit } = visitResponse;
    launchWorkspace('patient-form-entry-workspace', {
      patientUuid: patientUuid,
      patient: patient,
      visitContext: visit,
      formInfo: {
        encounterUuid: '',
        visitUuid: visit.uuid,
        formUuid: formUuid, // Triage form UUID
        visitTypeUuid: visit.visitType.uuid,
      },
    });
  } else {
    showSnackbar({
      title: t('triageDashboardErrorStartingVisit', 'Error starting visit for patient'),
      kind: 'error',
      subtitle: t('triageDashboardPleaseTryAgain', 'Please try again.'),
      isLowContrast: true,
    });
  }
};
