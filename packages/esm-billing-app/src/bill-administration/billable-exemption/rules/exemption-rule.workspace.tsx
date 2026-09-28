import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  ButtonSet,
  ComboBox,
  Dropdown,
  InlineLoading,
  InlineNotification,
  RadioButton,
  RadioButtonGroup,
  Stack,
  TextInput,
  Toggle,
} from '@carbon/react';
import {
  type DefaultWorkspaceProps,
  ResponsiveWrapper,
  showSnackbar,
  useConfig,
  useLayoutType,
} from '@openmrs/esm-framework';
import type { BillingConfig } from '../../../config-schema';
import {
  type ExemptionCriterion,
  type ExemptionRule,
  criteriaSupportingAllItems,
  findRule,
  upsertRule,
} from '../exemption-rules.utils';
import { updateExemptions, useExemptionsSetting, useLoginLocations, usePrograms } from '../exemptions.resource';
import { createExemptionRuleSchema, type ExemptionRuleFormValues } from './exemption-rule.schema';
import ExemptionItemPicker from './exemption-item-picker.component';
import styles from './exemption-rules.scss';

type ExemptionRuleWorkspaceProps = DefaultWorkspaceProps & {
  initialRule?: ExemptionRule;
};

const ExemptionRuleWorkspace: React.FC<ExemptionRuleWorkspaceProps> = ({
  closeWorkspace,
  closeWorkspaceWithSavedChanges,
  promptBeforeClosing,
  initialRule,
}) => {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const { patientExemptionCategories = [] } = useConfig<BillingConfig>();
  const { config } = useExemptionsSetting();
  const { locations, isLoading: isLoadingLocations } = useLoginLocations();
  const { programs, isLoading: isLoadingPrograms } = usePrograms();
  const schema = useMemo(() => createExemptionRuleSchema(t), [t]);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ExemptionRuleFormValues>({
    resolver: zodResolver(schema),
    mode: 'all',
    defaultValues: {
      section: initialRule?.section ?? 'services',
      criterion: initialRule?.criterion ?? 'location',
      value: initialRule?.value ?? '',
      allItems: initialRule?.allItems ?? false,
      items: initialRule?.items ?? [],
    },
  });

  const [section, criterion, value, allItems, items] = useWatch({
    control,
    name: ['section', 'criterion', 'value', 'allItems', 'items'],
  });

  useEffect(() => {
    if (isDirty) {
      promptBeforeClosing(() => isDirty);
    }
  }, [isDirty, promptBeforeClosing]);

  const criterionOptions: Array<{ id: ExemptionCriterion; text: string }> = [
    { id: 'location', text: t('exemptionCriterionLocation', 'Patients seen at a location') },
    { id: 'program', text: t('exemptionCriterionProgram', 'Patients enrolled in a program') },
    { id: 'ageUnder', text: t('exemptionCriterionAgeUnder', 'Patients younger than') },
    { id: 'ageOver', text: t('exemptionCriterionAgeOver', 'Patients older than') },
    { id: 'visitAttribute', text: t('exemptionCriterionVisitAttribute', 'Patients in an exemption category') },
    { id: 'all', text: t('exemptionCriterionAll', 'All patients') },
  ];

  const categoryOptions = useMemo(() => {
    const options = patientExemptionCategories.map(({ value, label }) => ({ value, label: label ?? value }));
    // Keep a saved value that is no longer configured, so editing does not silently change it
    if (initialRule?.criterion === 'visitAttribute' && !options.some((o) => o.value === initialRule.value)) {
      options.push({ value: initialRule.value, label: initialRule.value });
    }
    return options;
  }, [patientExemptionCategories, initialRule]);

  // Keep a saved name that is missing from the list (e.g. renamed), so editing does not silently drop it
  const withSavedValue = (names: Array<string>, forCriterion: ExemptionCriterion) =>
    initialRule?.criterion === forCriterion && initialRule.value && !names.includes(initialRule.value)
      ? [...names, initialRule.value]
      : names;
  const locationNames = withSavedValue(
    locations.map((location) => location.name),
    'location',
  );
  const programNames = withSavedValue(
    programs.map((program) => program.name),
    'program',
  );

  const duplicate = findRule(config, { section, criterion, value, allItems, items });
  const mergesIntoExistingRule = duplicate && duplicate.id !== initialRule?.id;

  const onSubmit = async (data: ExemptionRuleFormValues) => {
    try {
      await updateExemptions((current) =>
        upsertRule(
          current,
          {
            section: data.section,
            criterion: data.criterion,
            value: data.criterion === 'all' ? undefined : data.value.trim(),
            allItems: data.allItems,
            items: data.allItems ? [] : data.items,
          },
          initialRule?.id,
        ),
      );
      showSnackbar({
        title: t('exemptionRuleSaved', 'Exemption rule saved'),
        subtitle: t('exemptionRuleSavedSubtitle', 'The change applies to new bills straight away'),
        kind: 'success',
        isLowContrast: true,
      });
      closeWorkspaceWithSavedChanges();
    } catch (error) {
      showSnackbar({
        title: t('exemptionRuleSaveFailed', 'Could not save the exemption rule'),
        subtitle: error?.responseBody?.error?.message ?? error?.message,
        kind: 'error',
        isLowContrast: true,
      });
    }
  };

  const renderValueField = () => {
    switch (criterion) {
      case 'location':
        return (
          <Controller
            name="value"
            control={control}
            render={({ field }) => (
              <ComboBox
                id="exemption-location"
                titleText={t('location', 'Location')}
                placeholder={t('selectLocation', 'Select a location')}
                helperText={t(
                  'exemptionLocationHelper',
                  'Applies when the user is logged in at this location, or to the visit location if none is selected',
                )}
                items={locationNames}
                selectedItem={field.value || null}
                onChange={({ selectedItem }) => field.onChange(selectedItem ?? '')}
                disabled={isLoadingLocations}
                invalid={!!errors.value}
                invalidText={errors.value?.message}
              />
            )}
          />
        );
      case 'program':
        return (
          <Controller
            name="value"
            control={control}
            render={({ field }) => (
              <ComboBox
                id="exemption-program"
                titleText={t('program', 'Program')}
                placeholder={t('selectProgram', 'Select a program')}
                helperText={t('exemptionProgramHelper', 'Applies while the patient is actively enrolled')}
                items={programNames}
                selectedItem={field.value || null}
                onChange={({ selectedItem }) => field.onChange(selectedItem ?? '')}
                disabled={isLoadingPrograms}
                invalid={!!errors.value}
                invalidText={errors.value?.message}
              />
            )}
          />
        );
      case 'ageUnder':
      case 'ageOver':
        return (
          <Controller
            name="value"
            control={control}
            render={({ field }) => (
              <TextInput
                {...field}
                id="exemption-age"
                type="number"
                min={1}
                labelText={t('ageInYears', 'Age (years)')}
                invalid={!!errors.value}
                invalidText={errors.value?.message}
              />
            )}
          />
        );
      case 'visitAttribute':
        return (
          <Controller
            name="value"
            control={control}
            render={({ field }) => (
              <Dropdown
                id="exemption-category"
                titleText={t('exemptionCategory', 'Exemption category')}
                helperText={t('exemptionCategoryHelper', 'Set on the patient’s visit at check-in')}
                label={t('selectCategory', 'Select a category')}
                items={categoryOptions}
                itemToString={(item) => item?.label ?? ''}
                selectedItem={categoryOptions.find((option) => option.value === field.value) ?? null}
                onChange={({ selectedItem }) => field.onChange(selectedItem?.value ?? '')}
                invalid={!!errors.value}
                invalidText={errors.value?.message}
              />
            )}
          />
        );
      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      <div className={styles.formContainer}>
        <Stack gap={6}>
          <ResponsiveWrapper>
            <Controller
              name="section"
              control={control}
              render={({ field }) => (
                <RadioButtonGroup
                  legendText={t('exemptionCovers', 'What is exempted')}
                  name="exemption-section"
                  valueSelected={field.value}
                  onChange={(selected) => {
                    field.onChange(selected);
                    setValue('items', [], { shouldValidate: true });
                  }}>
                  <RadioButton id="exemption-section-services" labelText={t('services', 'Services')} value="services" />
                  <RadioButton
                    id="exemption-section-commodities"
                    labelText={t('commodities', 'Commodities')}
                    value="commodities"
                  />
                </RadioButtonGroup>
              )}
            />
          </ResponsiveWrapper>

          <ResponsiveWrapper>
            <Controller
              name="criterion"
              control={control}
              render={({ field }) => (
                <Dropdown
                  id="exemption-criterion"
                  titleText={t('exemptionAppliesTo', 'Who is exempted')}
                  label=""
                  items={criterionOptions}
                  itemToString={(item) => item?.text ?? ''}
                  selectedItem={criterionOptions.find((option) => option.id === field.value)}
                  onChange={({ selectedItem }) => {
                    field.onChange(selectedItem.id);
                    setValue('value', '', { shouldValidate: false });
                    if (!criteriaSupportingAllItems.includes(selectedItem.id)) {
                      setValue('allItems', false, { shouldValidate: true });
                    }
                  }}
                />
              )}
            />
          </ResponsiveWrapper>

          {criterion !== 'all' && <ResponsiveWrapper>{renderValueField()}</ResponsiveWrapper>}

          {criteriaSupportingAllItems.includes(criterion) && (
            <ResponsiveWrapper>
              <Controller
                name="allItems"
                control={control}
                render={({ field }) => (
                  <Toggle
                    id="exemption-all-items"
                    labelText={
                      section === 'services'
                        ? t('exemptAllServices', 'Exempt all services')
                        : t('exemptAllCommodities', 'Exempt all commodities')
                    }
                    labelA={t('no', 'No')}
                    labelB={t('yes', 'Yes')}
                    toggled={field.value}
                    onToggle={(toggled) => field.onChange(toggled)}
                  />
                )}
              />
            </ResponsiveWrapper>
          )}

          {!allItems && (
            <ResponsiveWrapper>
              <Controller
                name="items"
                control={control}
                render={({ field }) => (
                  <ExemptionItemPicker
                    section={section}
                    selectedItems={field.value}
                    onChange={field.onChange}
                    invalid={!!errors.items}
                    invalidText={errors.items?.message}
                  />
                )}
              />
            </ResponsiveWrapper>
          )}

          {mergesIntoExistingRule && (
            <InlineNotification
              kind="info"
              lowContrast
              hideCloseButton
              title={t('exemptionRuleExists', 'A rule for these patients already exists')}
              subtitle={t('exemptionRuleMerge', 'Saving adds these items to the existing rule.')}
            />
          )}
        </Stack>
      </div>
      <ButtonSet className={classNames({ [styles.tablet]: isTablet, [styles.desktop]: !isTablet })}>
        <Button className={styles.button} kind="secondary" onClick={() => closeWorkspace()}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button className={styles.button} kind="primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? <InlineLoading description={t('saving', 'Saving…')} /> : t('saveAndClose', 'Save & Close')}
        </Button>
      </ButtonSet>
    </form>
  );
};

export default ExemptionRuleWorkspace;
