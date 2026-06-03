import React, { type ReactNode, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Column, ComboBox, Grid, IconButton, Layer, NumberInput } from '@carbon/react';
import { Close } from '@carbon/react/icons';
import { AddIcon, useLayoutType } from '@openmrs/esm-framework';
import type { DosingUnit, DurationUnit, MedicationFrequency, MedicationRoute } from '@openmrs/esm-patient-common-lib';
import {
  createEmptyTaperingPhase,
  type TaperingDosingState,
  type TaperingPhase,
  type TaperingValidationErrors,
} from './complex-dosing.types';
import formStyles from './drug-order-form.scss';
import styles from './tapering-dose-form.scss';

export interface TaperingDoseFormProps {
  state: TaperingDosingState;
  drugRoutes: Array<MedicationRoute>;
  drugDosingUnits: Array<DosingUnit>;
  orderFrequencies: Array<MedicationFrequency>;
  durationUnits: Array<DurationUnit>;
  defaultDurationUnit?: DurationUnit | null;
  onStateChange: (state: TaperingDosingState) => void;
  validationErrors?: TaperingValidationErrors | null;
  filterItemsByName: (menu: { item?: { value?: string }; inputValue?: string }) => boolean;
  filterItemsBySynonymNames: (menu: { item?: { names?: Array<string> }; inputValue?: string }) => boolean;
}

function InputWrapper({ children }: { children: ReactNode }) {
  const isTablet = useLayoutType() === 'tablet';
  return (
    <Layer level={isTablet ? 1 : 0}>
      <div className={formStyles.field}>{children}</div>
    </Layer>
  );
}

export function TaperingDoseForm({
  state,
  drugRoutes,
  drugDosingUnits,
  orderFrequencies,
  durationUnits,
  defaultDurationUnit,
  onStateChange,
  validationErrors,
  filterItemsByName,
  filterItemsBySynonymNames,
}: TaperingDoseFormProps) {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const inputSize = isTablet ? 'md' : 'sm';

  const updateState = useCallback(
    (updates: Partial<TaperingDosingState>) => {
      onStateChange({ ...state, ...updates });
    },
    [onStateChange, state],
  );

  const updatePhase = useCallback(
    (phaseId: string, updates: Partial<TaperingPhase>) => {
      onStateChange({
        ...state,
        phases: state.phases.map((phase) => (phase.id === phaseId ? { ...phase, ...updates } : phase)),
      });
    },
    [onStateChange, state],
  );

  const handleAddPhase = useCallback(() => {
    onStateChange({
      ...state,
      phases: [...state.phases, createEmptyTaperingPhase(defaultDurationUnit)],
    });
  }, [defaultDurationUnit, onStateChange, state]);

  const handleRemovePhase = useCallback(
    (phaseId: string) => {
      onStateChange({
        ...state,
        phases: state.phases.filter((phase) => phase.id !== phaseId),
      });
    },
    [onStateChange, state],
  );

  return (
    <>
      <Grid className={formStyles.gridRow}>
        <Column lg={16} md={4} sm={4}>
          <InputWrapper>
            <ComboBox<MedicationRoute>
              id="taperingRoute"
              invalid={Boolean(validationErrors?.route)}
              invalidText={validationErrors?.route}
              items={drugRoutes}
              itemToString={(item) => item?.value}
              onChange={({ selectedItem }) => updateState({ route: selectedItem ?? null })}
              placeholder={t('editRouteComboBoxTitle', 'Route')}
              selectedItem={state.route}
              shouldFilterItem={filterItemsByName}
              size={inputSize}
              titleText={t('editRouteComboBoxTitle', 'Route')}
            />
          </InputWrapper>
        </Column>
        <Column lg={16} md={4} sm={4}>
          <InputWrapper>
            <ComboBox<DosingUnit>
              id="taperingDoseUnit"
              invalid={Boolean(validationErrors?.unit)}
              invalidText={validationErrors?.unit}
              items={drugDosingUnits}
              itemToString={(item) => item?.value}
              onChange={({ selectedItem }) => updateState({ unit: selectedItem ?? null })}
              placeholder={t('editDosageUnitsPlaceholder', 'Unit')}
              selectedItem={state.unit}
              shouldFilterItem={filterItemsByName}
              size={inputSize}
              titleText={t('editDosageUnitsTitle', 'Dose unit')}
            />
          </InputWrapper>
        </Column>
      </Grid>

      {state.phases.map((phase, index) => {
        const phaseErrors = validationErrors?.phases?.[phase.id];

        return (
          <div key={phase.id} className={styles.phaseCard}>
            <div className={styles.phaseHeader}>
              <span className={styles.phaseTitle}>{t('taperingPhase', 'Phase {{number}}', { number: index + 1 })}</span>
              {index > 0 && (
                <IconButton
                  align="left"
                  kind="ghost"
                  label={t('removePhase', 'Remove phase')}
                  onClick={() => handleRemovePhase(phase.id)}
                  size={inputSize}>
                  <Close size={16} />
                </IconButton>
              )}
            </div>
            <Grid className={formStyles.gridRow}>
              <Column lg={8} md={4} sm={4} className={formStyles.linkedInput}>
                <InputWrapper>
                  <div className={formStyles.numberInput}>
                    <NumberInput
                      allowEmpty
                      disableWheel
                      hideSteppers
                      id={`taperingDose-${phase.id}`}
                      invalid={Boolean(phaseErrors?.dose)}
                      invalidText={phaseErrors?.dose}
                      label={t('editDoseComboBoxTitle', 'Dose')}
                      min={0.01}
                      onChange={(_, { value }) => {
                        const number = parseFloat(String(value));
                        updatePhase(phase.id, { dose: isNaN(number) ? null : number });
                      }}
                      size={inputSize}
                      step={0.01}
                      value={typeof phase.dose === 'number' ? phase.dose : ''}
                    />
                  </div>
                </InputWrapper>
              </Column>
              <Column lg={16} md={4} sm={4}>
                <InputWrapper>
                  <ComboBox<MedicationFrequency>
                    id={`taperingFrequency-${phase.id}`}
                    invalid={Boolean(phaseErrors?.frequency)}
                    invalidText={phaseErrors?.frequency}
                    items={orderFrequencies}
                    itemToString={(item) => item?.value}
                    onChange={({ selectedItem }) => updatePhase(phase.id, { frequency: selectedItem ?? null })}
                    placeholder={t('editFrequencyComboBoxTitle', 'Frequency')}
                    selectedItem={phase.frequency}
                    shouldFilterItem={filterItemsBySynonymNames}
                    size={inputSize}
                    titleText={t('editFrequencyComboBoxTitle', 'Frequency')}
                  />
                </InputWrapper>
              </Column>
              <Column lg={8} md={2} sm={4} className={formStyles.linkedInput}>
                <InputWrapper>
                  <NumberInput
                    allowEmpty
                    disableWheel
                    id={`taperingDuration-${phase.id}`}
                    invalid={Boolean(phaseErrors?.duration)}
                    invalidText={phaseErrors?.duration}
                    label={t('duration', 'Duration')}
                    min={0}
                    onChange={(_, { value }) => {
                      const number = parseFloat(String(value));
                      updatePhase(phase.id, { duration: isNaN(number) ? null : number });
                    }}
                    size={inputSize}
                    step={1}
                    value={typeof phase.duration === 'number' ? phase.duration : ''}
                  />
                </InputWrapper>
              </Column>
              <Column className={formStyles.durationUnit} lg={8} md={2} sm={4}>
                <InputWrapper>
                  <ComboBox<DurationUnit>
                    id={`taperingDurationUnit-${phase.id}`}
                    invalid={Boolean(phaseErrors?.durationUnit)}
                    invalidText={phaseErrors?.durationUnit}
                    items={durationUnits}
                    itemToString={(item) => item?.value}
                    onChange={({ selectedItem }) => updatePhase(phase.id, { durationUnit: selectedItem ?? null })}
                    placeholder={t('durationUnitPlaceholder', 'Duration Unit')}
                    selectedItem={phase.durationUnit}
                    shouldFilterItem={filterItemsByName}
                    size={inputSize}
                    titleText={t('durationUnit', 'Duration unit')}
                  />
                </InputWrapper>
              </Column>
            </Grid>
          </div>
        );
      })}

      <Button
        className={styles.addPhaseButton}
        kind="ghost"
        onClick={handleAddPhase}
        renderIcon={AddIcon}
        size={inputSize}>
        {t('addPhase', 'Add phase')}
      </Button>
    </>
  );
}

export default TaperingDoseForm;
