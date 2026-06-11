import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  ButtonSet,
  Checkbox,
  ComboBox,
  Form,
  InlineLoading,
  NumberInput,
  Stack,
  TextArea,
  TextInput,
} from '@carbon/react';
import { Controller, useForm } from 'react-hook-form';
import { type DefaultWorkspaceProps, ResponsiveWrapper, showSnackbar, useLayoutType } from '@openmrs/esm-framework';
import { useDrugSearch } from '../api/drug-search.resource';
import { useOrderConfigOptions } from '../api/order-config.resource';
import { revalidateOrderTemplates, saveOrderTemplate } from '../api/order-template.resource';
import {
  emptyOrderTemplateFormValues,
  getErrorMessage,
  mapFormValuesToSavePayload,
  mapOrderTemplateToFormValues,
} from '../order-templates/order-template-form.helper';
import type { DrugSearchResult, OrderTemplateFormValues, OrderTemplateListItem } from '../types';
import styles from './order-template-admin.workspace.scss';

type OrderTemplateAdminWorkspaceProps = DefaultWorkspaceProps & {
  orderTemplate?: OrderTemplateListItem;
};

const OrderTemplateAdminWorkspace: React.FC<OrderTemplateAdminWorkspaceProps> = ({
  orderTemplate,
  closeWorkspace,
  closeWorkspaceWithSavedChanges,
  promptBeforeClosing,
}) => {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const [drugSearchTerm, setDrugSearchTerm] = useState('');
  const { drugs, isLoading: isSearchingDrugs } = useDrugSearch(drugSearchTerm);
  const { drugRoutes, drugDosingUnits, orderFrequencies, isLoading: isLoadingOrderConfig } = useOrderConfigOptions();

  const defaultValues = useMemo(
    () => (orderTemplate ? mapOrderTemplateToFormValues(orderTemplate) : emptyOrderTemplateFormValues),
    [orderTemplate],
  );

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isDirty, isSubmitting },
  } = useForm<OrderTemplateFormValues>({
    defaultValues,
  });

  const asNeeded = watch('asNeeded');
  const selectedDrugUuid = watch('drugUuid');
  const selectedDrugDisplay = watch('drugDisplay');
  const selectedConceptUuid = watch('conceptUuid');

  useEffect(() => {
    reset(orderTemplate ? mapOrderTemplateToFormValues(orderTemplate) : emptyOrderTemplateFormValues);
    if (orderTemplate?.drug?.display) {
      setDrugSearchTerm(orderTemplate.drug.display);
    }
  }, [orderTemplate, reset]);

  useEffect(() => {
    promptBeforeClosing(() => isDirty);
  }, [isDirty, promptBeforeClosing]);

  const drugItems = useMemo(() => {
    const items = drugs.map((drug) => ({
      id: drug.uuid,
      text: drug.display,
      drug,
    }));

    if (selectedDrugUuid && selectedDrugDisplay && !items.some((item) => item.id === selectedDrugUuid)) {
      items.unshift({
        id: selectedDrugUuid,
        text: selectedDrugDisplay,
        drug: {
          uuid: selectedDrugUuid,
          display: selectedDrugDisplay,
          name: selectedDrugDisplay,
          concept: {
            uuid: selectedConceptUuid,
            display: '',
          },
        },
      });
    }

    return items;
  }, [drugs, selectedConceptUuid, selectedDrugDisplay, selectedDrugUuid]);

  const handleDrugSelection = (drug: DrugSearchResult | null) => {
    if (!drug) {
      setValue('drugUuid', '', { shouldDirty: true });
      setValue('drugDisplay', '', { shouldDirty: true });
      setValue('conceptUuid', '', { shouldDirty: true });
      return;
    }

    setValue('drugUuid', drug.uuid, { shouldDirty: true });
    setValue('drugDisplay', drug.display, { shouldDirty: true });
    setValue('conceptUuid', drug.concept.uuid, { shouldDirty: true });
    setDrugSearchTerm(drug.display);
  };

  const onSubmit = async (values: OrderTemplateFormValues) => {
    if (!values.drugUuid || !values.conceptUuid) {
      showSnackbar({
        title: t('validationError', 'Validation error'),
        kind: 'error',
        subtitle: t('drugRequired', 'Select a drug for this template.'),
        isLowContrast: true,
      });
      return;
    }

    try {
      await saveOrderTemplate(mapFormValuesToSavePayload(values, orderTemplate?.uuid));
      await revalidateOrderTemplates();
      showSnackbar({
        title: t('success', 'Success'),
        kind: 'success',
        subtitle: orderTemplate
          ? t('orderTemplateUpdated', 'Drug order template updated.')
          : t('orderTemplateCreated', 'Drug order template created.'),
        isLowContrast: true,
      });
      closeWorkspaceWithSavedChanges();
    } catch (error) {
      showSnackbar({
        title: t('error', 'Error'),
        kind: 'error',
        subtitle: getErrorMessage(error, t('orderTemplateSaveFailed', 'Failed to save drug order template.')),
        isLowContrast: true,
      });
    }
  };

  return (
    <Form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
      <Stack gap={5}>
        <Controller
          name="name"
          control={control}
          rules={{ required: true }}
          render={({ field }) => (
            <TextInput
              id="order-template-name"
              labelText={t('templateName', 'Template name')}
              placeholder={t('templateNamePlaceholder', 'e.g. Amlodipine 5mg once daily')}
              {...field}
            />
          )}
        />

        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <TextArea
              id="order-template-description"
              labelText={t('description', 'Description')}
              placeholder={t('templateDescriptionPlaceholder', 'Optional description for administrators')}
              rows={3}
              {...field}
            />
          )}
        />

        <ComboBox
          id="order-template-drug"
          titleText={t('drug', 'Drug')}
          placeholder={t('searchDrugPlaceholder', 'Search for a drug (min. 2 characters)')}
          items={drugItems}
          itemToString={(item) => item?.text ?? ''}
          selectedItem={
            selectedDrugUuid && selectedDrugDisplay
              ? drugItems.find((item) => item.id === selectedDrugUuid) ?? null
              : null
          }
          onInputChange={(value) => setDrugSearchTerm(value ?? '')}
          onChange={({ selectedItem }) => handleDrugSelection(selectedItem?.drug ?? null)}
          shouldFilterItem={() => true}
        />
        {isSearchingDrugs ? <InlineLoading description={t('searchingDrugs', 'Searching drugs...')} /> : null}

        <Controller
          name="dose"
          control={control}
          render={({ field }) => (
            <NumberInput
              id="order-template-dose"
              label={t('dose', 'Dose')}
              min={0}
              value={field.value === '' ? '' : field.value}
              onChange={(_, { value }) => field.onChange(value === '' ? '' : Number(value))}
            />
          )}
        />

        <Controller
          name="unitUuid"
          control={control}
          render={({ field }) => (
            <ComboBox
              id="order-template-unit"
              titleText={t('doseUnit', 'Dose unit')}
              items={drugDosingUnits.map((unit) => ({ id: unit.uuid, text: unit.display }))}
              itemToString={(item) => item?.text ?? ''}
              selectedItem={
                field.value
                  ? {
                      id: field.value,
                      text: watch('unitDisplay'),
                    }
                  : null
              }
              onChange={({ selectedItem }) => {
                field.onChange(selectedItem?.id ?? '');
                setValue('unitDisplay', selectedItem?.text ?? '', { shouldDirty: true });
              }}
              disabled={isLoadingOrderConfig}
            />
          )}
        />

        <Controller
          name="routeUuid"
          control={control}
          render={({ field }) => (
            <ComboBox
              id="order-template-route"
              titleText={t('route', 'Route')}
              items={drugRoutes.map((route) => ({ id: route.uuid, text: route.display }))}
              itemToString={(item) => item?.text ?? ''}
              selectedItem={
                field.value
                  ? {
                      id: field.value,
                      text: watch('routeDisplay'),
                    }
                  : null
              }
              onChange={({ selectedItem }) => {
                field.onChange(selectedItem?.id ?? '');
                setValue('routeDisplay', selectedItem?.text ?? '', { shouldDirty: true });
              }}
              disabled={isLoadingOrderConfig}
            />
          )}
        />

        <Controller
          name="frequencyUuid"
          control={control}
          render={({ field }) => (
            <ComboBox
              id="order-template-frequency"
              titleText={t('frequency', 'Frequency')}
              items={orderFrequencies.map((frequency) => ({ id: frequency.uuid, text: frequency.display }))}
              itemToString={(item) => item?.text ?? ''}
              selectedItem={
                field.value
                  ? {
                      id: field.value,
                      text: watch('frequencyDisplay'),
                    }
                  : null
              }
              onChange={({ selectedItem }) => {
                field.onChange(selectedItem?.id ?? '');
                setValue('frequencyDisplay', selectedItem?.text ?? '', { shouldDirty: true });
              }}
              disabled={isLoadingOrderConfig}
            />
          )}
        />

        <Controller
          name="asNeeded"
          control={control}
          render={({ field: { value, onChange } }) => (
            <Checkbox
              id="order-template-as-needed"
              labelText={t('asNeeded', 'As needed (PRN)')}
              checked={value}
              onChange={(_, state) => onChange(state.checked)}
            />
          )}
        />

        {asNeeded ? (
          <Controller
            name="asNeededCondition"
            control={control}
            render={({ field }) => (
              <TextInput
                id="order-template-as-needed-condition"
                labelText={t('asNeededCondition', 'As needed condition')}
                placeholder={t('asNeededConditionPlaceholder', 'e.g. pain, fever')}
                {...field}
              />
            )}
          />
        ) : null}
      </Stack>

      <ResponsiveWrapper>
        <ButtonSet className={styles.buttonSet}>
          <Button kind="secondary" onClick={() => closeWorkspace()} size={isTablet ? 'md' : 'sm'}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button kind="primary" type="submit" disabled={isSubmitting} size={isTablet ? 'md' : 'sm'}>
            {isSubmitting ? (
              <InlineLoading description={t('saving', 'Saving...')} />
            ) : orderTemplate ? (
              t('saveChanges', 'Save changes')
            ) : (
              t('createTemplate', 'Create template')
            )}
          </Button>
        </ButtonSet>
      </ResponsiveWrapper>
    </Form>
  );
};

export default OrderTemplateAdminWorkspace;
