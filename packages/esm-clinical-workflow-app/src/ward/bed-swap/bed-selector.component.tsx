import { Dropdown, InlineNotification, RadioButton, RadioButtonGroup, RadioButtonSkeleton } from '@carbon/react';
import { type Patient } from '@openmrs/esm-framework';
import React, { useMemo } from 'react';
import { type FieldError } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { BedLayout } from '../admitted-patients/ward.types';
import { useWardLocation } from './useWardLocation';
import styles from './bed-swap-form.scss';

interface BedSelectorProps {
  beds: BedLayout[];
  isLoadingBeds: boolean;
  currentPatient: Patient;
  selectedBedId?: number;
  error?: FieldError;
  onChange(bedId: number): void;
  minBedCountToUseDropdown?: number;
}

interface BedDropdownItem {
  bedId: number;
  label: string;
  disabled: boolean;
}

const BedSelector: React.FC<BedSelectorProps> = ({
  selectedBedId,
  beds,
  isLoadingBeds,
  error,
  onChange,
  currentPatient,
  minBedCountToUseDropdown = 16,
}) => {
  const { location } = useWardLocation();
  const { t } = useTranslation();

  const bedDropdownItems: BedDropdownItem[] = useMemo(() => {
    return beds
      .filter((bed) => bed.bedId)
      .map((bed) => {
        const isPatientAssignedToBed = bed.patients.some((bedPatient) => bedPatient.uuid === currentPatient.uuid);
        const occupants =
          bed.patients.length === 0
            ? [t('emptyText', 'Empty')]
            : bed.patients.map((patient) => patient?.person?.display ?? patient?.person?.preferredName?.display);
        const label = [bed.bedNumber, bed?.bedType?.displayName ?? 'Type unconfigured', ...occupants].join(' · ');
        return {
          bedId: bed.bedId,
          label,
          disabled: isPatientAssignedToBed,
        };
      });
  }, [beds, currentPatient.uuid, t]);

  const selectedItem = bedDropdownItems.find((bed) => bed.bedId === selectedBedId);
  const useDropdown = bedDropdownItems.length >= minBedCountToUseDropdown;

  if (isLoadingBeds) {
    return (
      <RadioButtonGroup className={styles.radioButtonGroup} name="bedId">
        <RadioButtonSkeleton />
        <RadioButtonSkeleton />
        <RadioButtonSkeleton />
      </RadioButtonGroup>
    );
  }

  if (!bedDropdownItems.length) {
    return (
      <InlineNotification
        kind="error"
        title={t('noBedsConfiguredForLocation', 'No beds configured for {{location}} location', {
          location: location?.display,
        })}
        lowContrast
        hideCloseButton
      />
    );
  }

  if (useDropdown) {
    return (
      <Dropdown
        id="bed-swap-bed-selector"
        titleText={t('selectABed', 'Select a bed')}
        label={!selectedItem ? t('chooseAnOption', 'Choose an option') : selectedItem.label}
        items={bedDropdownItems}
        itemToString={(bedDropdownItem: BedDropdownItem) => bedDropdownItem.label}
        selectedItem={selectedItem}
        onChange={({ selectedItem }) => {
          if (selectedItem != null) {
            onChange(selectedItem.bedId);
          }
        }}
        invalid={!!error}
        invalidText={error?.message}
      />
    );
  }

  return (
    <RadioButtonGroup
      name="bedId"
      className={styles.radioButtonGroup}
      valueSelected={selectedBedId}
      onChange={(selection) => onChange(Number(selection))}
      legendText={t('selectABed', 'Select a bed')}
      invalid={!!error}
      invalidText={error?.message}>
      {bedDropdownItems.map(({ bedId, label, disabled }) => (
        <RadioButton key={bedId} labelText={label} value={bedId} disabled={disabled} />
      ))}
    </RadioButtonGroup>
  );
};

export default BedSelector;
