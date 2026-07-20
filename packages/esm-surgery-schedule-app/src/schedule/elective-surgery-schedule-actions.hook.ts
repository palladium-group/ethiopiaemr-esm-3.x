import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  fetchCurrentPatient,
  launchWorkspace2,
  openmrsFetch,
  restBaseUrl,
  showSnackbar,
  useConfig,
  type Visit,
} from '@openmrs/esm-framework';
import { useSWRConfig } from 'swr';
import {
  getApiErrorMessage,
  markReadyToAdmit,
  revalidateElectiveSurgerySchedule,
} from '../api/elective-surgery-schedule.resource';
import type { SurgeryScheduleConfig } from '../config-schema';
import {
  ADMISSION_REQUEST_FORM_NAME,
  ADMISSION_REQUEST_FORM_WORKSPACE,
  RECORD_CONTACT_WORKSPACE,
  REMOVE_PATIENT_WORKSPACE,
  RETURN_FROM_ADMISSION_WORKSPACE,
} from '../constants';
import { useElectiveSurgeryPrivileges } from '../hooks/useElectiveSurgeryPrivileges';
import type { ElectiveSurgeryScheduleItem } from '../types/elective-surgery-schedule.types';
import { buildAdmissionRequestWorkspaceData } from '../workspaces/admission-request.workspace';

async function getActiveVisitForPatient(patientUuid: string): Promise<Visit | null> {
  const url = `${restBaseUrl}/visit?v=full&patient=${patientUuid}&includeInactive=false`;
  const response = await openmrsFetch<{ results: Array<Visit> }>(url);
  return response?.data?.results?.find((visit) => visit.stopDatetime === null) ?? null;
}

export function useElectiveSurgeryScheduleActions(onActionComplete: () => void) {
  const { t } = useTranslation();
  const config = useConfig<SurgeryScheduleConfig>();
  const { mutate: globalMutate } = useSWRConfig();
  const { canManageSchedule, canRecordContact, canRemovePatient } = useElectiveSurgeryPrivileges();

  const handleMutationComplete = useCallback(async () => {
    await revalidateElectiveSurgerySchedule(globalMutate);
    onActionComplete();
  }, [globalMutate, onActionComplete]);

  const viewAdmissionRequest = useCallback(
    async (item: ElectiveSurgeryScheduleItem) => {
      if (!item.admissionRequestEncounterUuid) {
        showSnackbar({
          title: t('error', 'Error'),
          kind: 'error',
          subtitle: t(
            'noAdmissionRequestEncounter',
            'No admission request encounter is linked to this schedule entry.',
          ),
          isLowContrast: true,
        });
        return;
      }

      try {
        const [patient, visit] = await Promise.all([
          fetchCurrentPatient(item.patient.uuid),
          getActiveVisitForPatient(item.patient.uuid),
        ]);

        if (!visit) {
          showSnackbar({
            title: t('error', 'Error'),
            kind: 'error',
            subtitle: t('activeVisitRequired', 'An active visit is required to open the admission request form.'),
            isLowContrast: true,
          });
          return;
        }

        const workspaceData = buildAdmissionRequestWorkspaceData(
          patient,
          visit,
          config.admissionRequestFormUuid,
          ADMISSION_REQUEST_FORM_NAME,
          item.admissionRequestEncounterUuid,
        );

        await launchWorkspace2(ADMISSION_REQUEST_FORM_WORKSPACE, workspaceData, {
          patient,
          patientUuid: item.patient.uuid,
          visitContext: visit,
          mutateVisitContext: null,
        });
      } catch (error) {
        showSnackbar({
          title: t('error', 'Error'),
          kind: 'error',
          subtitle: getApiErrorMessage(error, t('admissionRequestOpenError', 'Unable to open admission request.')),
          isLowContrast: true,
        });
      }
    },
    [config.admissionRequestFormUuid, t],
  );

  const recordContactOutcome = useCallback(
    (item: ElectiveSurgeryScheduleItem) => {
      launchWorkspace2(RECORD_CONTACT_WORKSPACE, {
        scheduleItem: item,
        onSaved: handleMutationComplete,
      });
    },
    [handleMutationComplete],
  );

  const markReady = useCallback(
    async (item: ElectiveSurgeryScheduleItem) => {
      const confirmed = window.confirm(
        t(
          'markReadyToAdmitConfirm',
          'Confirm that the second anesthesia evaluation is not needed and this patient is ready to admit?',
        ),
      );

      if (!confirmed) {
        return;
      }

      try {
        await markReadyToAdmit(item.uuid);
        showSnackbar({
          title: t('success', 'Success'),
          kind: 'success',
          subtitle: t('markReadyToAdmitSuccess', 'Patient marked as ready to admit.'),
          isLowContrast: true,
        });
        await handleMutationComplete();
      } catch (error) {
        showSnackbar({
          title: t('error', 'Error'),
          kind: 'error',
          subtitle: getApiErrorMessage(error, t('markReadyToAdmitError', 'Unable to mark patient as ready to admit.')),
          isLowContrast: true,
        });
      }
    },
    [handleMutationComplete, t],
  );

  const returnFromAdmission = useCallback(
    (item: ElectiveSurgeryScheduleItem) => {
      launchWorkspace2(RETURN_FROM_ADMISSION_WORKSPACE, {
        scheduleItem: item,
        onSaved: handleMutationComplete,
      });
    },
    [handleMutationComplete],
  );

  const removePatient = useCallback(
    (item: ElectiveSurgeryScheduleItem) => {
      launchWorkspace2(REMOVE_PATIENT_WORKSPACE, {
        scheduleItem: item,
        onSaved: handleMutationComplete,
      });
    },
    [handleMutationComplete],
  );

  return {
    canManageSchedule,
    canRecordContact,
    canRemovePatient,
    viewAdmissionRequest,
    recordContactOutcome,
    markReady,
    returnFromAdmission,
    removePatient,
  };
}
