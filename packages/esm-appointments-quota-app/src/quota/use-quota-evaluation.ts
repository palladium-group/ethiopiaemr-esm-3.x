import { useEffect, useMemo, useState } from 'react';
import { useConfig } from '@openmrs/esm-framework';
import {
  buildBlockDateTime,
  fetchServiceBlockLoad,
  getServiceDayBookedCount,
  useAppointmentServicesFull,
  useAppointmentSummaryForDate,
} from '../api/quota.resource';
import { type ConfigObject } from '../config-schema';
import { evaluateServiceQuota, findMatchingBlocks, getDayOfWeekName, normalizeTimeToMinutes } from './quota.helper';

export interface UseQuotaEvaluationInput {
  serviceUuid?: string;
  date: Date | null;
  startTime?: string;
  endTime?: string;
  enabled?: boolean;
}

export function useQuotaEvaluation({ serviceUuid, date, startTime, endTime, enabled = true }: UseQuotaEvaluationInput) {
  const { warnThresholdPercent } = useConfig<ConfigObject>();
  const { appointmentServices, isLoading: isLoadingServices, error: servicesError } = useAppointmentServicesFull();
  const { summaries, isLoading: isLoadingSummary, error: summaryError } = useAppointmentSummaryForDate(date);
  const [blockBookedCounts, setBlockBookedCounts] = useState<Record<string, number>>({});
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(false);
  const [blockLoadError, setBlockLoadError] = useState<Error | null>(null);

  const service = useMemo(
    () => appointmentServices.find((appointmentService) => appointmentService.uuid === serviceUuid),
    [appointmentServices, serviceUuid],
  );

  const startMinutes = startTime ? normalizeTimeToMinutes(startTime) : null;
  const endMinutes = endTime ? normalizeTimeToMinutes(endTime) : null;
  const hasValidTimeWindow = startMinutes != null && endMinutes != null && startMinutes < endMinutes;

  useEffect(() => {
    if (!enabled || !service || !date || !hasValidTimeWindow) {
      setBlockBookedCounts({});
      setBlockLoadError(null);
      return;
    }

    const dayOfWeek = getDayOfWeekName(date);
    const matchingBlocks = findMatchingBlocks(service.weeklyAvailability, dayOfWeek, startMinutes, endMinutes).filter(
      (block) => block.uuid && block.maxAppointmentsLimit != null && block.maxAppointmentsLimit > 0,
    );

    if (matchingBlocks.length === 0) {
      setBlockBookedCounts({});
      setBlockLoadError(null);
      return;
    }

    let cancelled = false;
    setIsLoadingBlocks(true);
    setBlockLoadError(null);

    Promise.all(
      matchingBlocks.map(async (block) => {
        const startDateTime = buildBlockDateTime(date, block.startTime);
        const endDateTime = buildBlockDateTime(date, block.endTime);
        const load = await fetchServiceBlockLoad(service.uuid, startDateTime, endDateTime);
        return [block.uuid!, load] as const;
      }),
    )
      .then((entries) => {
        if (!cancelled) {
          setBlockBookedCounts(Object.fromEntries(entries));
        }
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setBlockLoadError(error);
          setBlockBookedCounts({});
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingBlocks(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [date, enabled, endMinutes, hasValidTimeWindow, service, startMinutes]);

  const evaluation = useMemo(() => {
    if (!enabled || !service || !date) {
      return null;
    }

    const dayBookedCount = getServiceDayBookedCount(summaries, service.uuid, date);

    return evaluateServiceQuota({
      service,
      date,
      dayBookedCount,
      warnThresholdPercent,
      appointmentStartMinutes: hasValidTimeWindow ? startMinutes ?? undefined : undefined,
      appointmentEndMinutes: hasValidTimeWindow ? endMinutes ?? undefined : undefined,
      blockBookedCounts,
    });
  }, [
    blockBookedCounts,
    date,
    enabled,
    endMinutes,
    hasValidTimeWindow,
    service,
    startMinutes,
    summaries,
    warnThresholdPercent,
  ]);

  return {
    evaluation,
    service,
    isLoading: isLoadingServices || isLoadingSummary || isLoadingBlocks,
    error: servicesError ?? summaryError ?? blockLoadError,
  };
}
