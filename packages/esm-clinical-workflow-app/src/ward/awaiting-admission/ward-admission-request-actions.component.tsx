import { OverflowMenu, OverflowMenuItem } from '@carbon/react';
import { launchWorkspace2 } from '@openmrs/esm-framework';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { InpatientRequest, WardPatient } from '../admitted-patients/ward.types';

interface WardAdmissionRequestActionsProps {
  request: InpatientRequest;
}

function toWardPatient(request: InpatientRequest): WardPatient {
  return {
    patient: request.patient,
    visit: request.visit,
    bed: null,
    inpatientRequest: request,
    inpatientAdmission: null,
  };
}

const WardAdmissionRequestActions: React.FC<WardAdmissionRequestActionsProps> = ({ request }) => {
  const { t } = useTranslation();
  const wardPatient = toWardPatient(request);
  const isTransfer = request.dispositionType === 'TRANSFER';

  const launchPatientTransferForm = useCallback(() => {
    launchWorkspace2('patient-admit-or-transfer-request-form', { wardPatient });
  }, [wardPatient]);

  const launchCancelAdmissionForm = useCallback(() => {
    launchWorkspace2('cancel-admission-request-workspace', { wardPatient });
  }, [wardPatient]);

  const launchAdmitPatient = useCallback(() => {
    launchWorkspace2('admit-patient-form-workspace', { wardPatient });
  }, [wardPatient]);

  return (
    <OverflowMenu size="sm" flipped>
      <OverflowMenuItem
        itemText={isTransfer ? t('transferElsewhere', 'Transfer elsewhere') : t('admitElsewhere', 'Admit elsewhere')}
        onClick={launchPatientTransferForm}
      />
      <OverflowMenuItem itemText={t('admitPatient', 'Admit patient')} onClick={launchAdmitPatient} />
      <OverflowMenuItem itemText={t('cancel', 'Cancel')} onClick={launchCancelAdmissionForm} />
    </OverflowMenu>
  );
};

export default WardAdmissionRequestActions;
