import { useMemo } from 'react';
import useSWR from 'swr';
import dayjs from 'dayjs';
import { openmrsFetch, restBaseUrl, useConfig, type FetchResponse } from '@openmrs/esm-framework';
import type { ClinicalWorkflowConfig } from '../config-schema';

export interface PatientCardValidity {
  hasValidCard: boolean;
  lastConsultationDate: Date | null;
  cardExpiryDate: Date | null;
  isLoading: boolean;
  error?: Error;
}

interface PersonAttribute {
  uuid: string;
  value: string;
  attributeType?: {
    uuid: string;
    display?: string;
  };
}

export const GP_CARD_VALIDITY_DAYS = 'ethiopiaemrcustommodule.cardValidityDays';

/**
 * Checks whether a patient has a valid consultation card by reading the
 * lastConsultationDate person attribute and comparing it against today's date
 * within the configured validityDays window (supports System Setting override).
 *
 * REST call: GET /openmrs/ws/rest/v1/person/{patientUuid}/attribute?v=custom:(uuid,value,attributeType:(uuid,display))
 */
export function usePatientCardValidity(
  patientUuid?: string | null,
  providedAttributes?: Array<PersonAttribute> | null,
): PatientCardValidity {
  const { cardValidity } = useConfig<ClinicalWorkflowConfig>();
  const lastConsultationDateAttributeTypeUuid = cardValidity?.lastConsultationDateAttributeTypeUuid;
  const configValidityDays = cardValidity?.validityDays ?? 30;

  // Check system setting override from Facility Configurations (cached for 5 minutes)
  const { data: settingData } = useSWR<{
    data: { results: Array<{ uuid: string; property: string; value: string }> };
  }>(`/ws/rest/v1/systemsetting?q=${GP_CARD_VALIDITY_DAYS}&v=custom:(uuid,property,value)`, openmrsFetch, {
    dedupingInterval: 300_000,
    revalidateOnFocus: false,
  });

  const setting = settingData?.data?.results?.find((result) => result.property === GP_CARD_VALIDITY_DAYS);
  let validityDays = configValidityDays;
  if (setting?.value !== undefined && setting.value !== null && setting.value.trim() !== '') {
    const parsed = parseInt(setting.value.trim(), 10);
    if (!isNaN(parsed) && parsed > 0) {
      validityDays = parsed;
    }
  }

  const hasProvidedAttributes = Array.isArray(providedAttributes);
  const shouldFetch = Boolean(patientUuid && lastConsultationDateAttributeTypeUuid && !hasProvidedAttributes);
  const url = shouldFetch
    ? `${restBaseUrl}/person/${patientUuid}/attribute?v=custom:(uuid,value,attributeType:(uuid,display))`
    : null;

  const { data, error, isLoading } = useSWR<FetchResponse<{ results: Array<PersonAttribute> }>, Error>(
    url,
    openmrsFetch,
    {
      dedupingInterval: 30_000,
      revalidateOnFocus: false,
    },
  );

  return useMemo<PatientCardValidity>(() => {
    if (!lastConsultationDateAttributeTypeUuid || validityDays <= 0 || !patientUuid) {
      return {
        hasValidCard: false,
        lastConsultationDate: null,
        cardExpiryDate: null,
        isLoading: false,
        error,
      };
    }

    if (isLoading && !hasProvidedAttributes) {
      return {
        hasValidCard: false,
        lastConsultationDate: null,
        cardExpiryDate: null,
        isLoading: true,
        error,
      };
    }

    const results = hasProvidedAttributes ? providedAttributes! : data?.data?.results ?? [];
    const matchingAttrs = results.filter(
      (attr) => attr.attributeType?.uuid === lastConsultationDateAttributeTypeUuid && Boolean(attr.value),
    );

    if (matchingAttrs.length === 0) {
      return {
        hasValidCard: false,
        lastConsultationDate: null,
        cardExpiryDate: null,
        isLoading: false,
        error,
      };
    }

    // Find the most recent date if multiple attributes exist
    const validDates = matchingAttrs
      .map((attr) => dayjs(attr.value))
      .filter((d) => d.isValid())
      .sort((a, b) => b.valueOf() - a.valueOf());

    if (validDates.length === 0) {
      return {
        hasValidCard: false,
        lastConsultationDate: null,
        cardExpiryDate: null,
        isLoading: false,
        error,
      };
    }

    const latestDate = validDates[0];
    const lastConsultationDate = latestDate.toDate();
    const cardExpiryDate = latestDate.add(validityDays, 'day').toDate();

    const today = dayjs().startOf('day');
    const expiry = dayjs(cardExpiryDate).startOf('day');
    const hasValidCard = today.isBefore(expiry) || today.isSame(expiry, 'day');

    return {
      hasValidCard,
      lastConsultationDate,
      cardExpiryDate,
      isLoading: false,
      error,
    };
  }, [lastConsultationDateAttributeTypeUuid, validityDays, patientUuid, isLoading, data?.data?.results, error]);
}
