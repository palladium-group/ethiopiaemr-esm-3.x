import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { OverflowMenuItem } from '@carbon/react';
import { showSnackbar, useConfig, userHasAccess, useSession, useVisit } from '@openmrs/esm-framework';
import { useLaunchWorkspaceRequiringVisit, usePatientChartStore } from '@openmrs/esm-patient-common-lib';
import type { ClinicalWorkflowConfig } from '../config-schema';
import {
  collectVisitPrimaryConceptUuids,
  useActiveVisitWithEncounters,
} from '../patient-notes/visit-main-diagnosis.resource';
import { Permissions } from '../permission/permissions.constants';
import styles from './action-button.scss';

interface AdmitPatientOverflowMenuItemProps {
  patient: fhir.Patient;
  closeMenu?: () => void;
}

/**
 * Patient summary overflow action that opens the admission request form directly.
 */
const AdmitPatientOverflowMenuItem: React.FC<AdmitPatientOverflowMenuItemProps> = ({ patient, closeMenu }) => {
  const { t } = useTranslation();
  const { admissionRequestFormUuid, admissionRequestFormName } = useConfig<ClinicalWorkflowConfig>();
  const session = useSession();
  const patientUuid = patient?.id ?? '';
  const isDeceased = Boolean(patient?.deceasedDateTime);
  const { visitContext, patient: chartPatient } = usePatientChartStore(patientUuid);
  const { activeVisit, isValidating: isLoadingActiveVisit } = useVisit(patientUuid || null);
  const { visitWithEncounters, isLoading: isLoadingVisitDiagnoses } = useActiveVisitWithEncounters(
    patientUuid,
    activeVisit?.uuid,
  );

  const hasPrimaryDiagnosis = useMemo(
    () => collectVisitPrimaryConceptUuids(visitWithEncounters).length > 0,
    [visitWithEncounters],
  );
  const isCheckingPrimaryDiagnosis = Boolean(activeVisit?.uuid) && (isLoadingActiveVisit || isLoadingVisitDiagnoses);
  const isAdmitDisabled = isCheckingPrimaryDiagnosis || !hasPrimaryDiagnosis;
  const primaryDiagnosisRequiredMessage = t(
    'admitPatientRequiresPrimaryDiagnosis',
    'A primary diagnosis must be set on the current visit before admitting a patient',
  );

  const launchAdmissionRequestForm = useLaunchWorkspaceRequiringVisit(patientUuid, 'patient-form-entry-workspace');

  const handleClick = useCallback(() => {
    if (!hasPrimaryDiagnosis) {
      return;
    }

    if (!admissionRequestFormUuid) {
      showSnackbar({
        title: t('errorLaunchingAdmissionForm', 'Error launching admission form'),
        kind: 'error',
        isLowContrast: false,
        subtitle: t('admissionFormNotConfigured', 'Admission request form is not configured'),
      });
      return;
    }

    const workspaceProps = {
      workspaceTitle: admissionRequestFormName || t('admitPatient', 'Admit Patient'),
      form: { uuid: admissionRequestFormUuid },
      encounterUuid: '',
    };

    const groupProps = {
      patient: chartPatient,
      patientUuid,
      visitContext,
    };

    launchAdmissionRequestForm(workspaceProps, {}, groupProps);
    closeMenu?.();
  }, [
    admissionRequestFormName,
    admissionRequestFormUuid,
    chartPatient,
    closeMenu,
    hasPrimaryDiagnosis,
    launchAdmissionRequestForm,
    patientUuid,
    t,
    visitContext,
  ]);

  const canAdmitPatient = userHasAccess(Permissions.ViewWardDashboard, session?.user);

  if (!patientUuid || isDeceased || !canAdmitPatient) {
    return null;
  }

  const menuItem = (
    <OverflowMenuItem
      className={styles.menuitem}
      closeMenu={isAdmitDisabled ? undefined : closeMenu}
      disabled={isAdmitDisabled}
      itemText={t('admitPatient', 'Admit Patient')}
      onClick={handleClick}
    />
  );

  if (isAdmitDisabled && !isCheckingPrimaryDiagnosis) {
    return (
      <span className={styles.menuitemTooltipWrapper} title={primaryDiagnosisRequiredMessage}>
        {menuItem}
      </span>
    );
  }

  return menuItem;
};

export default AdmitPatientOverflowMenuItem;
