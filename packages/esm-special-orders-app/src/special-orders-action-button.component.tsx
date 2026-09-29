import React, { type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Microscope } from '@carbon/react/icons';
import { ActionMenuButton2 } from '@openmrs/esm-framework';
import { useStartVisitIfNeeded, type PatientChartWorkspaceActionButtonProps } from '@openmrs/esm-patient-common-lib';

/** Patient-chart siderail button that opens the Special Orders workspace. */
const SpecialOrdersActionButton: React.FC<PatientChartWorkspaceActionButtonProps> = ({ groupProps }) => {
  const { t } = useTranslation();
  const startVisitIfNeeded = useStartVisitIfNeeded(groupProps?.patientUuid);

  return (
    <ActionMenuButton2
      icon={(iconProps: ComponentProps<typeof Microscope>) => <Microscope {...iconProps} />}
      label={t('specialOrders', 'Special orders')}
      workspaceToLaunch={{
        workspaceName: 'special-orders-workspace',
        windowProps: {},
      }}
      onBeforeWorkspaceLaunch={startVisitIfNeeded}
    />
  );
};

export default SpecialOrdersActionButton;
