import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Checkbox, ComboBox, InlineLoading, NumberInput, TextInput } from '@carbon/react';
import { Add, TrashCan } from '@carbon/react/icons';
import { Controller, type Control, useFieldArray, type UseFormSetValue, useWatch } from 'react-hook-form';
import { useDrugSearch } from '../api/drug-search.resource';
import { useOrderConfigOptions } from '../api/order-config.resource';
import OrderSetMemberDoseUnitsField from './order-set-member-dose-units-field.component';
import { emptyOrderSetMemberFormValues } from './order-set-form.helper';
import type { DrugSearchResult, OrderSetFormValues } from '../types';
import styles from './order-set-members-field.scss';

interface OrderSetMembersFieldProps {
  control: Control<OrderSetFormValues>;
  setValue: UseFormSetValue<OrderSetFormValues>;
  onRetireMember?: (memberUuid: string) => void;
  invalid?: boolean;
  invalidText?: string;
}

const OrderSetMembersField: React.FC<OrderSetMembersFieldProps> = ({
  control,
  setValue,
  onRetireMember,
  invalid,
  invalidText,
}) => {
  const { t } = useTranslation();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'members',
    keyName: 'clientId',
  });
  const { drugRoutes, drugDosingUnits, orderFrequencies, isLoading: isLoadingOrderConfig } = useOrderConfigOptions();

  const handleAddMember = () => {
    append(emptyOrderSetMemberFormValues);
  };

  return (
    <div className={styles.field}>
      <div className={styles.label}>
        {t('orderSetMembers', 'Order set members')}
        <span className={styles.required} aria-hidden="true">
          {' '}
          *
        </span>
      </div>

      {fields.length > 0 ? (
        <div className={styles.memberList}>
          {fields.map((field, index) => (
            <OrderSetMemberRow
              key={field.clientId}
              index={index}
              control={control}
              setValue={setValue}
              drugRoutes={drugRoutes}
              drugDosingUnits={drugDosingUnits}
              orderFrequencies={orderFrequencies}
              isLoadingOrderConfig={isLoadingOrderConfig}
              onRemove={() => {
                if (field.uuid) {
                  onRetireMember?.(field.uuid);
                }
                remove(index);
              }}
            />
          ))}
        </div>
      ) : null}

      <Button kind="ghost" size="sm" renderIcon={Add} onClick={handleAddMember}>
        {t('addOrderSetMember', 'Add drug')}
      </Button>

      {invalid ? <div className={styles.invalidText}>{invalidText}</div> : null}
    </div>
  );
};

interface OrderSetMemberRowProps {
  index: number;
  control: Control<OrderSetFormValues>;
  setValue: UseFormSetValue<OrderSetFormValues>;
  drugRoutes: Array<{ uuid: string; display: string }>;
  drugDosingUnits: Array<{ uuid: string; display: string }>;
  orderFrequencies: Array<{ uuid: string; display: string }>;
  isLoadingOrderConfig: boolean;
  onRemove: () => void;
}

const OrderSetMemberRow: React.FC<OrderSetMemberRowProps> = ({
  index,
  control,
  setValue,
  drugRoutes,
  drugDosingUnits,
  orderFrequencies,
  isLoadingOrderConfig,
  onRemove,
}) => {
  const { t } = useTranslation();
  const member = useWatch({ control, name: `members.${index}` });
  const memberDrugUuid = member?.drugUuid ?? '';
  const memberDrugDisplay = member?.drugDisplay ?? '';
  const memberConceptUuid = member?.conceptUuid ?? '';
  const asNeeded = member?.asNeeded ?? false;
  const [drugSearchTerm, setDrugSearchTerm] = useState(memberDrugDisplay);
  const { drugs, isLoading: isSearchingDrugs } = useDrugSearch(drugSearchTerm);

  useEffect(() => {
    setDrugSearchTerm(memberDrugDisplay);
  }, [memberDrugDisplay]);

  const drugItems = useMemo(() => {
    const items = drugs.map((drug) => ({
      id: drug.uuid,
      text: drug.display,
      drug,
    }));

    if (memberDrugUuid && memberDrugDisplay && !items.some((item) => item.id === memberDrugUuid)) {
      items.unshift({
        id: memberDrugUuid,
        text: memberDrugDisplay,
        drug: {
          uuid: memberDrugUuid,
          display: memberDrugDisplay,
          name: memberDrugDisplay,
          concept: {
            uuid: memberConceptUuid,
            display: '',
          },
        },
      });
    }

    return items;
  }, [drugs, memberConceptUuid, memberDrugDisplay, memberDrugUuid]);

  const handleDrugSelection = (drug: DrugSearchResult | null) => {
    if (!drug) {
      setValue(`members.${index}`, emptyOrderSetMemberFormValues, { shouldDirty: true, shouldValidate: true });
      setDrugSearchTerm('');
      return;
    }

    setValue(
      `members.${index}`,
      {
        ...emptyOrderSetMemberFormValues,
        uuid: member?.uuid,
        drugUuid: drug.uuid,
        drugDisplay: drug.display,
        conceptUuid: drug.concept.uuid,
      },
      { shouldDirty: true, shouldValidate: true },
    );
    setDrugSearchTerm(drug.display);
  };

  return (
    <div className={styles.memberRow}>
      <div className={styles.memberHeader}>
        <span className={styles.memberTitle}>
          {t('orderSetMemberNumber', 'Drug {{number}}', { number: index + 1 })}
        </span>
        <Button
          kind="ghost"
          size="sm"
          renderIcon={TrashCan}
          iconDescription={t('removeOrderSetMember', 'Remove drug')}
          hasIconOnly
          onClick={onRemove}
        />
      </div>

      <ComboBox
        id={`order-set-member-drug-${index}`}
        titleText={t('drug', 'Drug')}
        placeholder={t('searchDrugPlaceholder', 'Search for a drug (min. 2 characters)')}
        items={drugItems}
        itemToString={(item) => item?.text ?? ''}
        selectedItem={memberDrugUuid ? drugItems.find((item) => item.id === memberDrugUuid) ?? null : null}
        onInputChange={(value) => setDrugSearchTerm(value ?? '')}
        onChange={({ selectedItem }) => handleDrugSelection(selectedItem?.drug ?? null)}
        shouldFilterItem={() => true}
      />
      {isSearchingDrugs ? <InlineLoading description={t('searchingDrugs', 'Searching drugs...')} /> : null}

      {memberDrugUuid ? (
        <div className={styles.dosingSection}>
          <span className={styles.dosingLegend}>{t('orderSetMemberDosing', 'Default dosing (optional)')}</span>

          <Controller
            name={`members.${index}.dose`}
            control={control}
            render={({ field }) => (
              <NumberInput
                id={`order-set-member-dose-${index}`}
                label={t('dose', 'Dose')}
                helperText={t('optionalField', 'Optional')}
                allowEmpty
                value={field.value ?? ''}
                onChange={(_, { value }) => {
                  if (value === '' || value === undefined) {
                    field.onChange(null);
                    return;
                  }
                  field.onChange(Number(value));
                }}
              />
            )}
          />

          <OrderSetMemberDoseUnitsField
            control={control}
            setValue={setValue}
            memberIndex={index}
            drugDosingUnits={drugDosingUnits}
            isLoadingUnits={isLoadingOrderConfig}
          />

          <Controller
            name={`members.${index}.routeUuid`}
            control={control}
            render={({ field }) => (
              <ComboBox
                id={`order-set-member-route-${index}`}
                titleText={t('route', 'Route')}
                helperText={t('optionalField', 'Optional')}
                items={drugRoutes.map((route) => ({ id: route.uuid, text: route.display }))}
                itemToString={(item) => item?.text ?? ''}
                selectedItem={
                  field.value
                    ? {
                        id: field.value,
                        text: member?.routeDisplay ?? '',
                      }
                    : null
                }
                onChange={({ selectedItem }) => {
                  field.onChange(selectedItem?.id ?? '');
                  setValue(`members.${index}.routeDisplay`, selectedItem?.text ?? '', { shouldDirty: true });
                }}
                disabled={isLoadingOrderConfig}
              />
            )}
          />

          <Controller
            name={`members.${index}.frequencyUuid`}
            control={control}
            render={({ field }) => (
              <ComboBox
                id={`order-set-member-frequency-${index}`}
                titleText={t('frequency', 'Frequency')}
                helperText={t('optionalField', 'Optional')}
                items={orderFrequencies.map((frequency) => ({ id: frequency.uuid, text: frequency.display }))}
                itemToString={(item) => item?.text ?? ''}
                selectedItem={
                  field.value
                    ? {
                        id: field.value,
                        text: control._formValues?.members?.[index]?.frequencyDisplay ?? '',
                      }
                    : null
                }
                onChange={({ selectedItem }) => {
                  field.onChange(selectedItem?.id ?? '');
                  setValue(`members.${index}.frequencyDisplay`, selectedItem?.text ?? '', { shouldDirty: true });
                }}
                disabled={isLoadingOrderConfig}
              />
            )}
          />

          <Controller
            name={`members.${index}.asNeeded`}
            control={control}
            render={({ field: { value, onChange } }) => (
              <Checkbox
                id={`order-set-member-as-needed-${index}`}
                labelText={t('asNeeded', 'As needed (PRN)')}
                checked={value}
                onChange={(_, state) => onChange(state.checked)}
              />
            )}
          />

          {asNeeded ? (
            <Controller
              name={`members.${index}.asNeededCondition`}
              control={control}
              render={({ field }) => (
                <TextInput
                  id={`order-set-member-as-needed-condition-${index}`}
                  labelText={t('asNeededCondition', 'As needed condition')}
                  placeholder={t('asNeededConditionPlaceholder', 'e.g. pain, fever')}
                  {...field}
                />
              )}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default OrderSetMembersField;
