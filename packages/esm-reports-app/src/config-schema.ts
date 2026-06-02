import { Type } from '@openmrs/esm-framework';

/**
 * The reportingrest REST API serialises each result row as a JSON object whose
 * key order is not guaranteed to match the SQL SELECT order, so the columns can
 * come out alphabetical. For the reports listed in `columnOrderByUuid` we render
 * columns in the configured fixed order (matching the source paper layout); any
 * columns present in the data but not listed are appended afterwards.
 *
 * `hiddenDatasets` lists dataset names that exist only to feed an Excel template
 * and should not be shown in the on-screen table.
 *
 * Both are exposed through the O3 config system so the order can be tuned per
 * implementation without rebuilding the frontend.
 */
export const configSchema = {
  columnOrderByUuid: {
    _type: Type.Object,
    _description:
      'Map of report definition UUID -> ordered array of column names. Columns are rendered in this order; unlisted columns are appended.',
    _default: {
      'c7e1d4a8-3f2b-4c6e-9a51-2d8f7b0e4a93': [
        'S.N',
        'Infant MRN',
        'Name of infant',
        'Date of Birth (DD/MM/YY)',
        'Sex (M/F)',
        'Name of mother',
        'Mother MRN',
        'Woreda',
        'Kebele',
        'Gott',
        'House Number',
        'Reg. Date (DD/MM/YY)',
        'BCG (DD/MM/YY)',
        'OPV 0',
        'OPV 1',
        'OPV 2',
        'OPV 3',
        'Hep Birth dose within 24 hrs',
        'Hep Birth dose after 24 hrs',
        'DPT-HepB-Hib 1 (DD/MM/YY)',
        'DPT-HepB-Hib 2 (DD/MM/YY)',
        'DPT-HepB-Hib 3 (DD/MM/YY)',
        'PCV 1 (DD/MM/YY)',
        'PCV 2 (DD/MM/YY)',
        'PCV 3 (DD/MM/YY)',
        'Rota 1 (DD/MM/YY)',
        'Rota 2 (DD/MM/YY)',
        'IPV (DD/MM/YY)',
        'Measles 1 (DD/MM/YY)',
        'Measles 2 (DD/MM/YY)',
        'Fully immunized (V)',
        'No. of Td doses Mother received in last pregnancy',
        'Total No. of Td doses birth Mother received',
        'Protected at Birth (PAB) (V)',
        'Nutritional screening date (DD/MM/YY)',
        'Screened & linked to CINuS (V)',
        'Developmental milestones',
        'Remark/Appointment',
      ],
    },
  },
  hiddenDatasets: {
    _type: Type.Array,
    _elements: { _type: Type.String },
    _description: 'Dataset names that feed an Excel template only and should be hidden from the on-screen table.',
    _default: ['immRegisterExcel'],
  },
};

export interface EthiopiaReportsConfig {
  columnOrderByUuid: Record<string, Array<string>>;
  hiddenDatasets: Array<string>;
}
