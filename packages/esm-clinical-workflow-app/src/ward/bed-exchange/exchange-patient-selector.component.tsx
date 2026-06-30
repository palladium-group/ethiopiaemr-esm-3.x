import { Dropdown, RadioButton, RadioButtonGroup, RadioButtonSkeleton } from '@carbon/react';
import React, { useMemo } from 'react';
import { type FieldError } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { getOpenmrsId } from '../admitted-patients/admitted-patients.utils';
import type { WardPatient } from '../admitted-patients/ward.types';
import styles from './bed-exchange-form.scss';

interface ExchangePatientSelectorProps {
  candidates: WardPatient[];
  isLoading: boolean;
  selectedPatientUuid?: string;
  error?: FieldError;
  onChange(patientUuid: string): void;
}

interface ExchangePatientOption {
  patientUuid: string;
  label: string;
}

const ExchangePatientSelector: React.FC<ExchangePatientSelectorProps> = ({
  candidates,
  isLoading,
  selectedPatientUuid,
  error,
  onChange,
}) => {
  const { t } = useTranslation();

  const options: ExchangePatientOption[] = useMemo(
    () =>
      candidates.map((candidate) => {
        const patientName = candidate.patient.person?.display ?? '';
        const openmrsId = getOpenmrsId(candidate.patient.identifiers ?? []) ?? '--';
        return {
          patientUuid: candidate.patient.uuid,
          label: t('exchangePatientOptionLabel', 'Bed {{bedNumber}} · {{patientName}} · {{idNumber}}', {
            bedNumber: candidate.bed.bedNumber,
            patientName,
            idNumber: openmrsId,
          }),
        };
      }),
    [candidates, t],
  );

  const selectedItem = options.find((option) => option.patientUuid === selectedPatientUuid);
  const useDropdown = options.length >= 12;

  if (isLoading) {
    return (
      <RadioButtonGroup className={styles.radioButtonGroup} name="exchangePatientUuid">
        <RadioButtonSkeleton />
        <RadioButtonSkeleton />
        <RadioButtonSkeleton />
      </RadioButtonGroup>
    );
  }

  if (useDropdown) {
    return (
      <Dropdown
        id="exchange-patient-selector"
        titleText={t('selectPatientToExchangeWith', 'Select patient to exchange with')}
        label={!selectedItem ? t('chooseAnOption', 'Choose an option') : selectedItem.label}
        items={options}
        itemToString={(item: ExchangePatientOption) => item?.label ?? ''}
        selectedItem={selectedItem}
        onChange={({ selectedItem }) => {
          if (selectedItem?.patientUuid) {
            onChange(selectedItem.patientUuid);
          }
        }}
        invalid={!!error}
        invalidText={error?.message}
      />
    );
  }

  return (
    <RadioButtonGroup
      name="exchangePatientUuid"
      className={styles.radioButtonGroup}
      valueSelected={selectedPatientUuid}
      onChange={(selection) => onChange(String(selection))}
      legendText={t('selectPatientToExchangeWith', 'Select patient to exchange with')}
      invalid={!!error}
      invalidText={error?.message}>
      {options.map(({ patientUuid, label }) => (
        <RadioButton key={patientUuid} labelText={label} value={patientUuid} />
      ))}
    </RadioButtonGroup>
  );
};

export default ExchangePatientSelector;
