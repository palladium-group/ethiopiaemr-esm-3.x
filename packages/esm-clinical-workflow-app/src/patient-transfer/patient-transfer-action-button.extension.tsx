import React, { type ComponentProps, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowsHorizontal } from '@carbon/react/icons';
import { ActionMenuButton2, Encounter, launchWorkspace2, showModal, useConfig } from '@openmrs/esm-framework';
import {
  useStartVisitIfNeeded,
  type PatientChartWorkspaceActionButtonProps,
  type PatientWorkspaceGroupProps,
} from '@openmrs/esm-patient-common-lib';
import type { ClinicalWorkflowConfig } from '../config-schema';

const PatientTransferActionButton: React.FC<PatientChartWorkspaceActionButtonProps> = (props) => {
  const { t } = useTranslation();
  const config = useConfig<ClinicalWorkflowConfig>();

  const groupProps = props?.groupProps;
  const patientUuid = groupProps?.patientUuid ?? '';
  const patient = groupProps?.patient;
  const visitContext = groupProps?.visitContext;
  const mutateVisitContext = groupProps?.mutateVisitContext;
  const transferFormUuid = config?.patientTransferFormUuid;

  const startVisitIfNeeded = useStartVisitIfNeeded(patientUuid);

  const handlePostResponse = useCallback(
    (encounter: Encounter) => {
      if (!visitContext) {
        return;
      }

      // Show confirmation dialog asking if physician wants to move patient to queue
      const dispose = showModal('confirm-transfer-dialog', {
        activeVisit: visitContext,
        closeModal: () => dispose(),
      });
    },
    [visitContext],
  );

  const handleLaunchWorkspace = useCallback(async () => {
    const didStartVisit = await startVisitIfNeeded();
    if (!didStartVisit) {
      return;
    }

    if (!visitContext?.uuid || !visitContext?.visitType?.uuid) {
      console.error('Invalid visit context: visit UUID or visit type UUID is missing');
      return;
    }

    if (!patient) {
      console.error('Patient data is not available');
      return;
    }

    launchWorkspace2<
      {
        form: { visitUuid: string; uuid: string; visitTypeUuid: string };
        encounterUuid: string;
        handlePostResponse?: (encounter: Encounter) => void;
      },
      {
        patient: typeof patient;
        patientUuid: string;
        visitContext: typeof visitContext;
        mutateVisitContext: typeof mutateVisitContext | null;
      },
      PatientWorkspaceGroupProps
    >(
      'patient-transfer-form-entry-workspace',
      {
        form: {
          visitUuid: visitContext.uuid,
          uuid: transferFormUuid ?? '',
          visitTypeUuid: visitContext.visitType.uuid,
        },
        encounterUuid: '',
        handlePostResponse,
      },
      {
        patient: patient!,
        patientUuid,
        visitContext,
        mutateVisitContext: mutateVisitContext || null,
      },
    );
  }, [
    patientUuid,
    patient,
    visitContext,
    mutateVisitContext,
    transferFormUuid,
    handlePostResponse,
    startVisitIfNeeded,
  ]);

  if (!groupProps?.patientUuid || !patient) {
    return null;
  }

  return (
    <ActionMenuButton2
      icon={(iconProps: ComponentProps<typeof ArrowsHorizontal>) => <ArrowsHorizontal {...iconProps} />}
      label={t('transferPatient', 'Transfer Patient')}
      workspaceToLaunch={{
        workspaceName: 'patient-form-entry-workspace' as const,
        workspaceProps: {
          form: {
            uuid: transferFormUuid ?? '',
            display: t('transferPatient', 'Transfer Patient'),
            name: 'Transfer Patient',
          },
          encounterUuid: '',
        },
      }}
      onBeforeWorkspaceLaunch={async () => {
        handleLaunchWorkspace().catch((error) => {
          console.error('Error launching transfer form workspace:', error);
        });
        return false;
      }}
    />
  );
};

export default PatientTransferActionButton;
