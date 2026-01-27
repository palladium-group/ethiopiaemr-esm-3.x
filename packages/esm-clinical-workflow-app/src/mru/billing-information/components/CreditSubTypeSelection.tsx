import React from 'react';
import { Controller, Control, FieldErrors } from 'react-hook-form';
import { Dropdown, FormGroup } from '@carbon/react';
import { useConfig } from '@openmrs/esm-framework';
import type { TFunction } from 'i18next';
import type { BillingFormData } from '../billing-information.resource';
import type { ClinicalWorkflowConfig } from '../../../config-schema';
import styles from '../billing-information.scss';

type CreditSubTypeSelectionProps = {
  control: Control<BillingFormData>;
  errors: FieldErrors<BillingFormData>;
  t: TFunction;
  creditSubType?: string;
  setValue: (name: string, value: any, options?: { shouldDirty?: boolean }) => void;
};

export const CreditSubTypeSelection: React.FC<CreditSubTypeSelectionProps> = ({
  control,
  errors,
  t,
  creditSubType,
  setValue,
}) => {
  const { billingVisitAttributeTypes } = useConfig<ClinicalWorkflowConfig>();
  const creditSubTypes = [
    { value: 'cbhi', label: 'CBHI' },
    { value: 'shi', label: 'SHI' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'creditCompany', label: 'Credit Company' },
  ];

  return (
    <FormGroup className={styles.creditDetailsContainer} legendText={t('creditType', 'Credit Type')}>
      <Controller
        name="creditSubType"
        control={control}
        render={({ field: { onChange, value } }) => (
          <Dropdown
            id="creditSubType"
            titleText={t('selectCreditType', 'Select Credit Type')}
            label={t('selectCreditType', 'Select Credit Type')}
            items={creditSubTypes}
            itemToString={(item) => (item ? item.label : '')}
            selectedItem={creditSubTypes.find((item) => item.value === value) || null}
            onChange={({ selectedItem }) => {
              const subTypeValue = selectedItem?.value;
              onChange(subTypeValue);
              setValue('creditSubType', subTypeValue, { shouldDirty: true });
              // Store credit sub-type in attributes
              if (subTypeValue && billingVisitAttributeTypes.creditType) {
                setValue(`attributes.${billingVisitAttributeTypes.creditType}`, subTypeValue, { shouldDirty: true });
              }
              // Clear credit details when changing sub-type
              if (billingVisitAttributeTypes.creditTypeDetails) {
                setValue(`attributes.${billingVisitAttributeTypes.creditTypeDetails}`, '', { shouldDirty: false });
              }
            }}
            invalid={!!errors.creditSubType}
            invalidText={errors.creditSubType?.message}
          />
        )}
      />
    </FormGroup>
  );
};
