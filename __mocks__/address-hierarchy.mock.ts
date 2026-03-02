import type {
  AddressTemplate,
  AddressProperties,
} from '../packages/esm-patient-registration-app/src/patient-registration/patient-registration.types';

// Simple address template with three token fields used in tests
export const mockedAddressTemplate: AddressTemplate = {
  displayName: 'Test Address Template',
  codeName: 'testAddressTemplate',
  country: 'TestCountry',
  lines: [
    [
      {
        isToken: 'IS_ADDR_TOKEN',
        displayText: 'Country',
        codeName: 'country',
      },
      {
        isToken: 'IS_ADDR_TOKEN',
        displayText: 'State / Province',
        codeName: 'stateProvince',
      },
    ],
    [
      {
        isToken: 'IS_ADDR_TOKEN',
        displayText: 'City / Village',
        codeName: 'cityVillage',
      },
    ],
  ],
  lineByLineFormat: null,
  nameMappings: null,
  sizeMappings: null,
  elementDefaults: null,
  elementRegex: null,
  elementRegexFormats: null,
  requiredElements: ['country'] as AddressProperties[],
};

// Desired order of address fields returned by useOrderedAddressHierarchyLevels
export const mockedOrderedFields: AddressProperties[] = ['country', 'stateProvince', 'cityVillage'];

// Example full-address strings returned by useAddressHierarchy
export const mockedAddressOptions: Array<string> = [
  'Nea City > Central Province > TestCountry',
  'Other City > Other Province > TestCountry',
];
