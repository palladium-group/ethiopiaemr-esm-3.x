import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { OverflowMenuItem } from '@carbon/react';
import { showSnackbar, useConfig, userHasAccess, useSession, useVisit } from '@openmrs/esm-framework';
import { useLaunchWorkspaceRequiringVisit, usePatientChartStore } from '@openmrs/esm-patient-common-lib';
import type { ClinicalWorkflowConfig } from '../config-schema';
import { useActiveVisitWithEncounters, visitHasMainDiagnosis } from '../patient-notes/visit-main-diagnosis.resource';
import { Permissions } from '../permission/permissions.constants';
import styles from './action-button.scss';

interface AdmissionDischargeOverflowMenuItemProps {
  patient: fhir.Patient;
  closeMenu?: () => void;
}

/**
 * Patient chart overflow action that opens the Admission Discharge form.
 * Enabled only when the patient has an active inpatient visit with a main diagnosis.
 */
const AdmissionDischargeOverflowMenuItem: React.FC<AdmissionDischargeOverflowMenuItemProps> = ({
  patient,
  closeMenu,
}) => {
  const { t } = useTranslation();
  const { inPatientVisitTypeUuid, inpatientDischargeFormUuid, inpatientDischargeFormName, visitNoteConfig } =
    useConfig<ClinicalWorkflowConfig>();
  const session = useSession();
  const patientUuid = patient?.id ?? '';
  const isDeceased = Boolean(patient?.deceasedDateTime);
  const { visitContext, patient: chartPatient } = usePatientChartStore(patientUuid);
  const { activeVisit, isLoading: isLoadingActiveVisit } = useVisit(patientUuid || null);
  const { visitWithEncounters, isLoading: isLoadingVisitDiagnoses } = useActiveVisitWithEncounters(
    patientUuid,
    activeVisit?.uuid,
  );

  const isInpatientVisit = Boolean(
    activeVisit?.visitType?.uuid && activeVisit.visitType.uuid === inPatientVisitTypeUuid,
  );
  const hasMainDiagnosis = useMemo(
    () => visitHasMainDiagnosis(visitWithEncounters, visitNoteConfig?.mainDiagnosisAttributeTypeUuid ?? ''),
    [visitNoteConfig?.mainDiagnosisAttributeTypeUuid, visitWithEncounters],
  );
  const isCheckingDischarge = isLoadingActiveVisit || (isInpatientVisit && isLoadingVisitDiagnoses);
  const isDischargeDisabled = isCheckingDischarge || !isInpatientVisit || !hasMainDiagnosis;
  const inpatientVisitRequiredMessage = t(
    'admissionDischargeRequiresInpatientVisit',
    'An active inpatient visit is required before discharging a patient',
  );
  const mainDiagnosisRequiredMessage = t(
    'dischargeRequiresMainDiagnosis',
    'A main diagnosis must be set on the current visit before discharging a patient',
  );
  const dischargeDisabledMessage = !isInpatientVisit ? inpatientVisitRequiredMessage : mainDiagnosisRequiredMessage;

  const launchAdmissionDischargeForm = useLaunchWorkspaceRequiringVisit(patientUuid, 'patient-form-entry-workspace');

  const handleClick = useCallback(() => {
    if (!isInpatientVisit || !hasMainDiagnosis) {
      return;
    }

    if (!inpatientDischargeFormUuid) {
      showSnackbar({
        title: t('errorLaunchingAdmissionDischargeForm', 'Error launching Admission Discharge form'),
        kind: 'error',
        isLowContrast: false,
        subtitle: t('admissionDischargeFormNotConfigured', 'Admission Discharge form is not configured'),
      });
      return;
    }

    const workspaceProps = {
      workspaceTitle: inpatientDischargeFormName || t('dischargePatient', 'Discharge Patient'),
      form: { uuid: inpatientDischargeFormUuid },
      encounterUuid: '',
    };

    const groupProps = {
      patient: chartPatient,
      patientUuid,
      visitContext,
    };

    launchAdmissionDischargeForm(workspaceProps, {}, groupProps);
    closeMenu?.();
  }, [
    chartPatient,
    closeMenu,
    hasMainDiagnosis,
    inpatientDischargeFormName,
    inpatientDischargeFormUuid,
    isInpatientVisit,
    launchAdmissionDischargeForm,
    patientUuid,
    t,
    visitContext,
  ]);

  const canDischargePatient = userHasAccess(Permissions.ViewClinicalForms, session?.user);

  if (!patientUuid || isDeceased || !canDischargePatient) {
    return null;
  }

  const menuItem = (
    <OverflowMenuItem
      className={styles.menuitem}
      closeMenu={isDischargeDisabled ? undefined : closeMenu}
      disabled={isDischargeDisabled}
      itemText={t('dischargePatient', 'Discharge Patient')}
      onClick={handleClick}
    />
  );

  if (isDischargeDisabled && !isCheckingDischarge) {
    return (
      <span className={styles.menuitemTooltipWrapper} title={dischargeDisabledMessage}>
        {menuItem}
      </span>
    );
  }

  return menuItem;
};

export default AdmissionDischargeOverflowMenuItem;
