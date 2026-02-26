import React, { type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { ActionMenuButton2, PenIcon, userHasAccess, useSession } from '@openmrs/esm-framework';
import { useStartVisitIfNeeded, type PatientChartWorkspaceActionButtonProps } from '@openmrs/esm-patient-common-lib';
import { Permissions } from '../permission/permissions.constants';

/**
 * This button uses the patient chart store and MUST only be used
 * within the patient chart
 */
const VisitNoteActionButton: React.FC<PatientChartWorkspaceActionButtonProps> = ({ groupProps: { patientUuid } }) => {
  const { t } = useTranslation();
  const session = useSession();

  const startVisitIfNeeded = useStartVisitIfNeeded(patientUuid);

  // Check if user has permission to add visit notes
  const canAddVisitNote = userHasAccess(Permissions.AddVisitNote, session?.user);

  if (!canAddVisitNote) {
    return null;
  }

  return (
    <ActionMenuButton2
      icon={(props: ComponentProps<typeof PenIcon>) => <PenIcon {...props} />}
      label={t('visitNote', 'Visit note')}
      workspaceToLaunch={{
        workspaceName: 'visit-notes-form-shadow-workspace',
        workspaceProps: {},
      }}
      onBeforeWorkspaceLaunch={startVisitIfNeeded}
    />
  );
};

export default VisitNoteActionButton;
