import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Column, ComboBox, Grid, IconButton, NumberInput, RadioButton, RadioButtonGroup } from '@carbon/react';
import { Close } from '@carbon/react/icons';
import { AddIcon, useLayoutType } from '@openmrs/esm-framework';
import type { DosingUnit, DurationUnit, MedicationRoute } from '@openmrs/esm-patient-common-lib';
import {
  createEmptyHybridPhase,
  type HybridDosingState,
  type HybridPhase,
  type HybridValidationErrors,
  type VariablePattern,
  type VariableQ6hDoses,
  type VariableTidDoses,
} from './complex-dosing.types';
import { InputWrapper, parseDoseValue } from './complex-dosing-form.utils';
import formStyles from './drug-order-form.scss';
import styles from './hybrid-dose-form.scss';

export interface HybridDoseFormProps {
  state: HybridDosingState;
  drugRoutes: Array<MedicationRoute>;
  drugDosingUnits: Array<DosingUnit>;
  durationUnits: Array<DurationUnit>;
  defaultDurationUnit?: DurationUnit | null;
  onStateChange: (state: HybridDosingState) => void;
  validationErrors?: HybridValidationErrors | null;
  filterItemsByName: (menu: { item?: { value?: string }; inputValue?: string }) => boolean;
}

export function HybridDoseForm({
  state,
  drugRoutes,
  drugDosingUnits,
  durationUnits,
  defaultDurationUnit,
  onStateChange,
  validationErrors,
  filterItemsByName,
}: HybridDoseFormProps) {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const inputSize = isTablet ? 'md' : 'sm';

  const updateState = useCallback(
    (updates: Partial<HybridDosingState>) => {
      onStateChange({ ...state, ...updates });
    },
    [onStateChange, state],
  );

  const updatePhase = useCallback(
    (phaseId: string, updates: Partial<HybridPhase>) => {
      onStateChange({
        ...state,
        phases: state.phases.map((phase) => (phase.id === phaseId ? { ...phase, ...updates } : phase)),
      });
    },
    [onStateChange, state],
  );

  const updateTidDose = useCallback(
    (phaseId: string, slot: keyof VariableTidDoses, dose: number | null) => {
      onStateChange({
        ...state,
        phases: state.phases.map((phase) =>
          phase.id === phaseId ? { ...phase, tidDoses: { ...phase.tidDoses, [slot]: dose } } : phase,
        ),
      });
    },
    [onStateChange, state],
  );

  const updateQ6hDose = useCallback(
    (phaseId: string, slot: keyof VariableQ6hDoses, dose: number | null) => {
      onStateChange({
        ...state,
        phases: state.phases.map((phase) =>
          phase.id === phaseId ? { ...phase, q6hDoses: { ...phase.q6hDoses, [slot]: dose } } : phase,
        ),
      });
    },
    [onStateChange, state],
  );

  const handleAddPhase = useCallback(() => {
    onStateChange({
      ...state,
      phases: [...state.phases, createEmptyHybridPhase(defaultDurationUnit)],
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

  const unitSuffix = state.unit?.value ? ` ${state.unit.value}` : '';

  return (
    <>
      <Grid className={formStyles.gridRow}>
        <Column lg={16} md={4} sm={4}>
          <InputWrapper>
            <ComboBox<MedicationRoute>
              id="hybridRoute"
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
              id="hybridDoseUnit"
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
              <span className={styles.phaseTitle}>{t('hybridPhase', 'Phase {{number}}', { number: index + 1 })}</span>
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
              <Column lg={8} md={2} sm={4} className={formStyles.linkedInput}>
                <InputWrapper>
                  <NumberInput
                    allowEmpty
                    disableWheel
                    id={`hybridDuration-${phase.id}`}
                    invalid={Boolean(phaseErrors?.duration)}
                    invalidText={phaseErrors?.duration}
                    label={t('duration', 'Duration')}
                    min={0}
                    onChange={(_, { value }) => updatePhase(phase.id, { duration: parseDoseValue(value) })}
                    size={inputSize}
                    step={1}
                    value={typeof phase.duration === 'number' ? phase.duration : ''}
                  />
                </InputWrapper>
              </Column>
              <Column className={formStyles.durationUnit} lg={8} md={2} sm={4}>
                <InputWrapper>
                  <ComboBox<DurationUnit>
                    id={`hybridDurationUnit-${phase.id}`}
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
            <div className={styles.patternSelector}>
              <RadioButtonGroup
                legendText={t('variablePattern', 'Pattern')}
                name={`hybridPattern-${phase.id}`}
                orientation="horizontal"
                valueSelected={phase.pattern}
                onChange={(selection) => {
                  if (selection === 'tid' || selection === 'q6h') {
                    updatePhase(phase.id, { pattern: selection as VariablePattern });
                  }
                }}>
                <RadioButton
                  id={`hybridPatternTid-${phase.id}`}
                  labelText={t('variablePatternTid', '3 times daily (TID)')}
                  value="tid"
                />
                <RadioButton
                  id={`hybridPatternQ6h-${phase.id}`}
                  labelText={t('variablePatternQ6h', '4 times daily (Q6H)')}
                  value="q6h"
                />
              </RadioButtonGroup>
            </div>
            <span className={styles.scheduleLabel}>{t('variableDoseSchedule', 'Dose schedule')}</span>
            {phase.pattern === 'tid' ? (
              <Grid className={formStyles.gridRow}>
                <Column lg={16} md={4} sm={4}>
                  <InputWrapper>
                    <div className={formStyles.numberInput}>
                      <NumberInput
                        allowEmpty
                        disableWheel
                        hideSteppers
                        id={`hybridMorning-${phase.id}`}
                        invalid={Boolean(phaseErrors?.slots?.morning?.dose)}
                        invalidText={phaseErrors?.slots?.morning?.dose}
                        label={t('variableDoseMorning', 'Morning{{unitSuffix}}', { unitSuffix })}
                        min={0.01}
                        onChange={(_, { value }) => updateTidDose(phase.id, 'morning', parseDoseValue(value))}
                        size={inputSize}
                        step={0.01}
                        value={typeof phase.tidDoses.morning === 'number' ? phase.tidDoses.morning : ''}
                      />
                    </div>
                  </InputWrapper>
                </Column>
                <Column lg={16} md={4} sm={4}>
                  <InputWrapper>
                    <div className={formStyles.numberInput}>
                      <NumberInput
                        allowEmpty
                        disableWheel
                        hideSteppers
                        id={`hybridNoon-${phase.id}`}
                        invalid={Boolean(phaseErrors?.slots?.noon?.dose)}
                        invalidText={phaseErrors?.slots?.noon?.dose}
                        label={t('variableDoseNoon', 'Noon{{unitSuffix}}', { unitSuffix })}
                        min={0.01}
                        onChange={(_, { value }) => updateTidDose(phase.id, 'noon', parseDoseValue(value))}
                        size={inputSize}
                        step={0.01}
                        value={typeof phase.tidDoses.noon === 'number' ? phase.tidDoses.noon : ''}
                      />
                    </div>
                  </InputWrapper>
                </Column>
                <Column lg={16} md={4} sm={4}>
                  <InputWrapper>
                    <div className={formStyles.numberInput}>
                      <NumberInput
                        allowEmpty
                        disableWheel
                        hideSteppers
                        id={`hybridEvening-${phase.id}`}
                        invalid={Boolean(phaseErrors?.slots?.evening?.dose)}
                        invalidText={phaseErrors?.slots?.evening?.dose}
                        label={t('variableDoseEvening', 'Evening{{unitSuffix}}', { unitSuffix })}
                        min={0.01}
                        onChange={(_, { value }) => updateTidDose(phase.id, 'evening', parseDoseValue(value))}
                        size={inputSize}
                        step={0.01}
                        value={typeof phase.tidDoses.evening === 'number' ? phase.tidDoses.evening : ''}
                      />
                    </div>
                  </InputWrapper>
                </Column>
              </Grid>
            ) : (
              <Grid className={formStyles.gridRow}>
                <Column lg={8} md={4} sm={4}>
                  <InputWrapper>
                    <div className={formStyles.numberInput}>
                      <NumberInput
                        allowEmpty
                        disableWheel
                        hideSteppers
                        id={`hybrid0600-${phase.id}`}
                        invalid={Boolean(phaseErrors?.slots?.at0600?.dose)}
                        invalidText={phaseErrors?.slots?.at0600?.dose}
                        label={t('variableDose0600', '06:00{{unitSuffix}}', { unitSuffix })}
                        min={0.01}
                        onChange={(_, { value }) => updateQ6hDose(phase.id, 'at0600', parseDoseValue(value))}
                        size={inputSize}
                        step={0.01}
                        value={typeof phase.q6hDoses.at0600 === 'number' ? phase.q6hDoses.at0600 : ''}
                      />
                    </div>
                  </InputWrapper>
                </Column>
                <Column lg={8} md={4} sm={4}>
                  <InputWrapper>
                    <div className={formStyles.numberInput}>
                      <NumberInput
                        allowEmpty
                        disableWheel
                        hideSteppers
                        id={`hybrid1200-${phase.id}`}
                        invalid={Boolean(phaseErrors?.slots?.at1200?.dose)}
                        invalidText={phaseErrors?.slots?.at1200?.dose}
                        label={t('variableDose1200', '12:00{{unitSuffix}}', { unitSuffix })}
                        min={0.01}
                        onChange={(_, { value }) => updateQ6hDose(phase.id, 'at1200', parseDoseValue(value))}
                        size={inputSize}
                        step={0.01}
                        value={typeof phase.q6hDoses.at1200 === 'number' ? phase.q6hDoses.at1200 : ''}
                      />
                    </div>
                  </InputWrapper>
                </Column>
                <Column lg={8} md={4} sm={4}>
                  <InputWrapper>
                    <div className={formStyles.numberInput}>
                      <NumberInput
                        allowEmpty
                        disableWheel
                        hideSteppers
                        id={`hybrid1800-${phase.id}`}
                        invalid={Boolean(phaseErrors?.slots?.at1800?.dose)}
                        invalidText={phaseErrors?.slots?.at1800?.dose}
                        label={t('variableDose1800', '18:00{{unitSuffix}}', { unitSuffix })}
                        min={0.01}
                        onChange={(_, { value }) => updateQ6hDose(phase.id, 'at1800', parseDoseValue(value))}
                        size={inputSize}
                        step={0.01}
                        value={typeof phase.q6hDoses.at1800 === 'number' ? phase.q6hDoses.at1800 : ''}
                      />
                    </div>
                  </InputWrapper>
                </Column>
                <Column lg={8} md={4} sm={4}>
                  <InputWrapper>
                    <div className={formStyles.numberInput}>
                      <NumberInput
                        allowEmpty
                        disableWheel
                        hideSteppers
                        id={`hybrid0000-${phase.id}`}
                        invalid={Boolean(phaseErrors?.slots?.at0000?.dose)}
                        invalidText={phaseErrors?.slots?.at0000?.dose}
                        label={t('variableDose0000', '00:00{{unitSuffix}}', { unitSuffix })}
                        min={0.01}
                        onChange={(_, { value }) => updateQ6hDose(phase.id, 'at0000', parseDoseValue(value))}
                        size={inputSize}
                        step={0.01}
                        value={typeof phase.q6hDoses.at0000 === 'number' ? phase.q6hDoses.at0000 : ''}
                      />
                    </div>
                  </InputWrapper>
                </Column>
              </Grid>
            )}
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

export default HybridDoseForm;
