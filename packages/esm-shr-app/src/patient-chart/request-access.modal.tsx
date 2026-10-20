import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Checkbox,
  CheckboxGroup,
  InlineNotification,
  ModalBody,
  ModalFooter,
  ModalHeader,
  NumberInput,
} from '@carbon/react';
import { showSnackbar } from '@openmrs/esm-framework';
import { MAX_ACCESS_DAYS, readRefusal, REQUESTABLE_TYPES, requestAccess } from './shr-chart.resource';
import { recordTypeLabel } from './shr-dashboard.component';

interface RequestAccessModalProps {
  closeModal: () => void;
  patientUuid: string;
  onRequested?: () => void;
}

const DEFAULT_ACCESS_DAYS = 30;

/** Asks the patient, through the SHR, to share these record types with this facility. */
const RequestAccessModal: React.FC<RequestAccessModalProps> = ({ closeModal, patientUuid, onRequested }) => {
  const { t } = useTranslation();
  const [types, setTypes] = useState<Array<string>>(['Condition', 'AllergyIntolerance', 'MedicationRequest']);
  const [days, setDays] = useState<number>(DEFAULT_ACCESS_DAYS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const validDays = Number.isInteger(days) && days >= 1 && days <= MAX_ACCESS_DAYS;
  const canSubmit = types.length > 0 && validDays && !isSubmitting;

  const toggle = (type: string, checked: boolean) =>
    setTypes((current) => (checked ? [...current, type] : current.filter((value) => value !== type)));

  const submit = async () => {
    setIsSubmitting(true);
    setFailure(null);
    try {
      await requestAccess(patientUuid, types, days);
      showSnackbar({
        kind: 'success',
        title: t('requestSent', 'Request sent'),
        subtitle: t('requestSentDetail', 'The patient answers from their own portal.'),
      });
      onRequested?.();
      closeModal();
    } catch (error) {
      const refusal = readRefusal(error);
      if (refusal.code === 'request-pending') {
        showSnackbar({ kind: 'info', title: t('alreadyWaiting', 'A request is already waiting for the patient') });
        onRequested?.();
        closeModal();
        return;
      }
      setFailure(
        refusal.code === 'no-active-visit'
          ? t('visitNeededDetail', "Start a visit to view this patient's Shared Health Record.")
          : // On a request, the SHR answers consent-required only while a recent refusal stands.
          refusal.code === 'consent-required'
          ? t('coolingOff', 'The patient declined a recent request from this facility. Try again later.')
          : t('requestFailed', "The request couldn't be sent ({{code}}).", { code: refusal.code }),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <ModalHeader closeModal={closeModal} title={t('requestAccess', 'Request access')} />
      <ModalBody>
        <p>
          {t(
            'requestAccessIntro',
            'The patient is asked, through the Shared Health Record, to share these records with this facility.',
          )}
        </p>
        <CheckboxGroup legendText={t('recordsToRequest', 'Records to request')}>
          {REQUESTABLE_TYPES.map((type) => (
            <Checkbox
              key={type}
              id={`shr-request-${type}`}
              labelText={recordTypeLabel(type, t)}
              checked={types.includes(type)}
              onChange={(_, { checked }) => toggle(type, checked)}
            />
          ))}
        </CheckboxGroup>
        <NumberInput
          id="shr-request-days"
          label={t('accessDays', 'For how many days')}
          helperText={t('accessDaysHelper', '1 to {{max}} days', { max: MAX_ACCESS_DAYS })}
          min={1}
          max={MAX_ACCESS_DAYS}
          value={days}
          invalid={!validDays}
          invalidText={t('accessDaysInvalid', 'Enter a whole number of days from 1 to {{max}}', {
            max: MAX_ACCESS_DAYS,
          })}
          onChange={(_, { value }) => setDays(Number(value))}
        />
        {failure && <InlineNotification kind="error" lowContrast hideCloseButton title={failure} />}
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeModal}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button kind="primary" onClick={submit} disabled={!canSubmit}>
          {isSubmitting ? t('sending', 'Sending…') : t('sendRequest', 'Send request')}
        </Button>
      </ModalFooter>
    </>
  );
};

export default RequestAccessModal;
