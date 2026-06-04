import React, { type ComponentProps, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@carbon/react';
import { userHasAccess, useConfig, useSession } from '@openmrs/esm-framework';
import { usePatientChartStore, useLaunchWorkspaceRequiringVisit } from '@openmrs/esm-patient-common-lib';
import { type ImmunizationRegisterConfig } from '../config-schema';
import { Permissions } from '../permission/permissions.constants';

interface ImmunizationRegisterActionButtonProps {
  patientUuid: string;
}

const ImmunizationRegisterActionButton: React.FC<ImmunizationRegisterActionButtonProps> = ({ patientUuid }) => {
  const { t } = useTranslation();
  const { formName, formUuid } = useConfig<ImmunizationRegisterConfig>();

  const { visitContext, patient } = usePatientChartStore(patientUuid);

  const launchImmunizationRegistrationForm = useLaunchWorkspaceRequiringVisit(
    patientUuid,
    'patient-form-entry-workspace',
  );

  const launchImmunizationRegistrationFormNoParams = useCallback(() => {
    const workspaceProps = {
      workspaceTitle: formName,
      form: { uuid: formUuid },
      encounterUuid: '',
    };

    const groupProps = {
      patient,
      patientUuid,
      visitContext,
    };

    launchImmunizationRegistrationForm(workspaceProps, {}, groupProps);
  }, [formName, formUuid, launchImmunizationRegistrationForm, visitContext, patient, patientUuid]);

  const session = useSession();

  // Check if user has permission to view clinical forms
  const canViewClinicalForms = userHasAccess(Permissions.ViewClinicalForms, session?.user);

  if (!canViewClinicalForms) {
    return null;
  }

  return (
    <Button
      data-testid="add-immunizations-button"
      iconDescription={t('recordImmunizationRegisterForm', 'Record Associated Services')}
      kind="primary"
      onClick={launchImmunizationRegistrationFormNoParams}>
      {t('recordImmunizationRegisterForm', 'Record Associated Services')}
    </Button>
  );
};

export default ImmunizationRegisterActionButton;
