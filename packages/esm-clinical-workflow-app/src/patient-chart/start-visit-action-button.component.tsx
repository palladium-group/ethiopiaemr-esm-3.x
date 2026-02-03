import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { OverflowMenuItem } from '@carbon/react';
import { launchWorkspace2, useVisit } from '@openmrs/esm-framework';
import styles from './action-button.scss';
import { type PatientWorkspaceGroupProps } from '@openmrs/esm-patient-common-lib';

interface VisitFormProps {
  /**
   * A unique string identifying where the visit form is opened from.
   * This string is passed into various extensions within the form to
   * affect how / if they should be rendered.
   */
  openedFrom: string;
  showPatientHeader?: boolean;
}

interface StartVisitOverflowMenuItemProps {
  patient: fhir.Patient;
}

/**
 * This button shows up in the patient banner action menu, but only when the patient has no active visit.
 * On click, it opens the start visit workspace form to start a new visit.
 */
const StartVisitOverflowMenuItem: React.FC<StartVisitOverflowMenuItemProps> = ({ patient }) => {
  const { t } = useTranslation();
  const isDeceased = Boolean(patient?.deceasedDateTime);
  const patientUuid = patient?.id;
  const { activeVisit } = useVisit(patientUuid ?? null);

  const handleLaunchModal = useCallback(
    () =>
      launchWorkspace2<VisitFormProps, {}, PatientWorkspaceGroupProps>(
        'start-visit-workspace-form',
        { openedFrom: 'patient-chart-start-visit' },
        {},
        { patient, patientUuid: patient.id, visitContext: null, mutateVisitContext: null },
      ),
    [patient],
  );

  // Only show start visit button if patient is not deceased and has no active visit
  if (!patientUuid || isDeceased || activeVisit) {
    return null;
  }

  return (
    <OverflowMenuItem className={styles.menuitem} itemText={t('addVisit', 'Add visit')} onClick={handleLaunchModal} />
  );
};

export default StartVisitOverflowMenuItem;
