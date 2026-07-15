import { useMemo } from 'react';
import useSWR from 'swr';
import {
  fetchElectiveSurgerySchedule,
  getElectiveSurgeryScheduleSwrKey,
} from '../api/elective-surgery-schedule.resource';
import { groupSchedulesByCategory, matchesScheduleSearch } from '../utils/patient-identifiers.utils';
import type { ElectiveSurgeryScheduleItem } from '../types/elective-surgery-schedule.types';

export function useElectiveSurgerySchedule(showRemoved: boolean, searchTerm = '') {
  const swrKey = getElectiveSurgeryScheduleSwrKey(showRemoved);

  const { data, error, isLoading, isValidating, mutate } = useSWR(swrKey, () =>
    fetchElectiveSurgerySchedule({ showRemoved }),
  );

  const filteredSchedules = useMemo(() => {
    const schedules = data ?? [];
    if (!searchTerm.trim()) {
      return schedules;
    }
    return schedules.filter((item) => matchesScheduleSearch(item, searchTerm));
  }, [data, searchTerm]);

  const schedulesByCategory = useMemo(() => groupSchedulesByCategory(filteredSchedules), [filteredSchedules]);

  return {
    schedules: filteredSchedules as Array<ElectiveSurgeryScheduleItem>,
    schedulesByCategory,
    error,
    isLoading,
    isValidating,
    mutateSchedule: mutate,
  };
}
