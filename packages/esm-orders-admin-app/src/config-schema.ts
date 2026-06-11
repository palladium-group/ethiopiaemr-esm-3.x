import { Type } from '@openmrs/esm-framework';

export const configSchema = {
  manageOrderTemplatesPrivilege: {
    _type: Type.String,
    _default: 'Manage OrderTemplates',
    _description: 'Privilege required to access drug order template administration.',
  },
};

export interface ConfigObject {
  manageOrderTemplatesPrivilege: string;
}
