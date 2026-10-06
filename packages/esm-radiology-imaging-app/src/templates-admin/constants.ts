import { restBaseUrl } from '@openmrs/esm-framework';
import { moduleName } from '../dashboard.meta';

export { moduleName };

export const radiologyTemplatesAdminBasePath = `${window.spaBase}/radiology-templates-admin`;

export const RADIOLOGY_TEMPLATE_ADMIN_WORKSPACE = 'radiology-template-admin-workspace';

export const RADIOLOGY_TEMPLATE_ADMIN_CONTEXT_KEY = 'radiology-templates-admin';

export const radiologyReportTemplatesUrl = `${restBaseUrl}/ethiopiaemrcore/radiologyreporttemplate`;

export const radiologyReportTemplatesSwrKey = 'radiology-report-templates';
