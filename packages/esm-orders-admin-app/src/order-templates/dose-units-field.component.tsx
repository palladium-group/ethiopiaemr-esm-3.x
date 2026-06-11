import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ComboBox, RadioButton } from '@carbon/react';
import { TrashCan } from '@carbon/react/icons';
import { type Control, useFieldArray, type UseFormSetValue } from 'react-hook-form';
import type { OrderConfigOption } from '../api/order-config.resource';
import { normalizeDoseUnits } from './order-template-form.helper';
import type { DoseUnitFormValue, OrderTemplateFormValues } from '../types';
import styles from './dose-units-field.scss';

interface DoseUnitsFieldProps {
  control: Control<OrderTemplateFormValues>;
  setValue: UseFormSetValue<OrderTemplateFormValues>;
  drugDosingUnits: Array<OrderConfigOption>;
  isLoadingUnits: boolean;
  invalid?: boolean;
  invalidText?: string;
}

const DoseUnitsField: React.FC<DoseUnitsFieldProps> = ({
  control,
  setValue,
  drugDosingUnits,
  isLoadingUnits,
  invalid,
  invalidText,
}) => {
  const { t } = useTranslation();
  const { fields, replace } = useFieldArray({
    control,
    name: 'doseUnits',
    keyName: 'clientId',
  });

  const selectedUnitIds = useMemo(() => new Set(fields.map((field) => field.uuid)), [fields]);

  const availableUnits = useMemo(
    () => drugDosingUnits.filter((unit) => !selectedUnitIds.has(unit.uuid)),
    [drugDosingUnits, selectedUnitIds],
  );

  const updateDoseUnits = (nextUnits: Array<DoseUnitFormValue>) => {
    const normalizedUnits = normalizeDoseUnits(nextUnits);
    replace(normalizedUnits);
    setValue('doseUnits', normalizedUnits, { shouldDirty: true, shouldValidate: true });
  };

  const handleAddUnit = (unit: OrderConfigOption | null) => {
    if (!unit) {
      return;
    }

    updateDoseUnits([
      ...fields.map((field) => ({
        uuid: field.uuid,
        display: field.display,
        isDefault: field.isDefault,
      })),
      {
        uuid: unit.uuid,
        display: unit.display,
        isDefault: fields.length === 0,
      },
    ]);
  };

  const handleSetDefault = (unitUuid: string) => {
    updateDoseUnits(
      fields.map((field) => ({
        uuid: field.uuid,
        display: field.display,
        isDefault: field.uuid === unitUuid,
      })),
    );
  };

  const handleRemoveUnit = (unitUuid: string) => {
    updateDoseUnits(
      fields
        .filter((field) => field.uuid !== unitUuid)
        .map((field) => ({
          uuid: field.uuid,
          display: field.display,
          isDefault: field.isDefault,
        })),
    );
  };

  return (
    <div className={styles.field}>
      <ComboBox
        id="order-template-add-unit"
        titleText={
          <>
            {t('doseUnit', 'Dose unit')}
            <span className={styles.required} aria-hidden="true">
              {' '}
              *
            </span>
          </>
        }
        placeholder={t('selectDoseUnitPlaceholder', 'Select a dose unit to add')}
        items={availableUnits.map((unit) => ({ id: unit.uuid, text: unit.display, unit }))}
        itemToString={(item) => item?.text ?? ''}
        selectedItem={null}
        onChange={({ selectedItem }) => handleAddUnit(selectedItem?.unit ?? null)}
        disabled={isLoadingUnits || availableUnits.length === 0}
        invalid={invalid}
        invalidText={invalidText}
        shouldFilterItem={() => true}
      />

      {fields.length > 0 ? (
        <fieldset className={styles.unitList}>
          <legend className={styles.legend}>{t('defaultDoseUnitLegend', 'Default dose unit')}</legend>
          {fields.map((field) => (
            <div key={field.clientId} className={styles.unitRow}>
              <RadioButton
                id={`dose-unit-${field.uuid}`}
                name="default-dose-unit"
                labelText={field.display}
                value={field.uuid}
                checked={field.isDefault}
                onChange={() => handleSetDefault(field.uuid)}
              />
              <Button
                kind="ghost"
                size="sm"
                renderIcon={TrashCan}
                iconDescription={t('removeDoseUnit', 'Remove dose unit')}
                hasIconOnly
                onClick={() => handleRemoveUnit(field.uuid)}
                disabled={fields.length === 1}
              />
            </div>
          ))}
        </fieldset>
      ) : null}

      {invalid && !fields.length ? <div className={styles.invalidText}>{invalidText}</div> : null}
    </div>
  );
};

export default DoseUnitsField;
