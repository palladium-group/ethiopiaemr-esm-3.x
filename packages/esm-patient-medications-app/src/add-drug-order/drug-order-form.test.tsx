import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { getDefaultsFromConfigSchema, useConfig, useSession } from '@openmrs/esm-framework';
import { type DrugOrderBasketItem, type OrderTemplate } from '@openmrs/esm-patient-common-lib';
import { mockPatient } from 'tools';
import { mockDrugSearchResultApiData, mockSessionDataResponse } from '__mocks__';
import { configSchema, type ConfigObject } from '../config-schema';
import { useRequireOutpatientQuantity } from '../api/api';
import { useOrderConfig } from '../api/order-config';
import { getTemplateOrderBasketItem } from './drug-search/drug-search.resource';
import DrugOrderForm from './drug-order-form.component';

const mockUseConfig = jest.mocked(useConfig<ConfigObject>);
const mockUseSession = jest.mocked(useSession);
const mockUseOrderConfig = jest.mocked(useOrderConfig);

const defaultOrderConfig = {
  orderConfigObject: {
    drugRoutes: [{ valueCoded: '160240AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Oral' }],
    drugDosingUnits: [{ valueCoded: '1513AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Tablet' }],
    drugDispensingUnits: [
      { valueCoded: '1513AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Tablet' },
      { valueCoded: '162376AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Application' },
    ],
    durationUnits: [
      { valueCoded: '1072AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Days' },
      { valueCoded: '1073AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Weeks' },
    ],
    orderFrequencies: [
      { valueCoded: 'once-daily-uuid', value: 'Once daily', frequencyPerDay: 1.0, names: ['OD', 'Once daily'] },
      { valueCoded: 'twice-daily-uuid', value: 'Twice daily', frequencyPerDay: 2.0, names: ['BD', 'Twice daily'] },
    ],
  },
  isLoading: false,
  error: null,
};

mockUseConfig.mockReturnValue(getDefaultsFromConfigSchema(configSchema) as ConfigObject);
mockUseSession.mockReturnValue(mockSessionDataResponse.data);

jest.mock('../api/order-config', () => ({
  useOrderConfig: jest.fn(),
}));

mockUseOrderConfig.mockReturnValue(defaultOrderConfig);

jest.mock('../api/api', () => ({
  ...jest.requireActual('../api/api'),
  useActivePatientOrders: jest.fn().mockReturnValue({ isLoading: false, data: [] }),
  useRequireOutpatientQuantity: jest
    .fn()
    .mockReturnValue({ requireOutpatientQuantity: true, error: null, isLoading: false }),
}));

function renderDrugOrderForm(initialOrderBasketItem: DrugOrderBasketItem) {
  return render(
    <DrugOrderForm
      initialOrderBasketItem={initialOrderBasketItem}
      patient={mockPatient}
      visitContext={null}
      onSave={jest.fn()}
      saveButtonText="Save order"
      onCancel={jest.fn()}
      workspaceTitle="Add drug order"
    />,
  );
}

function createNewOrderBasketItem(overrides?: Partial<DrugOrderBasketItem>): DrugOrderBasketItem {
  const base = getTemplateOrderBasketItem(mockDrugSearchResultApiData[0], null);
  return {
    ...base,
    pillsDispensed: null,
    quantityUnits: null,
    ...overrides,
  } as DrugOrderBasketItem;
}

describe('DrugOrderForm - dose unit defaults', () => {
  it('keeps the dosage form as the dose unit when it is configured as a valid dosing unit', async () => {
    renderDrugOrderForm(createNewOrderBasketItem());

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /dose unit/i })).toHaveValue('Tablet');
    });
  });

  it('clears the dose unit when the drug dosage form is not a configured dosing unit', async () => {
    const invalidDosageForm = {
      display: 'Solution (Ear Drop)',
      uuid: 'solution-ear-drop-uuid',
    };
    const invalidDoseUnit = {
      value: invalidDosageForm.display,
      valueCoded: invalidDosageForm.uuid,
    };
    const base = createNewOrderBasketItem();

    renderDrugOrderForm(
      createNewOrderBasketItem({
        drug: {
          ...base.drug,
          dosageForm: invalidDosageForm,
        },
        unit: invalidDoseUnit,
      }),
    );

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /dose unit/i })).toHaveValue('');
    });
  });

  it('clears the quantity unit when the drug dosage form is not a configured dispensing unit', async () => {
    const invalidDosageForm = {
      display: 'Solution (Ear Drop)',
      uuid: 'solution-ear-drop-uuid',
    };
    const invalidQuantityUnit = {
      value: invalidDosageForm.display,
      valueCoded: invalidDosageForm.uuid,
    };
    const base = createNewOrderBasketItem();

    renderDrugOrderForm(
      createNewOrderBasketItem({
        drug: {
          ...base.drug,
          dosageForm: invalidDosageForm,
        },
        quantityUnits: invalidQuantityUnit,
      }),
    );

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /quantity unit/i })).toHaveValue('');
    });
  });

  it('clears quantity unit when template has no quantity guidance and unit is invalid', async () => {
    const invalidQuantityUnit = {
      value: 'Solution (Ear Drop)',
      valueCoded: 'solution-ear-drop-uuid',
    };
    const templateWithoutQuantityGuidance: OrderTemplate = {
      type: 'https://schema.openmrs.org/order/template/drug/simple/v1',
      dosingType: 'org.openmrs.SimpleDosingInstructions',
      dosingInstructions: {
        dose: [{ value: 1, default: true }],
        units: [],
        route: [{ value: 'oral', valueCoded: '160240AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', default: true }],
        frequency: [{ value: 'once daily', valueCoded: 'once-daily-uuid', default: true }],
      },
    };

    renderDrugOrderForm(
      createNewOrderBasketItem({
        template: templateWithoutQuantityGuidance,
        quantityUnits: invalidQuantityUnit,
      }),
    );

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /quantity unit/i })).toHaveValue('');
    });
  });

  it('keeps template-derived quantity unit when it matches the template dose unit', async () => {
    const mgUnit = { value: 'mg', valueCoded: '161553AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' };
    const templateWithDoseUnits = {
      type: 'https://schema.openmrs.org/order/template/drug/simple/v1',
      dosingType: 'org.openmrs.SimpleDosingInstructions',
      dosingInstructions: {
        dose: [{ value: 500, default: true }],
        units: [],
        unit: [{ value: 'mg', valueCoded: '161553AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', default: true }],
        route: [{ value: 'oral', valueCoded: '160240AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', default: true }],
        frequency: [{ value: 'once daily', valueCoded: 'once-daily-uuid', default: true }],
      },
    } as OrderTemplate;

    renderDrugOrderForm(
      createNewOrderBasketItem({
        template: templateWithDoseUnits,
        unit: mgUnit,
        quantityUnits: mgUnit,
      }),
    );

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /quantity unit/i })).toHaveValue('mg');
    });
  });
});

describe('DrugOrderForm - template-constrained dose units', () => {
  const expandedOrderConfig = {
    orderConfigObject: {
      ...defaultOrderConfig.orderConfigObject,
      drugDosingUnits: [
        { valueCoded: '1513AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Tablet' },
        { valueCoded: '161553AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'mg' },
        { valueCoded: 'mL-uuid', value: 'mL' },
      ],
    },
    isLoading: false,
    error: null,
  };

  const baseTemplateDosingInstructions = {
    dose: [{ value: 1, default: true }],
    units: [],
    route: [{ value: 'oral', valueCoded: '160240AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', default: true }],
    frequency: [{ value: 'once daily', valueCoded: 'once-daily-uuid', default: true }],
  };

  const templateWithUnits = {
    type: 'https://schema.openmrs.org/order/template/drug/simple/v1',
    dosingType: 'org.openmrs.SimpleDosingInstructions',
    dosingInstructions: {
      ...baseTemplateDosingInstructions,
      unit: [
        { value: 'tab', valueCoded: '1513AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', default: true },
        { value: 'mg', valueCoded: '161553AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      ],
    },
  } as OrderTemplate;

  const templateWithoutUnits: OrderTemplate = {
    type: 'https://schema.openmrs.org/order/template/drug/simple/v1',
    dosingType: 'org.openmrs.SimpleDosingInstructions',
    dosingInstructions: baseTemplateDosingInstructions,
  };

  beforeEach(() => {
    mockUseOrderConfig.mockReturnValue(expandedOrderConfig);
  });

  afterEach(() => {
    mockUseOrderConfig.mockReturnValue(defaultOrderConfig);
  });

  it('shows only template-defined dose units when the order has a template unit list', async () => {
    const user = userEvent.setup();

    renderDrugOrderForm(
      createNewOrderBasketItem({
        template: templateWithUnits,
        unit: { value: 'tab', valueCoded: '1513AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      }),
    );

    await user.click(screen.getByRole('combobox', { name: /dose unit/i }));

    expect(screen.getByText('tab')).toBeInTheDocument();
    expect(screen.getByText('mg')).toBeInTheDocument();
    expect(screen.queryByText('mL')).not.toBeInTheDocument();
    expect(screen.queryByText('Tablet')).not.toBeInTheDocument();
  });

  it('shows all configured dose units when the order has no template', async () => {
    const user = userEvent.setup();

    renderDrugOrderForm(createNewOrderBasketItem());

    await user.click(screen.getByRole('combobox', { name: /dose unit/i }));

    expect(screen.getByText('Tablet')).toBeInTheDocument();
    expect(screen.getByText('mg')).toBeInTheDocument();
    expect(screen.getByText('mL')).toBeInTheDocument();
  });

  it('shows all configured dose units when the template has no unit list', async () => {
    const user = userEvent.setup();

    renderDrugOrderForm(
      createNewOrderBasketItem({
        template: templateWithoutUnits,
      }),
    );

    await user.click(screen.getByRole('combobox', { name: /dose unit/i }));

    expect(screen.getByText('Tablet')).toBeInTheDocument();
    expect(screen.getByText('mg')).toBeInTheDocument();
    expect(screen.getByText('mL')).toBeInTheDocument();
  });
});

describe('DrugOrderForm - auto-calculation of dispense quantity', () => {
  it('auto-calculates quantity when dose, frequency, and duration are filled', async () => {
    const user = userEvent.setup();
    renderDrugOrderForm(createNewOrderBasketItem());

    const doseInput = screen.getByRole('spinbutton', { name: /dose/i });
    await user.clear(doseInput);
    await user.type(doseInput, '1');

    const frequencyCombobox = screen.getByRole('combobox', { name: /frequency/i });
    await user.click(frequencyCombobox);
    await user.click(screen.getByText('Twice daily'));

    const durationInput = screen.getByRole('spinbutton', { name: /duration/i });
    await user.clear(durationInput);
    await user.type(durationInput, '7');

    const durationUnitCombobox = screen.getByRole('combobox', { name: /duration unit/i });
    await user.click(durationUnitCombobox);
    await user.click(screen.getByText('Days'));

    await waitFor(() => {
      const quantityInput = screen.getByRole('spinbutton', { name: /quantity to dispense/i });
      expect(quantityInput).toHaveValue(14);
    });
    expect(screen.getByText(/auto-calculated/i)).toBeInTheDocument();
  });

  it('auto-calculates with weekly duration units', async () => {
    const user = userEvent.setup();
    renderDrugOrderForm(createNewOrderBasketItem());

    const doseInput = screen.getByRole('spinbutton', { name: /dose/i });
    await user.clear(doseInput);
    await user.type(doseInput, '3');

    const frequencyCombobox = screen.getByRole('combobox', { name: /frequency/i });
    await user.click(frequencyCombobox);
    await user.click(screen.getByText('Twice daily'));

    const durationInput = screen.getByRole('spinbutton', { name: /duration/i });
    await user.clear(durationInput);
    await user.type(durationInput, '1');

    const durationUnitCombobox = screen.getByRole('combobox', { name: /duration unit/i });
    await user.click(durationUnitCombobox);
    await user.click(screen.getByText('Weeks'));

    // 3 × 2.0 × 7 = 42
    await waitFor(() => {
      const quantityInput = screen.getByRole('spinbutton', { name: /quantity to dispense/i });
      expect(quantityInput).toHaveValue(42);
    });
  });

  it('clears quantity when a required input is removed', async () => {
    const user = userEvent.setup();
    renderDrugOrderForm(createNewOrderBasketItem());

    // Fill all inputs
    const doseInput = screen.getByRole('spinbutton', { name: /dose/i });
    await user.clear(doseInput);
    await user.type(doseInput, '1');

    const frequencyCombobox = screen.getByRole('combobox', { name: /frequency/i });
    await user.click(frequencyCombobox);
    await user.click(screen.getByText('Twice daily'));

    const durationInput = screen.getByRole('spinbutton', { name: /duration/i });
    await user.clear(durationInput);
    await user.type(durationInput, '7');

    const durationUnitCombobox = screen.getByRole('combobox', { name: /duration unit/i });
    await user.click(durationUnitCombobox);
    await user.click(screen.getByText('Days'));

    await waitFor(() => {
      expect(screen.getByRole('spinbutton', { name: /quantity to dispense/i })).toHaveValue(14);
    });

    // Clear the duration
    await user.clear(durationInput);

    await waitFor(() => {
      expect(screen.getByRole('spinbutton', { name: /quantity to dispense/i })).not.toHaveValue();
    });
  });

  it('does not auto-calculate when PRN is checked', async () => {
    const user = userEvent.setup();
    renderDrugOrderForm(createNewOrderBasketItem());

    // Fill all inputs
    const doseInput = screen.getByRole('spinbutton', { name: /dose/i });
    await user.clear(doseInput);
    await user.type(doseInput, '1');

    const frequencyCombobox = screen.getByRole('combobox', { name: /frequency/i });
    await user.click(frequencyCombobox);
    await user.click(screen.getByText('Twice daily'));

    const durationInput = screen.getByRole('spinbutton', { name: /duration/i });
    await user.clear(durationInput);
    await user.type(durationInput, '7');

    const durationUnitCombobox = screen.getByRole('combobox', { name: /duration unit/i });
    await user.click(durationUnitCombobox);
    await user.click(screen.getByText('Days'));

    await waitFor(() => {
      expect(screen.getByRole('spinbutton', { name: /quantity to dispense/i })).toHaveValue(14);
    });

    // Check PRN
    const prnCheckbox = screen.getByRole('checkbox', { name: /take as needed/i });
    await user.click(prnCheckbox);

    await waitFor(() => {
      expect(screen.getByRole('spinbutton', { name: /quantity to dispense/i })).not.toHaveValue();
    });
    expect(screen.queryByText(/auto-calculated/i)).not.toBeInTheDocument();
  });

  it('does not auto-calculate for free-text dosage', async () => {
    const user = userEvent.setup();
    renderDrugOrderForm(createNewOrderBasketItem());

    // Toggle free-text dosage ON
    const freeTextToggle = screen.getByRole('switch', { name: /free text dosage/i });
    await user.click(freeTextToggle);

    // The quantity input should remain empty
    const quantityInput = screen.getByRole('spinbutton', { name: /quantity to dispense/i });
    expect(quantityInput).not.toHaveValue();
    expect(screen.queryByText(/auto-calculated/i)).not.toBeInTheDocument();
  });

  it('does not auto-calculate when quantity unit differs from dose unit', async () => {
    const user = userEvent.setup();
    renderDrugOrderForm(createNewOrderBasketItem());

    // Fill all inputs
    const doseInput = screen.getByRole('spinbutton', { name: /dose/i });
    await user.clear(doseInput);
    await user.type(doseInput, '1');

    const frequencyCombobox = screen.getByRole('combobox', { name: /frequency/i });
    await user.click(frequencyCombobox);
    await user.click(screen.getByText('Twice daily'));

    const durationInput = screen.getByRole('spinbutton', { name: /duration/i });
    await user.clear(durationInput);
    await user.type(durationInput, '7');

    const durationUnitCombobox = screen.getByRole('combobox', { name: /duration unit/i });
    await user.click(durationUnitCombobox);
    await user.click(screen.getByText('Days'));

    await waitFor(() => {
      expect(screen.getByRole('spinbutton', { name: /quantity to dispense/i })).toHaveValue(14);
    });

    // Change quantity unit to something different from dose unit (Tablet)
    const quantityUnitCombobox = screen.getByRole('combobox', { name: /quantity unit/i });
    await user.clear(quantityUnitCombobox);
    await user.type(quantityUnitCombobox, 'Application');
    await user.click(screen.getByText('Application'));

    await waitFor(() => {
      expect(screen.getByRole('spinbutton', { name: /quantity to dispense/i })).not.toHaveValue();
    });
  });

  it('stops auto-calculating after manual edit and shows recalculate link', async () => {
    const user = userEvent.setup();
    renderDrugOrderForm(createNewOrderBasketItem());

    // Fill all inputs to trigger auto-calc
    const doseInput = screen.getByRole('spinbutton', { name: /dose/i });
    await user.clear(doseInput);
    await user.type(doseInput, '1');

    const frequencyCombobox = screen.getByRole('combobox', { name: /frequency/i });
    await user.click(frequencyCombobox);
    await user.click(screen.getByText('Twice daily'));

    const durationInput = screen.getByRole('spinbutton', { name: /duration/i });
    await user.clear(durationInput);
    await user.type(durationInput, '7');

    const durationUnitCombobox = screen.getByRole('combobox', { name: /duration unit/i });
    await user.click(durationUnitCombobox);
    await user.click(screen.getByText('Days'));

    const quantityInput = screen.getByRole('spinbutton', { name: /quantity to dispense/i });
    await waitFor(() => {
      expect(quantityInput).toHaveValue(14);
    });

    // Manually edit quantity
    await user.clear(quantityInput);
    await user.type(quantityInput, '20');

    await waitFor(() => {
      expect(quantityInput).toHaveValue(20);
    });
    expect(screen.queryByText(/auto-calculated/i)).not.toBeInTheDocument();
    expect(screen.getByText(/apply calculated quantity \(14\)/i)).toBeInTheDocument();
  });

  it('keeps manual override when upstream inputs change', async () => {
    const user = userEvent.setup();
    renderDrugOrderForm(createNewOrderBasketItem());

    // Fill all inputs
    const doseInput = screen.getByRole('spinbutton', { name: /dose/i });
    await user.clear(doseInput);
    await user.type(doseInput, '1');

    const frequencyCombobox = screen.getByRole('combobox', { name: /frequency/i });
    await user.click(frequencyCombobox);
    await user.click(screen.getByText('Twice daily'));

    const durationInput = screen.getByRole('spinbutton', { name: /duration/i });
    await user.clear(durationInput);
    await user.type(durationInput, '7');

    const durationUnitCombobox = screen.getByRole('combobox', { name: /duration unit/i });
    await user.click(durationUnitCombobox);
    await user.click(screen.getByText('Days'));

    const quantityInput = screen.getByRole('spinbutton', { name: /quantity to dispense/i });
    await waitFor(() => {
      expect(quantityInput).toHaveValue(14);
    });

    // Manual edit
    await user.clear(quantityInput);
    await user.type(quantityInput, '20');

    await waitFor(() => {
      expect(quantityInput).toHaveValue(20);
    });

    // Change duration — manual value should be preserved, recalculate link should update
    await user.clear(durationInput);
    await user.type(durationInput, '14');

    // Quantity stays at 20 (manual override is sticky)
    await waitFor(() => {
      expect(quantityInput).toHaveValue(20);
    });
    // Recalculate link shows the would-be value: 1 × 2.0 × 14 = 28
    expect(screen.getByText(/apply calculated quantity \(28\)/i)).toBeInTheDocument();
  });

  it('resumes auto-calculation when recalculate link is clicked', async () => {
    const user = userEvent.setup();
    renderDrugOrderForm(createNewOrderBasketItem());

    // Fill all inputs
    const doseInput = screen.getByRole('spinbutton', { name: /dose/i });
    await user.clear(doseInput);
    await user.type(doseInput, '1');

    const frequencyCombobox = screen.getByRole('combobox', { name: /frequency/i });
    await user.click(frequencyCombobox);
    await user.click(screen.getByText('Twice daily'));

    const durationInput = screen.getByRole('spinbutton', { name: /duration/i });
    await user.clear(durationInput);
    await user.type(durationInput, '7');

    const durationUnitCombobox = screen.getByRole('combobox', { name: /duration unit/i });
    await user.click(durationUnitCombobox);
    await user.click(screen.getByText('Days'));

    const quantityInput = screen.getByRole('spinbutton', { name: /quantity to dispense/i });
    await waitFor(() => {
      expect(quantityInput).toHaveValue(14);
    });

    // Manual edit
    await user.clear(quantityInput);
    await user.type(quantityInput, '20');

    await waitFor(() => {
      expect(quantityInput).toHaveValue(20);
    });

    // Click recalculate
    await user.click(screen.getByText(/apply calculated quantity \(14\)/i));

    await waitFor(() => {
      expect(quantityInput).toHaveValue(14);
    });
    expect(screen.getByText(/auto-calculated/i)).toBeInTheDocument();
    expect(screen.queryByText(/apply calculated quantity/i)).not.toBeInTheDocument();
  });

  it('keeps manual override when quantity field is cleared', async () => {
    const user = userEvent.setup();
    renderDrugOrderForm(createNewOrderBasketItem());

    // Fill all inputs
    const doseInput = screen.getByRole('spinbutton', { name: /dose/i });
    await user.clear(doseInput);
    await user.type(doseInput, '1');

    const frequencyCombobox = screen.getByRole('combobox', { name: /frequency/i });
    await user.click(frequencyCombobox);
    await user.click(screen.getByText('Twice daily'));

    const durationInput = screen.getByRole('spinbutton', { name: /duration/i });
    await user.clear(durationInput);
    await user.type(durationInput, '7');

    const durationUnitCombobox = screen.getByRole('combobox', { name: /duration unit/i });
    await user.click(durationUnitCombobox);
    await user.click(screen.getByText('Days'));

    const quantityInput = screen.getByRole('spinbutton', { name: /quantity to dispense/i });
    await waitFor(() => {
      expect(quantityInput).toHaveValue(14);
    });

    // Manual edit
    await user.clear(quantityInput);
    await user.type(quantityInput, '20');

    await waitFor(() => {
      expect(quantityInput).toHaveValue(20);
    });

    // Clear the quantity field — should stay empty (manual override is sticky)
    await user.clear(quantityInput);

    await waitFor(() => {
      expect(quantityInput).toHaveValue(null);
    });
    expect(screen.getByText(/apply calculated quantity \(14\)/i)).toBeInTheDocument();
  });

  it('stays in auto mode when reopening a NEW basket item with auto-calculated quantity', async () => {
    const user = userEvent.setup();
    // Simulate reopening a saved NEW order that had auto-calculated quantity
    const item = createNewOrderBasketItem({
      pillsDispensed: 14,
      isQuantityManual: false,
      dosage: 1,
      frequency: {
        valueCoded: 'twice-daily-uuid',
        value: 'Twice daily',
        frequencyPerDay: 2.0,
      },
      duration: 7,
      durationUnit: { valueCoded: '1072AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Days' },
    });
    renderDrugOrderForm(item);

    const quantityInput = screen.getByRole('spinbutton', { name: /quantity to dispense/i });
    expect(quantityInput).toHaveValue(14);
    expect(screen.getByText(/auto-calculated/i)).toBeInTheDocument();

    // Changing duration should auto-update quantity (not show recalculate link)
    const durationInput = screen.getByRole('spinbutton', { name: /duration/i });
    await user.clear(durationInput);
    await user.type(durationInput, '14');

    // 1 × 2.0 × 14 = 28
    await waitFor(() => {
      expect(quantityInput).toHaveValue(28);
    });
    expect(screen.getByText(/auto-calculated/i)).toBeInTheDocument();
    expect(screen.queryByText(/apply calculated quantity/i)).not.toBeInTheDocument();
  });

  it('preserves quantity for REVISE orders when frequencyPerDay is null', async () => {
    const item = createNewOrderBasketItem({
      action: 'REVISE',
      pillsDispensed: 30,
      frequency: {
        valueCoded: 'some-frequency-uuid',
        value: 'Once daily',
        frequencyPerDay: null,
      },
      dosage: 1,
      unit: { valueCoded: '1513AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Tablet' },
      duration: 30,
      durationUnit: { valueCoded: '1072AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Days' },
      quantityUnits: { valueCoded: '1513AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Tablet' },
    });

    renderDrugOrderForm(item);

    // Quantity is preserved from the existing order — the effect returns early for
    // REVISE orders with null frequencyPerDay
    await waitFor(() => {
      expect(screen.getByRole('spinbutton', { name: /quantity to dispense/i })).toHaveValue(30);
    });
    expect(screen.queryByText(/auto-calculated/i)).not.toBeInTheDocument();
  });

  it('shows recalculate link for REVISE orders after re-selecting frequency with frequencyPerDay', async () => {
    const user = userEvent.setup();
    const item = createNewOrderBasketItem({
      action: 'REVISE',
      pillsDispensed: 30,
      frequency: {
        valueCoded: 'some-frequency-uuid',
        value: 'Once daily',
        frequencyPerDay: null,
      },
      dosage: 1,
      unit: { valueCoded: '1513AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Tablet' },
      duration: 7,
      durationUnit: { valueCoded: '1072AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Days' },
      quantityUnits: { valueCoded: '1513AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Tablet' },
    });

    renderDrugOrderForm(item);

    await waitFor(() => {
      expect(screen.getByRole('spinbutton', { name: /quantity to dispense/i })).toHaveValue(30);
    });

    // Re-select a frequency that has frequencyPerDay — clear first so all options appear
    const frequencyCombobox = screen.getByRole('combobox', { name: /frequency/i });
    await user.clear(frequencyCombobox);
    await user.click(screen.getByText('Twice daily'));

    // Quantity is preserved — manual override is sticky for REVISE orders.
    // Recalculate link shows the would-be value: 1 × 2.0 × 7 = 14
    await waitFor(() => {
      expect(screen.getByRole('spinbutton', { name: /quantity to dispense/i })).toHaveValue(30);
    });
    expect(screen.getByText(/apply calculated quantity \(14\)/i)).toBeInTheDocument();

    // Clicking recalculate applies the calculated value
    await user.click(screen.getByText(/apply calculated quantity \(14\)/i));

    await waitFor(() => {
      expect(screen.getByRole('spinbutton', { name: /quantity to dispense/i })).toHaveValue(14);
    });
    expect(screen.getByText(/auto-calculated/i)).toBeInTheDocument();
  });

  it('does not auto-calculate when requireOutpatientQuantity is false', async () => {
    const user = userEvent.setup();
    (useRequireOutpatientQuantity as jest.Mock).mockReturnValue({
      requireOutpatientQuantity: false,
      error: null,
      isLoading: false,
    });
    renderDrugOrderForm(createNewOrderBasketItem());

    const doseInput = screen.getByRole('spinbutton', { name: /dose/i });
    await user.clear(doseInput);
    await user.type(doseInput, '1');

    const frequencyCombobox = screen.getByRole('combobox', { name: /frequency/i });
    await user.click(frequencyCombobox);
    await user.click(screen.getByText('Twice daily'));

    const durationInput = screen.getByRole('spinbutton', { name: /duration/i });
    await user.clear(durationInput);
    await user.type(durationInput, '7');

    const durationUnitCombobox = screen.getByRole('combobox', { name: /duration unit/i });
    await user.click(durationUnitCombobox);
    await user.click(screen.getByText('Days'));

    const quantityInput = screen.getByRole('spinbutton', { name: /quantity to dispense/i });
    // Quantity should remain empty — auto-calc is disabled
    await waitFor(() => {
      expect(quantityInput).not.toHaveValue();
    });
    expect(screen.queryByText(/auto-calculated/i)).not.toBeInTheDocument();

    // Restore default mock
    (useRequireOutpatientQuantity as jest.Mock).mockReturnValue({
      requireOutpatientQuantity: true,
      error: null,
      isLoading: false,
    });
  });

  it('auto-sets quantity unit to match dose unit when quantity unit is empty', async () => {
    const user = userEvent.setup();
    renderDrugOrderForm(createNewOrderBasketItem());

    const doseInput = screen.getByRole('spinbutton', { name: /dose/i });
    await user.clear(doseInput);
    await user.type(doseInput, '1');

    const frequencyCombobox = screen.getByRole('combobox', { name: /frequency/i });
    await user.click(frequencyCombobox);
    await user.click(screen.getByText('Twice daily'));

    const durationInput = screen.getByRole('spinbutton', { name: /duration/i });
    await user.clear(durationInput);
    await user.type(durationInput, '7');

    const durationUnitCombobox = screen.getByRole('combobox', { name: /duration unit/i });
    await user.click(durationUnitCombobox);
    await user.click(screen.getByText('Days'));

    // The quantity unit should auto-fill to match the dose unit (Tablet)
    await waitFor(() => {
      const quantityUnitCombobox = screen.getByRole('combobox', { name: /quantity unit/i });
      expect(quantityUnitCombobox).toHaveValue('Tablet');
    });
  });
});

describe('DrugOrderForm - tapering quantity auto-calculation', () => {
  it('auto-calculates quantity from tapering phases', async () => {
    const user = userEvent.setup();
    renderDrugOrderForm(
      createNewOrderBasketItem({
        dosage: 1,
        unit: { valueCoded: '1513AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Tablet' },
        route: { valueCoded: '160240AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Oral' },
        frequency: {
          valueCoded: 'once-daily-uuid',
          value: 'Once daily',
          frequencyPerDay: 1.0,
        },
        duration: 7,
        durationUnit: { valueCoded: '1072AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Days' },
        pillsDispensed: null,
        quantityUnits: null,
        numRefills: 0,
        indication: 'Hypertension',
      }),
    );

    await user.click(screen.getByRole('tab', { name: /tapering/i }));

    const taperingUnitCombobox = screen.getByRole('combobox', { name: /dose unit/i });
    await user.click(taperingUnitCombobox);
    await user.click(screen.getByText('Tablet'));

    const doseInput = screen.getByRole('spinbutton', { name: /^dose$/i });
    await user.clear(doseInput);
    await user.type(doseInput, '40');

    const frequencyCombobox = screen.getByRole('combobox', { name: /^frequency$/i });
    await user.click(frequencyCombobox);
    await user.click(screen.getByText('Once daily'));

    const durationInput = screen.getByRole('spinbutton', { name: /^duration$/i });
    await user.clear(durationInput);
    await user.type(durationInput, '7');

    const durationUnitCombobox = screen.getByRole('combobox', { name: /duration unit/i });
    await user.click(durationUnitCombobox);
    await user.click(screen.getByText('Days'));

    const quantityInput = screen.getByRole('spinbutton', { name: /quantity to dispense/i });
    await waitFor(() => {
      expect(quantityInput).toHaveValue(280);
    });
    expect(screen.getByText(/auto-calculated/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /add phase/i }));

    const phaseDoseInputs = screen.getAllByRole('spinbutton', { name: /^dose$/i });
    await user.clear(phaseDoseInputs[1]);
    await user.type(phaseDoseInputs[1], '20');

    const phaseFrequencyComboboxes = screen.getAllByRole('combobox', { name: /^frequency$/i });
    await user.click(phaseFrequencyComboboxes[1]);
    await user.click(screen.getByText('Once daily'));

    const phaseDurationInputs = screen.getAllByRole('spinbutton', { name: /^duration$/i });
    await user.clear(phaseDurationInputs[1]);
    await user.type(phaseDurationInputs[1], '7');

    const phaseDurationUnitComboboxes = screen.getAllByRole('combobox', { name: /duration unit/i });
    await user.click(phaseDurationUnitComboboxes[1]);
    await user.click(screen.getByText('Days'));

    await waitFor(() => {
      expect(quantityInput).toHaveValue(420);
    });
  });
});

describe('DrugOrderForm - tapering dosage serialization', () => {
  it('saves tapering phases as freeTextDosage on submit', async () => {
    const user = userEvent.setup();
    const onSave = jest.fn().mockResolvedValue(undefined);
    const item = createNewOrderBasketItem({
      dosage: 1,
      unit: { valueCoded: '1513AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Tablet' },
      route: { valueCoded: '160240AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Oral' },
      frequency: {
        valueCoded: 'once-daily-uuid',
        value: 'Once daily',
        frequencyPerDay: 1.0,
      },
      duration: 7,
      durationUnit: { valueCoded: '1072AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Days' },
      pillsDispensed: 14,
      quantityUnits: { valueCoded: '1513AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Tablet' },
      numRefills: 0,
      indication: 'Hypertension',
    });

    render(
      <DrugOrderForm
        initialOrderBasketItem={item}
        patient={mockPatient}
        visitContext={null}
        onSave={onSave}
        saveButtonText="Save order"
        onCancel={jest.fn()}
        workspaceTitle="Add drug order"
      />,
    );

    await user.click(screen.getByRole('tab', { name: /tapering/i }));

    const taperingRouteCombobox = screen.getByRole('combobox', { name: /^route$/i });
    await user.click(taperingRouteCombobox);
    await user.click(screen.getByText('Oral'));

    const taperingUnitCombobox = screen.getByRole('combobox', { name: /dose unit/i });
    await user.click(taperingUnitCombobox);
    await user.click(screen.getByText('Tablet'));

    const doseInput = screen.getByRole('spinbutton', { name: /^dose$/i });
    await user.clear(doseInput);
    await user.type(doseInput, '40');

    const frequencyCombobox = screen.getByRole('combobox', { name: /^frequency$/i });
    await user.click(frequencyCombobox);
    await user.click(screen.getByText('Once daily'));

    const durationInput = screen.getByRole('spinbutton', { name: /^duration$/i });
    await user.clear(durationInput);
    await user.type(durationInput, '7');

    const durationUnitCombobox = screen.getByRole('combobox', { name: /duration unit/i });
    await user.click(durationUnitCombobox);
    await user.click(screen.getByText('Days'));

    await waitFor(() => {
      expect(screen.getByText(/phase 1: 40tablet, once daily, 7 days/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /save order/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          isFreeTextDosage: true,
          freeTextDosage: 'Phase 1: 40Tablet, Once daily, 7 Days',
          dosage: null,
          unit: null,
          frequency: null,
          route: expect.objectContaining({ value: 'Oral' }),
          duration: 7,
          durationUnit: expect.objectContaining({ value: 'Days' }),
        }),
      );
    });
  });
});

describe('DrugOrderForm - tapering validation', () => {
  it('blocks save and shows errors when tapering fields are incomplete', async () => {
    const user = userEvent.setup();
    const onSave = jest.fn().mockResolvedValue(undefined);

    render(
      <DrugOrderForm
        initialOrderBasketItem={createNewOrderBasketItem({
          indication: 'Hypertension',
          numRefills: 0,
        })}
        patient={mockPatient}
        visitContext={null}
        onSave={onSave}
        saveButtonText="Save order"
        onCancel={jest.fn()}
        workspaceTitle="Add drug order"
      />,
    );

    await user.click(screen.getByRole('tab', { name: /tapering/i }));
    await user.click(screen.getByRole('button', { name: /save order/i }));

    await waitFor(() => {
      expect(screen.getByText(/incomplete tapering regimen/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/dosage is required/i)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('allows save after all tapering fields are completed', async () => {
    const user = userEvent.setup();
    const onSave = jest.fn().mockResolvedValue(undefined);

    render(
      <DrugOrderForm
        initialOrderBasketItem={createNewOrderBasketItem({
          indication: 'Hypertension',
          numRefills: 0,
          pillsDispensed: null,
          quantityUnits: null,
        })}
        patient={mockPatient}
        visitContext={null}
        onSave={onSave}
        saveButtonText="Save order"
        onCancel={jest.fn()}
        workspaceTitle="Add drug order"
      />,
    );

    await user.click(screen.getByRole('tab', { name: /tapering/i }));

    await user.click(screen.getByRole('combobox', { name: /^route$/i }));
    await user.click(screen.getByText('Oral'));

    await user.click(screen.getByRole('combobox', { name: /dose unit/i }));
    await user.click(screen.getByText('Tablet'));

    const doseInput = screen.getByRole('spinbutton', { name: /^dose$/i });
    await user.clear(doseInput);
    await user.type(doseInput, '40');

    await user.click(screen.getByRole('combobox', { name: /^frequency$/i }));
    await user.click(screen.getByText('Once daily'));

    const durationInput = screen.getByRole('spinbutton', { name: /^duration$/i });
    await user.clear(durationInput);
    await user.type(durationInput, '7');

    await user.click(screen.getByRole('combobox', { name: /duration unit/i }));
    await user.click(screen.getByText('Days'));

    await user.click(screen.getByRole('button', { name: /save order/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalled();
    });
    expect(screen.queryByText(/incomplete tapering regimen/i)).not.toBeInTheDocument();
  });
});

describe('DrugOrderForm - variable quantity auto-calculation', () => {
  it('auto-calculates quantity from variable TID doses and prescription duration', async () => {
    const user = userEvent.setup();
    renderDrugOrderForm(
      createNewOrderBasketItem({
        dosage: 1,
        unit: { valueCoded: '1513AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Tablet' },
        route: { valueCoded: '160240AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Oral' },
        frequency: {
          valueCoded: 'once-daily-uuid',
          value: 'Once daily',
          frequencyPerDay: 1.0,
        },
        duration: 30,
        durationUnit: { valueCoded: '1072AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Days' },
        pillsDispensed: null,
        quantityUnits: null,
        numRefills: 0,
        indication: 'Diabetes',
      }),
    );

    await user.click(screen.getByRole('tab', { name: /variable/i }));

    const variableUnitCombobox = screen.getByRole('combobox', { name: /dose unit/i });
    await user.click(variableUnitCombobox);
    await user.click(screen.getByText('Tablet'));

    await user.clear(screen.getByLabelText(/morning/i));
    await user.type(screen.getByLabelText(/morning/i), '12');
    await user.clear(screen.getByLabelText(/noon/i));
    await user.type(screen.getByLabelText(/noon/i), '8');
    await user.clear(screen.getByLabelText(/evening/i));
    await user.type(screen.getByLabelText(/evening/i), '10');

    const quantityInput = screen.getByRole('spinbutton', { name: /quantity to dispense/i });
    await waitFor(() => {
      expect(quantityInput).toHaveValue(900);
    });
    expect(screen.getByText(/auto-calculated/i)).toBeInTheDocument();
  });
});

describe('DrugOrderForm - variable dosage serialization', () => {
  it('saves variable TID doses as freeTextDosage on submit', async () => {
    const user = userEvent.setup();
    const onSave = jest.fn().mockResolvedValue(undefined);
    const item = createNewOrderBasketItem({
      dosage: 1,
      unit: { valueCoded: '1513AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Tablet' },
      route: { valueCoded: '160240AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Oral' },
      frequency: {
        valueCoded: 'once-daily-uuid',
        value: 'Once daily',
        frequencyPerDay: 1.0,
      },
      duration: 30,
      durationUnit: { valueCoded: '1072AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Days' },
      pillsDispensed: 30,
      quantityUnits: { valueCoded: '1513AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Tablet' },
      numRefills: 0,
      indication: 'Diabetes',
    });

    render(
      <DrugOrderForm
        initialOrderBasketItem={item}
        patient={mockPatient}
        visitContext={null}
        onSave={onSave}
        saveButtonText="Save order"
        onCancel={jest.fn()}
        workspaceTitle="Add drug order"
      />,
    );

    await user.click(screen.getByRole('tab', { name: /variable/i }));

    const variableRouteCombobox = screen.getByRole('combobox', { name: /^route$/i });
    await user.click(variableRouteCombobox);
    await user.click(screen.getByText('Oral'));

    const variableUnitCombobox = screen.getByRole('combobox', { name: /dose unit/i });
    await user.click(variableUnitCombobox);
    await user.click(screen.getByText('Tablet'));

    await user.clear(screen.getByLabelText(/morning/i));
    await user.type(screen.getByLabelText(/morning/i), '12');
    await user.clear(screen.getByLabelText(/noon/i));
    await user.type(screen.getByLabelText(/noon/i), '8');
    await user.clear(screen.getByLabelText(/evening/i));
    await user.type(screen.getByLabelText(/evening/i), '10');

    await waitFor(() => {
      expect(
        screen.getByText(/pattern: tid, morning: 12 tablet, noon: 8 tablet, evening: 10 tablet/i),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /save order/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          isFreeTextDosage: true,
          freeTextDosage: 'Pattern: TID, Morning: 12 Tablet, Noon: 8 Tablet, Evening: 10 Tablet',
          dosage: null,
          unit: null,
          frequency: null,
          route: expect.objectContaining({ value: 'Oral' }),
          duration: 30,
          durationUnit: expect.objectContaining({ value: 'Days' }),
        }),
      );
    });
  });
});

describe('DrugOrderForm - variable validation', () => {
  it('blocks save and shows errors when variable fields are incomplete', async () => {
    const user = userEvent.setup();
    const onSave = jest.fn().mockResolvedValue(undefined);

    render(
      <DrugOrderForm
        initialOrderBasketItem={createNewOrderBasketItem({
          indication: 'Diabetes',
          numRefills: 0,
          duration: null,
          durationUnit: null,
        })}
        patient={mockPatient}
        visitContext={null}
        onSave={onSave}
        saveButtonText="Save order"
        onCancel={jest.fn()}
        workspaceTitle="Add drug order"
      />,
    );

    await user.click(screen.getByRole('tab', { name: /variable/i }));
    await user.click(screen.getByRole('button', { name: /save order/i }));

    await waitFor(() => {
      expect(screen.getByText(/incomplete variable regimen/i)).toBeInTheDocument();
    });
    expect(screen.getAllByText(/dosage is required/i).length).toBeGreaterThan(0);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('allows save after all variable fields are completed', async () => {
    const user = userEvent.setup();
    const onSave = jest.fn().mockResolvedValue(undefined);

    render(
      <DrugOrderForm
        initialOrderBasketItem={createNewOrderBasketItem({
          indication: 'Diabetes',
          numRefills: 0,
          pillsDispensed: null,
          quantityUnits: null,
          duration: 30,
          durationUnit: { valueCoded: '1072AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Days' },
        })}
        patient={mockPatient}
        visitContext={null}
        onSave={onSave}
        saveButtonText="Save order"
        onCancel={jest.fn()}
        workspaceTitle="Add drug order"
      />,
    );

    await user.click(screen.getByRole('tab', { name: /variable/i }));

    await user.click(screen.getByRole('combobox', { name: /^route$/i }));
    await user.click(screen.getByText('Oral'));

    await user.click(screen.getByRole('combobox', { name: /dose unit/i }));
    await user.click(screen.getByText('Tablet'));

    await user.clear(screen.getByLabelText(/morning/i));
    await user.type(screen.getByLabelText(/morning/i), '12');
    await user.clear(screen.getByLabelText(/noon/i));
    await user.type(screen.getByLabelText(/noon/i), '8');
    await user.clear(screen.getByLabelText(/evening/i));
    await user.type(screen.getByLabelText(/evening/i), '10');

    await user.click(screen.getByRole('button', { name: /save order/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalled();
    });
    expect(screen.queryByText(/incomplete variable regimen/i)).not.toBeInTheDocument();
  });
});

describe('DrugOrderForm - hybrid dosing UI', () => {
  it('renders phase cards with duration and TID dose schedule when hybrid is selected', async () => {
    const user = userEvent.setup();
    renderDrugOrderForm(createNewOrderBasketItem());

    await user.click(screen.getByRole('tab', { name: /hybrid/i }));

    expect(screen.getByText(/phase 1/i)).toBeInTheDocument();
    expect(screen.getByText(/dose schedule/i)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /3 times daily/i })).toBeChecked();
    expect(screen.getByLabelText(/morning/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/noon/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/evening/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add phase/i })).toBeInTheDocument();
  });

  it('switches a phase to Q6H slots when its pattern is changed', async () => {
    const user = userEvent.setup();
    renderDrugOrderForm(createNewOrderBasketItem());

    await user.click(screen.getByRole('tab', { name: /hybrid/i }));
    await user.click(screen.getByRole('radio', { name: /4 times daily/i }));

    expect(screen.getByLabelText(/06:00/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/12:00/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/18:00/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/00:00/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/morning/i)).not.toBeInTheDocument();
  });

  it('adds and removes phases', async () => {
    const user = userEvent.setup();
    renderDrugOrderForm(createNewOrderBasketItem());

    await user.click(screen.getByRole('tab', { name: /hybrid/i }));
    await user.click(screen.getByRole('button', { name: /add phase/i }));

    expect(screen.getByText(/phase 2/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /remove phase/i }));

    expect(screen.queryByText(/phase 2/i)).not.toBeInTheDocument();
  });

  it('seeds route and unit from standard form when switching to hybrid', async () => {
    const user = userEvent.setup();
    renderDrugOrderForm(createNewOrderBasketItem());

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /dose unit/i })).toHaveValue('Tablet');
    });

    const standardRoute = screen.getByRole('combobox', { name: /^route$/i });
    await user.click(standardRoute);
    await user.click(screen.getByRole('option', { name: /oral/i }));

    await user.click(screen.getByRole('tab', { name: /hybrid/i }));

    expect(screen.getByRole('combobox', { name: /^route$/i })).toHaveValue('Oral');
    expect(screen.getByRole('combobox', { name: /dose unit/i })).toHaveValue('Tablet');
  });
});

describe('DrugOrderForm - hybrid dosage serialization', () => {
  it('saves hybrid phases as freeTextDosage on submit', async () => {
    const user = userEvent.setup();
    const onSave = jest.fn().mockResolvedValue(undefined);
    const item = createNewOrderBasketItem({
      dosage: 1,
      unit: { valueCoded: '1513AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Tablet' },
      route: { valueCoded: '160240AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Oral' },
      frequency: {
        valueCoded: 'once-daily-uuid',
        value: 'Once daily',
        frequencyPerDay: 1.0,
      },
      duration: 7,
      durationUnit: { valueCoded: '1072AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Days' },
      pillsDispensed: 1,
      quantityUnits: { valueCoded: '1513AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Tablet' },
      numRefills: 0,
      indication: 'Diabetes',
    });

    render(
      <DrugOrderForm
        initialOrderBasketItem={item}
        patient={mockPatient}
        visitContext={null}
        onSave={onSave}
        saveButtonText="Save order"
        onCancel={jest.fn()}
        workspaceTitle="Add drug order"
      />,
    );

    await user.click(screen.getByRole('tab', { name: /hybrid/i }));

    await user.click(screen.getByRole('combobox', { name: /^route$/i }));
    await user.click(screen.getByText('Oral'));

    await user.click(screen.getByRole('combobox', { name: /dose unit/i }));
    await user.click(screen.getByText('Tablet'));

    const durationInput = screen.getByRole('spinbutton', { name: /^duration$/i });
    await user.clear(durationInput);
    await user.type(durationInput, '7');

    await user.click(screen.getByRole('combobox', { name: /duration unit/i }));
    await user.click(screen.getByText('Days'));

    await user.clear(screen.getByLabelText(/morning/i));
    await user.type(screen.getByLabelText(/morning/i), '10');
    await user.clear(screen.getByLabelText(/noon/i));
    await user.type(screen.getByLabelText(/noon/i), '6');
    await user.clear(screen.getByLabelText(/evening/i));
    await user.type(screen.getByLabelText(/evening/i), '8');

    await waitFor(() => {
      expect(
        screen.getByText(/phase 1 \(7 days\): morning: 10 tablet, noon: 6 tablet, evening: 8 tablet/i),
      ).toBeInTheDocument();
    });

    const quantityInput = screen.getByRole('spinbutton', { name: /quantity to dispense/i });
    await waitFor(() => {
      expect(quantityInput).toHaveValue(168);
    });

    await user.click(screen.getByRole('button', { name: /save order/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          isFreeTextDosage: true,
          freeTextDosage: 'Phase 1 (7 Days): Morning: 10 Tablet, Noon: 6 Tablet, Evening: 8 Tablet',
          dosage: null,
          unit: null,
          frequency: null,
          route: expect.objectContaining({ value: 'Oral' }),
          pillsDispensed: 168,
        }),
      );
    });
  });

  it('blocks submission and shows an error when hybrid phases are incomplete', async () => {
    const user = userEvent.setup();
    const onSave = jest.fn().mockResolvedValue(undefined);
    const item = createNewOrderBasketItem({
      dosage: 1,
      unit: { valueCoded: '1513AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Tablet' },
      route: { valueCoded: '160240AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Oral' },
      frequency: { valueCoded: 'once-daily-uuid', value: 'Once daily', frequencyPerDay: 1.0 },
    });

    render(
      <DrugOrderForm
        initialOrderBasketItem={item}
        patient={mockPatient}
        visitContext={null}
        onSave={onSave}
        saveButtonText="Save order"
        onCancel={jest.fn()}
        workspaceTitle="Add drug order"
      />,
    );

    await user.click(screen.getByRole('tab', { name: /hybrid/i }));

    await user.click(screen.getByRole('button', { name: /save order/i }));

    expect(await screen.findByText(/incomplete phased regimen/i)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe('DrugOrderForm - variable dosing UI', () => {
  it('renders TID dose schedule when variable is selected', async () => {
    const user = userEvent.setup();
    renderDrugOrderForm(createNewOrderBasketItem());

    await user.click(screen.getByRole('tab', { name: /variable/i }));

    expect(screen.getByText(/dose schedule/i)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /3 times daily/i })).toBeChecked();
    expect(screen.getByLabelText(/morning/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/noon/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/evening/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/06:00/i)).not.toBeInTheDocument();
  });

  it('renders Q6H dose slots when pattern is changed', async () => {
    const user = userEvent.setup();
    renderDrugOrderForm(createNewOrderBasketItem());

    await user.click(screen.getByRole('tab', { name: /variable/i }));
    await user.click(screen.getByRole('radio', { name: /4 times daily/i }));

    expect(screen.getByLabelText(/06:00/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/12:00/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/18:00/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/00:00/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/morning/i)).not.toBeInTheDocument();
  });

  it('seeds route and unit from standard form when switching to variable', async () => {
    const user = userEvent.setup();
    renderDrugOrderForm(createNewOrderBasketItem());

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /dose unit/i })).toHaveValue('Tablet');
    });

    const standardRoute = screen.getByRole('combobox', { name: /^route$/i });
    await user.click(standardRoute);
    await user.click(screen.getByRole('option', { name: /oral/i }));

    await user.click(screen.getByRole('tab', { name: /variable/i }));

    expect(screen.getByRole('combobox', { name: /^route$/i })).toHaveValue('Oral');
    expect(screen.getByRole('combobox', { name: /dose unit/i })).toHaveValue('Tablet');
  });
});

describe('DrugOrderForm - complex dosing state lifecycle', () => {
  it('clears complex dosing state when the form is opened for a different drug', async () => {
    const user = userEvent.setup();
    const sharedProps = {
      patient: mockPatient,
      visitContext: null,
      onSave: jest.fn(),
      saveButtonText: 'Save order',
      onCancel: jest.fn(),
      workspaceTitle: 'Add drug order',
    };

    const { rerender } = render(
      <DrugOrderForm
        initialOrderBasketItem={createNewOrderBasketItem({ indication: 'Hypertension' })}
        {...sharedProps}
      />,
    );

    await user.click(screen.getByRole('tab', { name: /tapering/i }));
    expect(screen.getByRole('button', { name: /add phase/i })).toBeInTheDocument();

    // Re-open the form for a different drug; the tapering phases must not carry over.
    const itemForDifferentDrug = {
      ...createNewOrderBasketItem({ indication: 'Hypertension' }),
      drug: mockDrugSearchResultApiData[1],
    } as DrugOrderBasketItem;

    rerender(<DrugOrderForm initialOrderBasketItem={itemForDifferentDrug} {...sharedProps} />);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /add phase/i })).not.toBeInTheDocument();
    });
  });

  it('preserves complex dosing state when switching tapering -> variable -> tapering', async () => {
    const user = userEvent.setup();
    renderDrugOrderForm(createNewOrderBasketItem({ indication: 'Hypertension' }));

    await user.click(screen.getByRole('tab', { name: /tapering/i }));

    const taperingUnitCombobox = screen.getByRole('combobox', { name: /dose unit/i });
    await user.click(taperingUnitCombobox);
    await user.click(screen.getByText('Tablet'));

    const doseInput = screen.getByRole('spinbutton', { name: /^dose$/i });
    await user.clear(doseInput);
    await user.type(doseInput, '40');

    // Switch away to variable, then back to tapering.
    await user.click(screen.getByRole('tab', { name: /variable/i }));
    await user.click(screen.getByRole('tab', { name: /tapering/i }));

    // The previously entered tapering dose and unit should still be present.
    await waitFor(() => {
      expect(screen.getByRole('spinbutton', { name: /^dose$/i })).toHaveValue(40);
    });
    expect(screen.getByRole('combobox', { name: /dose unit/i })).toHaveValue('Tablet');
  });

  it('saves free-text dosage instead of a serialized regimen when free text is enabled with a complex type selected', async () => {
    const user = userEvent.setup();
    const onSave = jest.fn().mockResolvedValue(undefined);
    const item = createNewOrderBasketItem({
      indication: 'Hypertension',
      pillsDispensed: 14,
      quantityUnits: { valueCoded: '1513AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: 'Tablet' },
    });

    render(
      <DrugOrderForm
        initialOrderBasketItem={item}
        patient={mockPatient}
        visitContext={null}
        onSave={onSave}
        saveButtonText="Save order"
        onCancel={jest.fn()}
        workspaceTitle="Add drug order"
      />,
    );

    // Select a complex dosing type first, then turn on free text dosage.
    await user.click(screen.getByRole('tab', { name: /tapering/i }));
    await user.click(screen.getByRole('switch', { name: /free text dosage/i }));

    const freeTextArea = screen.getByPlaceholderText(/free text dosage/i);
    await user.type(freeTextArea, 'Take as directed by physician');

    // Enabling free text clears the auto-calculated quantity, so set it manually.
    const quantityInput = screen.getByRole('spinbutton', { name: /quantity to dispense/i });
    await user.clear(quantityInput);
    await user.type(quantityInput, '14');

    await user.click(screen.getByRole('button', { name: /save order/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          isFreeTextDosage: true,
          freeTextDosage: 'Take as directed by physician',
        }),
      );
    });
    expect(onSave.mock.calls[0][0].freeTextDosage).not.toMatch(/Phase 1/i);
  });
});
