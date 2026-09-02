import { defineConfigSchema, getSyncLifecycle } from '@openmrs/esm-framework';
import { configSchema } from './config-schema';
import { moduleName } from './constants';
import { registerAppointmentQuotaFormSync } from './quota/register-quota-form-sync';
import { registerBookingFormAllDayDefault } from './booking-form/register-all-day-default';
import { mountQuotaOverlay } from './overlay/mount-quota-overlay';

import CheckAvailabilityButtonExtension from './extensions/check-availability-button.extension';
import QuotaBookingFormBootstrap from './extensions/quota-booking-form-bootstrap.extension';

export { evaluateServiceQuota, formatDateKey, getDayOfWeekName, getQuotaLevel } from './quota/quota.helper';
export type { EvaluateServiceQuotaInput } from './quota/quota.helper';
export {
  fetchServiceBlockLoad,
  getServiceDayBookedCount,
  useAppointmentServicesFull,
  useAppointmentSummaryForDate,
  useServiceBlockLoad,
} from './api/quota.resource';

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

defineConfigSchema(moduleName, configSchema);

export function startupApp() {
  registerAppointmentQuotaFormSync();
  registerBookingFormAllDayDefault();
  mountQuotaOverlay();
}

export const checkAvailabilityButton = getSyncLifecycle(CheckAvailabilityButtonExtension, {
  featureName: 'appointments-quota-check-availability-button',
  moduleName,
});

export const quotaBookingFormBootstrap = getSyncLifecycle(QuotaBookingFormBootstrap, {
  featureName: 'appointments-quota-booking-form-bootstrap',
  moduleName,
});
