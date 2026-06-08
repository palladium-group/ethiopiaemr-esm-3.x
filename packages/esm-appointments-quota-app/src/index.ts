import { defineConfigSchema } from '@openmrs/esm-framework';
import { configSchema } from './config-schema';
import { moduleName } from './constants';

export { evaluateServiceQuota, formatDateKey, getDayOfWeekName, getQuotaLevel } from './quota/quota.helper';
export type { EvaluateServiceQuotaInput } from './quota/quota.helper';
export {
  fetchServiceBlockLoad,
  getServiceDayBookedCount,
  useAppointmentServicesFull,
  useAppointmentSummaryForDate,
  useServiceBlockLoad,
} from './api/quota.resource';

defineConfigSchema(moduleName, configSchema);

export function startupApp() {}
