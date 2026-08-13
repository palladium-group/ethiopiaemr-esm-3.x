import React, { useCallback, useMemo } from 'react';
import { OverflowMenuItem, InlineLoading } from '@carbon/react';
import { showModal, useConfig, useVisit } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import type { ClinicalWorkflowConfig } from '../config-schema';
import styles from './action-button.scss';
import {
  useVisitWithEncounters,
  visitHasEncounterType,
} from '../ward/discharge-confirmation/confirm-discharge.resource';

interface ConfirmDischargeOverflowMenuItemProps {
  patient: fhir.Patient;
  closeMenu?: () => void;
}

const ConfirmDischargeOverflowMenuItem: React.FC<ConfirmDischargeOverflowMenuItemProps> = ({ patient, closeMenu }) => {
  const { t } = useTranslation();
  const config = useConfig<ClinicalWorkflowConfig>();
  const patientUuid = patient?.id ?? '';
  const isDeceased = Boolean(patient?.deceasedDateTime);
  const { activeVisit, isLoading: isLoadingActiveVisit, mutate: mutateActiveVisit } = useVisit(patientUuid || null);
  const {
    visit: visitWithEncounters,
    isLoading: isLoadingVisitEncounters,
    mutate: mutateVisitEncounters,
  } = useVisitWithEncounters(activeVisit?.uuid);

  const visit = visitWithEncounters ?? activeVisit;
  const hasIpdDischarge = useMemo(
    () => visitHasEncounterType(visit, config.ipdDischargeEncounterTypeUuid),
    [config.ipdDischargeEncounterTypeUuid, visit],
  );
  const hasNurseConfirmation = useMemo(
    () => visitHasEncounterType(visit, config.nurseDischargeConfirmationEncounterTypeUuid),
    [config.nurseDischargeConfirmationEncounterTypeUuid, visit],
  );

  const isLoading = isLoadingActiveVisit || isLoadingVisitEncounters;

  const handleClick = useCallback(() => {
    if (!activeVisit?.uuid) {
      return;
    }

    const dispose = showModal('confirm-discharge-dialog', {
      patientUuid,
      visitUuid: activeVisit.uuid,
      config,
      onConfirmed: async () => {
        await Promise.all([mutateActiveVisit(), mutateVisitEncounters()]);
      },
      closeModal: () => dispose(),
    });
    closeMenu?.();
  }, [activeVisit?.uuid, closeMenu, config, mutateActiveVisit, mutateVisitEncounters, patientUuid]);

  if (!patientUuid || isDeceased) {
    return null;
  }

  if (isLoading) {
    return <InlineLoading description={t('loading', 'Loading...')} />;
  }

  if (!activeVisit || !hasIpdDischarge || hasNurseConfirmation) {
    return null;
  }

  return (
    <OverflowMenuItem
      className={styles.menuitem}
      closeMenu={closeMenu}
      itemText={t('confirmDischarge', 'Confirm discharge')}
      onClick={handleClick}
    />
  );
};

export default ConfirmDischargeOverflowMenuItem;
