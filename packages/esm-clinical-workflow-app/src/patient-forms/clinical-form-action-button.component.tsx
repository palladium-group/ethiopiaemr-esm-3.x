import React, { type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { ActionMenuButton2, DocumentIcon, userHasAccess, useSession } from '@openmrs/esm-framework';
import { type PatientChartWorkspaceActionButtonProps, useStartVisitIfNeeded } from '@openmrs/esm-patient-common-lib';
import { Permissions } from '../permission/permissions.constants';

/**
 * This button uses the patient chart store and MUST only be used
 * within the patient chart
 */
const ClinicalFormActionButton: React.FC<PatientChartWorkspaceActionButtonProps> = ({
  groupProps: { patientUuid },
}) => {
  const { t } = useTranslation();

  const session = useSession();

  const startVisitIfNeeded = useStartVisitIfNeeded(patientUuid);

  // Check if user has permission to view clinical forms
  const canViewClinicalForms = userHasAccess(Permissions.ViewClinicalForms, session?.user);

  if (!canViewClinicalForms) {
    return null;
  }

  return (
    <ActionMenuButton2
      icon={(props: ComponentProps<typeof DocumentIcon>) => <DocumentIcon {...props} />}
      label={t('clinicalForms', 'Clinical forms')}
      workspaceToLaunch={{
        workspaceName: 'clinical-forms-workspace',
        workspaceProps: {},
      }}
      onBeforeWorkspaceLaunch={startVisitIfNeeded}
    />
  );
};

export default ClinicalFormActionButton;
