import { Type } from '@openmrs/esm-framework';

export const configSchema = {
  enabled: {
    _type: Type.Boolean,
    _default: true,
    _description: 'Enable appointment capacity quota warnings.',
  },
  warnThresholdPercent: {
    _type: Type.Number,
    _default: 80,
    _description: 'Show a warning when booked capacity reaches this percentage of the applicable limit.',
  },
  countStatuses: {
    _type: Type.Array,
    _elements: {
      _type: Type.String,
    },
    _default: ['Scheduled', 'CheckedIn', 'Completed'],
    _description:
      'Appointment statuses that count toward capacity (informational; backend load APIs define actual counts).',
  },
};

export interface ConfigObject {
  enabled: boolean;
  warnThresholdPercent: number;
  countStatuses: Array<string>;
}
