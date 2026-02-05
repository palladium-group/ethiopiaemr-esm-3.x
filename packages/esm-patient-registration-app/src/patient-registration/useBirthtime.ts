import { useCallback } from 'react';
import { useField } from 'formik';
import dayjs from 'dayjs';
import { toOmrsIsoString } from '@openmrs/esm-framework';
import type { FormValues } from './patient-registration.types';
import { getDatetime } from './patient-registration.resource';
import { usePatientRegistrationContext } from './patient-registration-context';

// Use fhirBaseUrl to construct the extension URL
export const BIRTHTIME_EXTENSION_URL = 'http://openmrs.org/fhir/StructureDefinition/birthtime';

/**
 * Hook to extract birthtime from FHIR Patient extension
 */
export function useBirthtimeFromFhirPatient(patient: fhir.Patient | null | undefined): string | undefined {
  if (!patient) {
    return undefined;
  }

  const birthtimeExtension = patient.extension?.find((ext) => ext.url === BIRTHTIME_EXTENSION_URL);
  const birthtime =
    (patient as fhir.Patient & { _birthtime?: string })._birthtime ||
    (birthtimeExtension?.valueDateTime as string | undefined);

  return birthtime;
}

/**
 * Hook for managing birthtime field logic
 */
export function useBirthtime(birthdate: Date | string | null | undefined) {
  const [birthTimeField, birthTimeMeta] = useField<keyof FormValues>('birthtime');
  const [birthTimeFormatField] = useField<keyof FormValues>('birthtimeFormat');
  const { setFieldValue, setFieldTouched } = usePatientRegistrationContext();

  // Extract time string from birthtime datetime for display in picker
  const getTimeStringFromBirthTime = useCallback(() => {
    if (!birthTimeField.value || typeof birthTimeField.value !== 'string' || !birthTimeField.value.includes('T')) {
      return '12:00';
    }
    const dt = dayjs(birthTimeField.value);
    const hours = dt.hour();
    const minutes = dt.minute();
    // Convert to 12-hour format
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')}`;
  }, [birthTimeField.value]);

  // Extract format (AM/PM) from birthtime datetime
  const getFormatFromBirthTime = useCallback(() => {
    if (!birthTimeField.value || typeof birthTimeField.value !== 'string' || !birthTimeField.value.includes('T')) {
      return 'AM';
    }
    const dt = dayjs(birthTimeField.value);
    return dt.hour() >= 12 ? 'PM' : 'AM';
  }, [birthTimeField.value]);

  // Handle time change - only update value, validation on blur
  const onBirthTimeChange = useCallback(
    (ev: React.ChangeEvent<HTMLInputElement>) => {
      const time = ev.target.value;
      // Just update the display value, don't validate yet
      if (birthdate && time) {
        const datetime = getDatetime(birthdate, time, birthTimeFormatField.value as 'AM' | 'PM');
        setFieldValue('birthtime', toOmrsIsoString(datetime), false); // false = don't validate
      }
    },
    [setFieldValue, birthdate, birthTimeFormatField.value],
  );

  // Handle time format change
  const onBirthTimeFormatChange = useCallback(
    (ev: React.ChangeEvent<HTMLSelectElement>) => {
      const format = ev.target.value as 'AM' | 'PM';
      setFieldValue('birthtimeFormat', format);
      const timeString = getTimeStringFromBirthTime();
      if (birthdate && timeString) {
        const datetime = getDatetime(birthdate, timeString, format);
        setFieldValue('birthtime', toOmrsIsoString(datetime), false); // false = don't validate
      }
    },
    [setFieldValue, birthdate, getTimeStringFromBirthTime],
  );

  // Handle blur - validate after user finishes typing
  const onBirthTimeBlur = useCallback(() => {
    setFieldTouched('birthtime', true, false);
  }, [setFieldTouched]);

  // Initialize birthtime to 12:00 AM when birthdate is set
  const initializeBirthtime = useCallback(() => {
    if (birthdate && !birthTimeField.value) {
      const defaultDateTime = getDatetime(birthdate, '12:00', 'AM');
      setFieldValue('birthtime', toOmrsIsoString(defaultDateTime), false); // false = don't validate
      setFieldValue('birthtimeFormat', 'AM', false); // false = don't validate
    } else if (!birthdate) {
      setFieldValue('birthtime', undefined, false); // false = don't validate
      setFieldValue('birthtimeFormat', 'AM', false); // false = don't validate
      // Reset touched state when clearing birthdate
      setFieldTouched('birthtime', false, false);
    }
  }, [birthdate, birthTimeField.value, setFieldValue, setFieldTouched]);

  return {
    birthTimeField,
    birthTimeMeta,
    birthTimeFormatField,
    getTimeStringFromBirthTime,
    getFormatFromBirthTime,
    onBirthTimeChange,
    onBirthTimeFormatChange,
    onBirthTimeBlur,
    initializeBirthtime,
  };
}
