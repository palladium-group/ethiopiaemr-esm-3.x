import React, { type ComponentProps, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ActionMenuButton2, ArrowRightIcon, useConfig } from '@openmrs/esm-framework';
import { useStartVisitIfNeeded, type PatientChartWorkspaceActionButtonProps } from '@openmrs/esm-patient-common-lib';
import type { ClinicalWorkflowConfig } from '../config-schema';

const PatientTransferActionButton: React.FC<PatientChartWorkspaceActionButtonProps> = ({
  groupProps: { patientUuid },
}) => {
  const { t } = useTranslation();
  const config = useConfig<ClinicalWorkflowConfig>();
  const transferFormUuid = config?.transferPatientFormUuid;
  const startVisitIfNeeded = useStartVisitIfNeeded(patientUuid);

  const workspaceToLaunch = useMemo(
    () => ({
      workspaceName: 'patient-form-entry-workspace' as const,
      workspaceProps: {
        workspaceTitle: t('transferPatient', 'Transfer Patient'),
        form: {
          uuid: transferFormUuid,
          display: t('transferPatient', 'Transfer Patient'),
          name: 'Transfer Patient',
        },
        encounterUuid: '', // Empty for new form entry
        mutateForm: () => {
          // Optional: Invalidate any cached data after form submission
          // The form engine will handle visit/encounter data invalidation automatically
        },
      },
    }),
    [transferFormUuid, t],
  );

  return (
    <ActionMenuButton2
      icon={(iconProps: ComponentProps<typeof ArrowRightIcon>) => <ArrowRightIcon {...iconProps} />}
      label={t('transferPatient', 'Transfer Patient')}
      workspaceToLaunch={workspaceToLaunch}
      onBeforeWorkspaceLaunch={startVisitIfNeeded}
    />
  );
};

export default PatientTransferActionButton;
