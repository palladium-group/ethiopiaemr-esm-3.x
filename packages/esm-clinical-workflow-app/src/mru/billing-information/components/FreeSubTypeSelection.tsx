import React from 'react';
import { Controller, Control, FieldErrors } from 'react-hook-form';
import { Dropdown, FormGroup } from '@carbon/react';
import { useConfig } from '@openmrs/esm-framework';
import type { TFunction } from 'i18next';
import type { BillingFormData } from '../billing-information.resource';
import type { ClinicalWorkflowConfig } from '../../../config-schema';
import styles from '../billing-information.scss';

type FreeSubTypeSelectionProps = {
  control: Control<BillingFormData>;
  errors: FieldErrors<BillingFormData>;
  t: TFunction;
  freeSubType?: string;
  setValue: (name: string, value: any, options?: { shouldDirty?: boolean }) => void;
};

export const FreeSubTypeSelection: React.FC<FreeSubTypeSelectionProps> = ({
  control,
  errors,
  t,
  freeSubType,
  setValue,
}) => {
  const { billingVisitAttributeTypes } = useConfig<ClinicalWorkflowConfig>();
  const freeSubTypes = [
    { value: '24hour', label: '24 Hour' },
    { value: 'staff', label: 'Staff' },
    { value: 'exempted', label: 'Exempted' },
  ];

  return (
    <FormGroup className={styles.freeDetailsContainer} legendText={t('freeType', 'Free Type')}>
      <Controller
        name="freeSubType"
        control={control}
        render={({ field: { onChange, value } }) => (
          <Dropdown
            id="freeSubType"
            titleText={t('selectFreeType', 'Select Free Type')}
            label={t('selectFreeType', 'Select Free Type')}
            items={freeSubTypes}
            itemToString={(item) => (item ? item.label : '')}
            selectedItem={freeSubTypes.find((item) => item.value === value) || null}
            onChange={({ selectedItem }) => {
              const subTypeValue = selectedItem?.value;
              onChange(subTypeValue);
              setValue('freeSubType', subTypeValue, { shouldDirty: true });
              // Store free sub-type in attributes
              if (subTypeValue && billingVisitAttributeTypes.freeType) {
                setValue(`attributes.${billingVisitAttributeTypes.freeType}`, subTypeValue, { shouldDirty: true });
              }
            }}
            invalid={!!errors.freeSubType}
            invalidText={errors.freeSubType?.message}
          />
        )}
      />
    </FormGroup>
  );
};
