import React, { type ChangeEvent, useCallback, useEffect } from 'react';
import { ContentSwitcher, Layer, SelectItem, Switch, TextInput, TimePicker, TimePickerSelect } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { useField } from 'formik';
import { OpenmrsDatePicker, useConfig } from '@openmrs/esm-framework';
import { usePatientRegistrationContext } from '../../patient-registration-context';
import { type RegistrationConfig } from '../../../config-schema';
import { useBirthtime } from '../../useBirthtime';
import styles from '../field.scss';

const calcBirthdate = (yearDelta, monthDelta, dateOfBirth) => {
  const { enabled, month, dayOfMonth } = dateOfBirth.useEstimatedDateOfBirth;
  const startDate = new Date();
  const resultMonth = new Date(startDate.getFullYear() - yearDelta, startDate.getMonth() - monthDelta, 1);
  const daysInResultMonth = new Date(resultMonth.getFullYear(), resultMonth.getMonth() + 1, 0).getDate();
  const resultDate = new Date(
    resultMonth.getFullYear(),
    resultMonth.getMonth(),
    Math.min(startDate.getDate(), daysInResultMonth),
  );
  return enabled ? new Date(resultDate.getFullYear(), month, dayOfMonth) : resultDate;
};

export const DobField: React.FC = () => {
  const { t } = useTranslation();
  const {
    fieldConfigurations: { dateOfBirth },
  } = useConfig<RegistrationConfig>();
  const allowEstimatedBirthDate = dateOfBirth?.allowEstimatedDateOfBirth;
  const [{ value: dobUnknown }] = useField('birthdateEstimated');
  const [birthdate, birthdateMeta] = useField('birthdate');
  const [yearsEstimated, yearsEstimateMeta] = useField('yearsEstimated');
  const [monthsEstimated, monthsEstimateMeta] = useField('monthsEstimated');
  const { setFieldValue, setFieldTouched, isEmpiDemographicsLocked } = usePatientRegistrationContext();
  const today = new Date();

  // Use birthtime hook
  const {
    birthTimeField,
    birthTimeMeta,
    birthTimeFormatField,
    getTimeStringFromBirthTime,
    getFormatFromBirthTime,
    onBirthTimeChange,
    onBirthTimeFormatChange,
    onBirthTimeBlur,
    initializeBirthtime,
  } = useBirthtime(birthdate.value);

  // Initialize birthtime when birthdate changes
  useEffect(() => {
    initializeBirthtime();
  }, [birthdate.value, initializeBirthtime]);

  const onToggle = useCallback(
    (e: { name?: string | number }) => {
      if (isEmpiDemographicsLocked) {
        return;
      }
      setFieldValue('birthdateEstimated', e.name === 'unknown');
      setFieldValue('birthdate', '');
      setFieldValue('birthtime', undefined);
      setFieldValue('birthtimeFormat', 'AM');
      setFieldValue('yearsEstimated', 0);
      setFieldValue('monthsEstimated', '');
      setFieldTouched('birthdateEstimated', true, false);
      setFieldTouched('birthtime', false, false); // Don't show validation error when clearing
    },
    [isEmpiDemographicsLocked, setFieldTouched, setFieldValue],
  );

  const onDateChange = useCallback(
    (birthdate: Date) => {
      if (isEmpiDemographicsLocked) {
        return;
      }
      setFieldValue('birthdate', birthdate);
      setFieldTouched('birthdate', true, false);
    },
    [isEmpiDemographicsLocked, setFieldValue, setFieldTouched],
  );

  const onEstimatedYearsChange = useCallback(
    (ev: ChangeEvent<HTMLInputElement>) => {
      if (isEmpiDemographicsLocked) {
        return;
      }
      const years = +ev.target.value;

      if (!isNaN(years) && years < 140 && years >= 0) {
        setFieldValue('yearsEstimated', years);
        setFieldValue('birthdate', calcBirthdate(years, monthsEstimateMeta.value, dateOfBirth));
      }
    },
    [isEmpiDemographicsLocked, setFieldValue, dateOfBirth, monthsEstimateMeta.value],
  );

  const onEstimatedMonthsChange = useCallback(
    (ev: ChangeEvent<HTMLInputElement>) => {
      if (isEmpiDemographicsLocked) {
        return;
      }
      const months = +ev.target.value;

      if (!isNaN(months)) {
        setFieldValue('monthsEstimated', months);
        setFieldValue('birthdate', calcBirthdate(yearsEstimateMeta.value, months, dateOfBirth));
      }
    },
    [isEmpiDemographicsLocked, setFieldValue, dateOfBirth, yearsEstimateMeta.value],
  );

  const updateBirthdate = useCallback(() => {
    if (isEmpiDemographicsLocked) {
      return;
    }
    const months = +monthsEstimateMeta.value % 12;
    const years = +yearsEstimateMeta.value + Math.floor(monthsEstimateMeta.value / 12);
    setFieldValue('yearsEstimated', years);
    setFieldValue('monthsEstimated', months > 0 ? months : '');
    setFieldValue('birthdate', calcBirthdate(years, months, dateOfBirth));
    setFieldTouched('yearsEstimated', true, false);
    setFieldTouched('monthsEstimated', true, false);
    setFieldTouched('birthdate', true, false);
  }, [isEmpiDemographicsLocked, setFieldValue, setFieldTouched, monthsEstimateMeta, yearsEstimateMeta, dateOfBirth]);

  return (
    <div className={styles.halfWidthInDesktopView}>
      <h4 className={styles.productiveHeading02Light}>{t('birthFieldLabelText', 'Birth')}</h4>
      {(allowEstimatedBirthDate || dobUnknown) && (
        <div className={styles.dobField}>
          <div className={styles.dobContentSwitcherLabel}>
            <span className={styles.label01}>{t('dobToggleLabelText', 'Date of birth known?')}</span>
          </div>
          <ContentSwitcher size="md" onChange={onToggle} selectedIndex={dobUnknown ? 1 : 0}>
            <Switch name="known" disabled={isEmpiDemographicsLocked}>
              {t('yes', 'Yes')}
            </Switch>
            <Switch name="unknown" disabled={isEmpiDemographicsLocked}>
              {t('no', 'No')}
            </Switch>
          </ContentSwitcher>
        </div>
      )}
      <Layer>
        {!dobUnknown ? (
          <div className={styles.dobField}>
            <div className={styles.grid}>
              <div>
                <OpenmrsDatePicker
                  id="birthdate"
                  data-testid="birthdate"
                  {...birthdate}
                  onChange={onDateChange}
                  onBlur={() => setFieldTouched('birthdate', true, false)}
                  maxDate={today}
                  labelText={t('dateOfBirthLabelText', 'Date of birth')}
                  isInvalid={!!(birthdateMeta.touched && birthdateMeta.error)}
                  invalidText={t(birthdateMeta.error)}
                  value={birthdate.value}
                  isDisabled={isEmpiDemographicsLocked}
                />
              </div>
              <Layer>
                <TimePicker
                  id="birth-time-picker"
                  labelText={t('timeOfBirthInputLabel', 'Time of birth (hh:mm)')}
                  className={styles.timeOfDeathField}
                  pattern="^(1[0-2]|0?[1-9]):([0-5]?[0-9])$"
                  value={getTimeStringFromBirthTime()}
                  onChange={onBirthTimeChange}
                  onBlur={onBirthTimeBlur}
                  disabled={isEmpiDemographicsLocked || !birthdate.value}
                  invalid={!!(birthTimeMeta.touched && birthTimeMeta.error)}
                  invalidText={birthTimeMeta.touched && birthTimeMeta.error ? t(birthTimeMeta.error) : ''}>
                  <TimePickerSelect
                    id="birth-time-format-picker"
                    aria-label={t('timeFormat', 'Time Format')}
                    value={getFormatFromBirthTime()}
                    onChange={onBirthTimeFormatChange}
                    disabled={isEmpiDemographicsLocked || !birthdate.value}>
                    <SelectItem value="AM" text="AM" />
                    <SelectItem value="PM" text="PM" />
                  </TimePickerSelect>
                </TimePicker>
              </Layer>
            </div>
          </div>
        ) : (
          <div className={styles.grid}>
            <div className={styles.dobField}>
              <TextInput
                id="yearsEstimated"
                type="number"
                name={yearsEstimated.name}
                onChange={onEstimatedYearsChange}
                labelText={t('estimatedAgeInYearsLabelText', 'Estimated age in years')}
                invalid={!!(yearsEstimateMeta.touched && yearsEstimateMeta.error)}
                invalidText={yearsEstimateMeta.error && t(yearsEstimateMeta.error)}
                value={yearsEstimated.value}
                min={0}
                required
                {...yearsEstimated}
                disabled={isEmpiDemographicsLocked}
                onBlur={(e) => {
                  yearsEstimated.onBlur(e);
                  setFieldTouched('yearsEstimated', true, false);
                  updateBirthdate();
                }}
              />
            </div>
            <div className={styles.dobField}>
              <TextInput
                id="monthsEstimated"
                type="number"
                name={monthsEstimated.name}
                onChange={onEstimatedMonthsChange}
                labelText={t('estimatedAgeInMonthsLabelText', 'Estimated age in months')}
                invalid={!!(monthsEstimateMeta.touched && monthsEstimateMeta.error)}
                invalidText={monthsEstimateMeta.error && t(monthsEstimateMeta.error)}
                value={monthsEstimated.value}
                min={0}
                {...monthsEstimated}
                required={!yearsEstimateMeta.value}
                disabled={isEmpiDemographicsLocked}
                onBlur={(e) => {
                  monthsEstimated.onBlur(e);
                  setFieldTouched('monthsEstimated', true, false);
                  updateBirthdate();
                }}
              />
            </div>
          </div>
        )}
      </Layer>
    </div>
  );
};
