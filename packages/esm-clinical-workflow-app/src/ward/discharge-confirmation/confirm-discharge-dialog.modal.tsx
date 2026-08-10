import React, { useCallback, useState } from 'react';
import { Button, ModalBody, ModalFooter, ModalHeader } from '@carbon/react';
import { showSnackbar, useSession } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import type { ClinicalWorkflowConfig } from '../../config-schema';
import { useEmrConfiguration } from '../bed-swap/useEmrConfiguration';
import { createNurseDischargeConfirmationEncounter } from './confirm-discharge.resource';

interface ConfirmDischargeDialogProps {
  closeModal: () => void;
  patientUuid: string;
  visitUuid: string;
  config: ClinicalWorkflowConfig;
  onConfirmed?: () => void;
}

const ConfirmDischargeDialog: React.FC<ConfirmDischargeDialogProps> = ({
  closeModal,
  patientUuid,
  visitUuid,
  config,
  onConfirmed,
}) => {
  const { t } = useTranslation();
  const session = useSession();
  const { emrConfiguration } = useEmrConfiguration();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = useCallback(async () => {
    if (isSubmitting) {
      return;
    }

    const locationUuid = session?.sessionLocation?.uuid;
    const providerUuid = session?.currentProvider?.uuid;
    const encounterRoleUuid = emrConfiguration?.clinicianEncounterRole?.uuid;

    if (
      !locationUuid ||
      !providerUuid ||
      !encounterRoleUuid ||
      !config.nurseDischargeConfirmationEncounterTypeUuid ||
      !config.nurseDischargeConfirmationConceptUuid ||
      !config.nurseDischargeConfirmationYesConceptUuid
    ) {
      showSnackbar({
        title: t('errorConfirmingDischarge', 'Error confirming discharge'),
        subtitle: t('missingDischargeConfirmationContext', 'Missing session or configuration required to confirm'),
        kind: 'error',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await createNurseDischargeConfirmationEncounter({
        patientUuid,
        visitUuid,
        locationUuid,
        providerUuid,
        encounterRoleUuid,
        encounterTypeUuid: config.nurseDischargeConfirmationEncounterTypeUuid,
        confirmationConceptUuid: config.nurseDischargeConfirmationConceptUuid,
        yesConceptUuid: config.nurseDischargeConfirmationYesConceptUuid,
      });

      if (!response.ok) {
        throw new Error(t('unexpectedServerResponse', 'Unexpected Server Response'));
      }

      showSnackbar({
        title: t('dischargeConfirmed', 'Discharge confirmed'),
        subtitle: t(
          'dischargeConfirmedSuccessfully',
          'Nurse discharge confirmation recorded. Liaison can unassign the bed after bills are settled.',
        ),
        kind: 'success',
        isLowContrast: true,
      });
      onConfirmed?.();
      closeModal();
    } catch (error) {
      showSnackbar({
        title: t('errorConfirmingDischarge', 'Error confirming discharge'),
        subtitle: error instanceof Error ? error.message : t('unknownError', 'An unknown error occurred'),
        kind: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [closeModal, config, emrConfiguration, isSubmitting, onConfirmed, patientUuid, session, t, visitUuid]);

  return (
    <>
      <ModalHeader closeModal={closeModal}>{t('confirmDischarge', 'Confirm discharge')}</ModalHeader>
      <ModalBody>
        <p>
          {t(
            'confirmDischargeQuestion',
            'Have you administered the necessary medications and completed other required discharge readiness tasks?',
          )}
        </p>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeModal} size="lg" disabled={isSubmitting}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button autoFocus kind="primary" onClick={handleConfirm} size="lg" disabled={isSubmitting}>
          {isSubmitting ? t('confirming', 'Confirming...') : t('yesConfirmDischarge', 'Yes, confirm discharge')}
        </Button>
      </ModalFooter>
    </>
  );
};

export default ConfirmDischargeDialog;
