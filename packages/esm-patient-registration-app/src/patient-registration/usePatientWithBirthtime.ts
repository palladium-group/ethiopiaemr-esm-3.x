import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { fhirBaseUrl, openmrsFetch, restBaseUrl, type FetchResponse } from '@openmrs/esm-framework';
import { BIRTHTIME_EXTENSION_URL } from './useBirthtime';

export type NullablePatient = fhir.Patient | null;

function getPatientUuidFromUrl() {
  const match = /\/patient\/([a-zA-Z0-9\-]+)\/?/.exec(location.pathname);
  return match && match[1];
}

/**
 * Custom hook that fetches a patient with birthtime included.
 * Makes direct FHIR API call and merges birthtime from REST API.
 * Returns the same interface as usePatient but with birthtime included in the patient object.
 */
export function usePatientWithBirthtime(patientUuid?: string) {
  const [currentPatientUuid, setCurrentPatientUuid] = useState(patientUuid ?? getPatientUuidFromUrl());

  // Fetch FHIR Patient directly with _summary=data
  const {
    data: fhirPatientResponse,
    error: fhirError,
    isValidating: isValidatingFhir,
  } = useSWR<FetchResponse<fhir.Patient>, Error>(
    currentPatientUuid ? `${fhirBaseUrl}/Patient/${currentPatientUuid}?_summary=data` : null,
    openmrsFetch,
  );

  const fhirPatient = fhirPatientResponse?.data || null;

  // Fetch REST Patient with birthtime included - need full person representation
  const {
    data: restPatient,
    error: restError,
    isLoading: isLoadingRest,
  } = useSWR<FetchResponse<{ person: { birthtime?: string; uuid: string } }>>(
    currentPatientUuid
      ? `${restBaseUrl}/patient/${currentPatientUuid}?v=custom:(uuid,person:(uuid,birthdate,birthtime))`
      : null,
    openmrsFetch,
  );

  // Handle route updates
  useEffect(() => {
    if (patientUuid !== undefined) {
      return; // Don't listen to route if patientUuid is explicitly provided
    }

    const handleRouteUpdate = () => {
      const newPatientUuid = getPatientUuidFromUrl();
      if (newPatientUuid !== currentPatientUuid) {
        setCurrentPatientUuid(newPatientUuid);
      }
    };

    window.addEventListener('single-spa:routing-event', handleRouteUpdate);
    return () => window.removeEventListener('single-spa:routing-event', handleRouteUpdate);
  }, [currentPatientUuid, patientUuid]);

  // Merge birthtime from REST API into FHIR Patient
  const patientWithBirthtime = useMemo(() => {
    if (!fhirPatient) {
      return null;
    }

    // Try multiple paths to get birthtime from REST API response
    const birthtime =
      restPatient?.data?.person?.birthtime ||
      (restPatient?.data as any)?.birthtime ||
      (restPatient?.data as any)?.person?.attributes?.find(
        (attr: any) => attr.attributeType?.name === 'Birth Time' || attr.attributeType?.display === 'Birth Time',
      )?.value;

    if (birthtime) {
      // Add birthtime as an extension to the FHIR Patient
      const patientWithExtension = {
        ...fhirPatient,
        extension: [
          ...(fhirPatient.extension || []),
          {
            url: BIRTHTIME_EXTENSION_URL,
            valueDateTime: birthtime,
          },
        ],
        // Also add as a custom property for easier access
        _birthtime: birthtime,
      } as fhir.Patient & { _birthtime?: string };

      return patientWithExtension;
    }

    return fhirPatient;
  }, [fhirPatient, restPatient?.data]);

  return useMemo(
    () => ({
      isLoading: (isValidatingFhir && !fhirError && !fhirPatient) || isLoadingRest,
      patient: patientWithBirthtime,
      patientUuid: currentPatientUuid,
      error: fhirError || restError,
    }),
    [isValidatingFhir, fhirError, fhirPatient, isLoadingRest, patientWithBirthtime, currentPatientUuid, restError],
  );
}
