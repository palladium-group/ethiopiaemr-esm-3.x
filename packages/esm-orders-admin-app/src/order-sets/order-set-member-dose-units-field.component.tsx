import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ComboBox, RadioButton } from '@carbon/react';
import { TrashCan } from '@carbon/react/icons';
import { type Control, useFieldArray, type UseFormSetValue } from 'react-hook-form';
import type { OrderConfigOption } from '../api/order-config.resource';
import { normalizeDoseUnits } from '../order-templates/order-template-form.helper';
import type { DoseUnitFormValue, OrderSetFormValues } from '../types';
import styles from '../order-templates/dose-units-field.scss';

interface OrderSetMemberDoseUnitsFieldProps {
  control: Control<OrderSetFormValues>;
  setValue: UseFormSetValue<OrderSetFormValues>;
  memberIndex: number;
  drugDosingUnits: Array<OrderConfigOption>;
  isLoadingUnits: boolean;
}

const OrderSetMemberDoseUnitsField: React.FC<OrderSetMemberDoseUnitsFieldProps> = ({
  control,
  setValue,
  memberIndex,
  drugDosingUnits,
  isLoadingUnits,
}) => {
  const { t } = useTranslation();
  const fieldName = `members.${memberIndex}.doseUnits` as const;
  const { fields, replace } = useFieldArray({
    control,
    name: fieldName,
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
    setValue(fieldName, normalizedUnits, { shouldDirty: true, shouldValidate: true });
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
        id={`order-set-member-add-unit-${memberIndex}`}
        titleText={t('doseUnit', 'Dose unit')}
        helperText={t('optionalField', 'Optional')}
        placeholder={t('selectDoseUnitPlaceholder', 'Select a dose unit to add')}
        items={availableUnits.map((unit) => ({ id: unit.uuid, text: unit.display, unit }))}
        itemToString={(item) => item?.text ?? ''}
        selectedItem={null}
        onChange={({ selectedItem }) => handleAddUnit(selectedItem?.unit ?? null)}
        disabled={isLoadingUnits || availableUnits.length === 0}
        shouldFilterItem={() => true}
      />

      {fields.length > 0 ? (
        <fieldset className={styles.unitList}>
          <legend className={styles.legend}>{t('defaultDoseUnitLegend', 'Default dose unit')}</legend>
          {fields.map((field) => (
            <div key={field.clientId} className={styles.unitRow}>
              <RadioButton
                id={`order-set-dose-unit-${memberIndex}-${field.uuid}`}
                name={`default-dose-unit-${memberIndex}`}
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
              />
            </div>
          ))}
        </fieldset>
      ) : null}
    </div>
  );
};

export default OrderSetMemberDoseUnitsField;
