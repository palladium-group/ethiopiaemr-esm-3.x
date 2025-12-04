import React from 'react';
import { Button, Dropdown, TextInput } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { OpenmrsDatePicker } from '@openmrs/esm-framework';
import { registerNewPatient } from './patient-registration.resource';
import { createVisitForPatient } from '../triage/triage.resource';
import { handleStartVisitAndLaunchTriageForm } from '../helper';

const PatientRegistration: React.FC = () => {
  const { t } = useTranslation();

  const handlePatientRegistration = async () => {
    // Add logic to register a new patient
    const registrationPayload = {};
    const patient = await registerNewPatient(registrationPayload);
    // launch triage workspace for the patient
    if (patient) {
      const response = handleStartVisitAndLaunchTriageForm(patient.data.id, '37f6bd8d-586a-4169-95fa-5781f987fe62', t); // Central Triage form UUID
    }
  };
  return (
    <div>
      <TextInput
        id="first-name"
        labelText={t('firstName', 'First Name')}
        onChange={() => {}}
        onClick={() => {}}
        placeholder={t('enterFirstName', 'Enter First Name')}
        size="md"
        type="text"
      />

      <TextInput
        id="middle-name"
        labelText={t('middleName', 'Middle Name')}
        onChange={() => {}}
        onClick={() => {}}
        placeholder={t('enterMiddleName', 'Enter Middle Name')}
        size="md"
        type="text"
      />

      <TextInput
        id="last-name"
        labelText={t('lastName', 'Last Name')}
        onChange={() => {}}
        onClick={() => {}}
        placeholder={t('enterLastName', 'Enter Last Name')}
        size="md"
        type="text"
      />

      <Dropdown
        id="default"
        invalidText="invalid selection"
        itemToString={(value) => value.text}
        items={[
          {
            text: 'Male',
          },
          {
            text: 'Female',
          },
        ]}
        label={t('gender', 'Gender')}
        titleText={t('selectGender', 'Select gender')}
        type="default"
      />

      <OpenmrsDatePicker labelText={t('selectDOB', 'Select Date of Birth')} maxDate={new Date()} />

      <Button>{t('submitRegistration', 'Submit Registration')}</Button>
    </div>
  );
};

export default PatientRegistration;
