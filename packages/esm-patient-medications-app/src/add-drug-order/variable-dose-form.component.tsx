import React, { type ReactNode, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Column, ComboBox, Grid, Layer, NumberInput, RadioButton, RadioButtonGroup } from '@carbon/react';
import { useLayoutType } from '@openmrs/esm-framework';
import type { DosingUnit, MedicationRoute } from '@openmrs/esm-patient-common-lib';
import {
  type VariableDosingState,
  type VariablePattern,
  type VariableQ6hDoses,
  type VariableTidDoses,
  type VariableValidationErrors,
} from './complex-dosing.types';
import formStyles from './drug-order-form.scss';
import styles from './variable-dose-form.scss';

export interface VariableDoseFormProps {
  state: VariableDosingState;
  drugRoutes: Array<MedicationRoute>;
  drugDosingUnits: Array<DosingUnit>;
  onStateChange: (state: VariableDosingState) => void;
  validationErrors?: VariableValidationErrors | null;
  filterItemsByName: (menu: { item?: { value?: string }; inputValue?: string }) => boolean;
}

function InputWrapper({ children }: { children: ReactNode }) {
  const isTablet = useLayoutType() === 'tablet';
  return (
    <Layer level={isTablet ? 1 : 0}>
      <div className={formStyles.field}>{children}</div>
    </Layer>
  );
}

function parseDoseValue(value: string | number): number | null {
  const number = parseFloat(String(value));
  return isNaN(number) ? null : number;
}

export function VariableDoseForm({
  state,
  drugRoutes,
  drugDosingUnits,
  onStateChange,
  validationErrors,
  filterItemsByName,
}: VariableDoseFormProps) {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const inputSize = isTablet ? 'md' : 'sm';

  const updateState = useCallback(
    (updates: Partial<VariableDosingState>) => {
      onStateChange({ ...state, ...updates });
    },
    [onStateChange, state],
  );

  const updateTidDose = useCallback(
    (slot: keyof VariableTidDoses, dose: number | null) => {
      onStateChange({
        ...state,
        tidDoses: { ...state.tidDoses, [slot]: dose },
      });
    },
    [onStateChange, state],
  );

  const updateQ6hDose = useCallback(
    (slot: keyof VariableQ6hDoses, dose: number | null) => {
      onStateChange({
        ...state,
        q6hDoses: { ...state.q6hDoses, [slot]: dose },
      });
    },
    [onStateChange, state],
  );

  const handlePatternChange = useCallback(
    (selection: string | number | undefined) => {
      if (selection === 'tid' || selection === 'q6h') {
        updateState({ pattern: selection as VariablePattern });
      }
    },
    [updateState],
  );

  const unitSuffix = state.unit?.value ? ` ${state.unit.value}` : '';

  return (
    <>
      <Grid className={formStyles.gridRow}>
        <Column lg={16} md={4} sm={4}>
          <InputWrapper>
            <ComboBox<MedicationRoute>
              id="variableRoute"
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
              id="variableDoseUnit"
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

      <div className={styles.patternSelector}>
        <RadioButtonGroup
          legendText={t('variablePattern', 'Pattern')}
          name="variablePattern"
          orientation="horizontal"
          valueSelected={state.pattern}
          onChange={handlePatternChange}>
          <RadioButton id="variablePatternTid" labelText={t('variablePatternTid', '3 times daily (TID)')} value="tid" />
          <RadioButton id="variablePatternQ6h" labelText={t('variablePatternQ6h', '4 times daily (Q6H)')} value="q6h" />
        </RadioButtonGroup>
      </div>

      <div className={styles.scheduleCard}>
        <span className={styles.scheduleTitle}>{t('variableDoseSchedule', 'Dose schedule')}</span>
        {state.pattern === 'tid' ? (
          <Grid className={formStyles.gridRow}>
            <Column lg={16} md={4} sm={4}>
              <InputWrapper>
                <div className={formStyles.numberInput}>
                  <NumberInput
                    allowEmpty
                    disableWheel
                    hideSteppers
                    id="variableDoseMorning"
                    invalid={Boolean(validationErrors?.slots?.morning?.dose)}
                    invalidText={validationErrors?.slots?.morning?.dose}
                    label={t('variableDoseMorning', 'Morning{{unitSuffix}}', { unitSuffix })}
                    min={0.01}
                    onChange={(_, { value }) => updateTidDose('morning', parseDoseValue(value))}
                    size={inputSize}
                    step={0.01}
                    value={typeof state.tidDoses.morning === 'number' ? state.tidDoses.morning : ''}
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
                    id="variableDoseNoon"
                    invalid={Boolean(validationErrors?.slots?.noon?.dose)}
                    invalidText={validationErrors?.slots?.noon?.dose}
                    label={t('variableDoseNoon', 'Noon{{unitSuffix}}', { unitSuffix })}
                    min={0.01}
                    onChange={(_, { value }) => updateTidDose('noon', parseDoseValue(value))}
                    size={inputSize}
                    step={0.01}
                    value={typeof state.tidDoses.noon === 'number' ? state.tidDoses.noon : ''}
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
                    id="variableDoseEvening"
                    invalid={Boolean(validationErrors?.slots?.evening?.dose)}
                    invalidText={validationErrors?.slots?.evening?.dose}
                    label={t('variableDoseEvening', 'Evening{{unitSuffix}}', { unitSuffix })}
                    min={0.01}
                    onChange={(_, { value }) => updateTidDose('evening', parseDoseValue(value))}
                    size={inputSize}
                    step={0.01}
                    value={typeof state.tidDoses.evening === 'number' ? state.tidDoses.evening : ''}
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
                    id="variableDose0600"
                    invalid={Boolean(validationErrors?.slots?.at0600?.dose)}
                    invalidText={validationErrors?.slots?.at0600?.dose}
                    label={t('variableDose0600', '06:00{{unitSuffix}}', { unitSuffix })}
                    min={0.01}
                    onChange={(_, { value }) => updateQ6hDose('at0600', parseDoseValue(value))}
                    size={inputSize}
                    step={0.01}
                    value={typeof state.q6hDoses.at0600 === 'number' ? state.q6hDoses.at0600 : ''}
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
                    id="variableDose1200"
                    invalid={Boolean(validationErrors?.slots?.at1200?.dose)}
                    invalidText={validationErrors?.slots?.at1200?.dose}
                    label={t('variableDose1200', '12:00{{unitSuffix}}', { unitSuffix })}
                    min={0.01}
                    onChange={(_, { value }) => updateQ6hDose('at1200', parseDoseValue(value))}
                    size={inputSize}
                    step={0.01}
                    value={typeof state.q6hDoses.at1200 === 'number' ? state.q6hDoses.at1200 : ''}
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
                    id="variableDose1800"
                    invalid={Boolean(validationErrors?.slots?.at1800?.dose)}
                    invalidText={validationErrors?.slots?.at1800?.dose}
                    label={t('variableDose1800', '18:00{{unitSuffix}}', { unitSuffix })}
                    min={0.01}
                    onChange={(_, { value }) => updateQ6hDose('at1800', parseDoseValue(value))}
                    size={inputSize}
                    step={0.01}
                    value={typeof state.q6hDoses.at1800 === 'number' ? state.q6hDoses.at1800 : ''}
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
                    id="variableDose0000"
                    invalid={Boolean(validationErrors?.slots?.at0000?.dose)}
                    invalidText={validationErrors?.slots?.at0000?.dose}
                    label={t('variableDose0000', '00:00{{unitSuffix}}', { unitSuffix })}
                    min={0.01}
                    onChange={(_, { value }) => updateQ6hDose('at0000', parseDoseValue(value))}
                    size={inputSize}
                    step={0.01}
                    value={typeof state.q6hDoses.at0000 === 'number' ? state.q6hDoses.at0000 : ''}
                  />
                </div>
              </InputWrapper>
            </Column>
          </Grid>
        )}
      </div>
    </>
  );
}

export default VariableDoseForm;
