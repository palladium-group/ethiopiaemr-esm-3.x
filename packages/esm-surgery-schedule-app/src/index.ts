import { defineConfigSchema, getSyncLifecycle } from '@openmrs/esm-framework';
import ElectiveSurgeryScheduleDashboard from './homepage/elective-surgery-schedule-dashboard.component';
import ElectiveSurgeryScheduleDashboardLink from './homepage/elective-surgery-schedule-dashboard-link.extension';
import { configSchema } from './config-schema';
import { moduleName } from './constants';
import RecordElectiveSurgeryContactWorkspace from './workspaces/record-contact.workspace';
import RemoveElectiveSurgeryPatientWorkspace from './workspaces/remove-patient.workspace';
import ReturnFromSurgicalAdmissionWorkspace from './workspaces/return-from-admission.workspace';

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

const options = {
  featureName: 'elective-surgery-schedule',
  moduleName,
};

export function startupApp() {
  defineConfigSchema(moduleName, configSchema);
}

export const electiveSurgeryScheduleDashboardLink = getSyncLifecycle(ElectiveSurgeryScheduleDashboardLink, options);
export const electiveSurgeryScheduleDashboard = getSyncLifecycle(ElectiveSurgeryScheduleDashboard, options);
export const recordElectiveSurgeryContactWorkspace = getSyncLifecycle(RecordElectiveSurgeryContactWorkspace, {
  featureName: 'record-elective-surgery-contact-workspace',
  moduleName,
});
export const removeElectiveSurgeryPatientWorkspace = getSyncLifecycle(RemoveElectiveSurgeryPatientWorkspace, {
  featureName: 'remove-elective-surgery-patient-workspace',
  moduleName,
});
export const returnFromSurgicalAdmissionWorkspace = getSyncLifecycle(ReturnFromSurgicalAdmissionWorkspace, {
  featureName: 'return-from-surgical-admission-workspace',
  moduleName,
});
