import type { ElectiveSurgeryScheduleItem } from '../types/elective-surgery-schedule.types';

export function getPatientIdentifier(item: ElectiveSurgeryScheduleItem): string {
  const identifiers = item.patient?.identifiers;
  if (!identifiers?.length) {
    return '--';
  }

  const healthId = identifiers.find((id) => id.type?.display?.toLowerCase().includes('health'));
  if (healthId?.identifier) {
    return healthId.identifier;
  }

  const openMrsId = identifiers.find((id) => id.type?.display?.toLowerCase().includes('openmrs'));
  if (openMrsId?.identifier) {
    return openMrsId.identifier;
  }

  return identifiers[0]?.identifier ?? '--';
}

export function matchesScheduleSearch(item: ElectiveSurgeryScheduleItem, searchTerm: string): boolean {
  const normalizedSearch = searchTerm.trim().toLowerCase();
  if (!normalizedSearch) {
    return true;
  }

  const patientName = item.patient?.display?.toLowerCase() ?? '';
  const identifier = getPatientIdentifier(item).toLowerCase();

  return patientName.includes(normalizedSearch) || identifier.includes(normalizedSearch);
}

export function groupSchedulesByCategory(
  schedules: Array<ElectiveSurgeryScheduleItem>,
): Record<'A' | 'B' | 'C', Array<ElectiveSurgeryScheduleItem>> {
  return {
    A: schedules.filter((item) => item.currentCategory === 'A'),
    B: schedules.filter((item) => item.currentCategory === 'B'),
    C: schedules.filter((item) => item.currentCategory === 'C'),
  };
}
