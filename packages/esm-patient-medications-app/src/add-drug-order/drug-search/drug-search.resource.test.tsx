import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { openmrsFetch } from '@openmrs/esm-framework';
import { type DrugOrderTemplate, type OrderTemplate } from '@openmrs/esm-patient-common-lib';
import { mockDrugSearchResultApiData } from '__mocks__';
import { getTemplateOrderBasketItem, useConceptSets, useConceptTree, useDrugsByConcepts } from './drug-search.resource';

const mockOpenmrsFetch = openmrsFetch as jest.Mock;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SWRConfig value={{ dedupingInterval: 0, provider: () => new Map() }}>{children}</SWRConfig>
);

describe('useConceptSets', () => {
  test('returns an empty array when no UUIDs are provided', () => {
    const { result } = renderHook(() => useConceptSets([]), { wrapper });

    expect(result.current.conceptSets).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeUndefined();
  });

  test('returns concept sets on successful fetch', async () => {
    mockOpenmrsFetch.mockResolvedValueOnce({
      data: {
        'uuid-1': { uuid: 'uuid-1', display: 'Analgesics' },
        'uuid-2': { uuid: 'uuid-2', display: 'Antibiotics' },
      },
    });

    const { result } = renderHook(() => useConceptSets(['uuid-1', 'uuid-2']), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.conceptSets).toEqual([
      { uuid: 'uuid-1', display: 'Analgesics' },
      { uuid: 'uuid-2', display: 'Antibiotics' },
    ]);
    expect(result.current.error).toBeUndefined();
  });

  test('returns an error on failed fetch', async () => {
    mockOpenmrsFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useConceptSets(['uuid-1']), { wrapper });

    await waitFor(() => expect(result.current.error).toBeDefined());

    expect(result.current.conceptSets).toEqual([]);
  });
});

describe('useConceptTree', () => {
  test('returns null tree when no UUID is provided', () => {
    const { result } = renderHook(() => useConceptTree(null), { wrapper });

    expect(result.current.tree).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeUndefined();
  });

  test('returns tree data on successful fetch', async () => {
    const mockTree = {
      uuid: 'set-uuid',
      display: 'Analgesics',
      isSet: true,
      setMembers: [
        { uuid: 'child-1', display: 'Aspirin', isSet: false },
        { uuid: 'child-2', display: 'Ibuprofen', isSet: false },
      ],
    };

    mockOpenmrsFetch.mockResolvedValueOnce({ data: mockTree });

    const { result } = renderHook(() => useConceptTree('set-uuid'), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.tree).toEqual(mockTree);
    expect(result.current.error).toBeUndefined();
  });

  test('returns an error on failed fetch', async () => {
    mockOpenmrsFetch.mockRejectedValueOnce(new Error('Not found'));

    const { result } = renderHook(() => useConceptTree('bad-uuid'), { wrapper });

    await waitFor(() => expect(result.current.error).toBeDefined());

    expect(result.current.tree).toBeUndefined();
  });
});

describe('useDrugsByConcepts', () => {
  test('returns empty results when no concepts are provided', () => {
    const { result } = renderHook(() => useDrugsByConcepts([]), { wrapper });

    expect(result.current.drugs).toEqual([]);
    expect(result.current.errors).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  test('returns drugs on successful fetch', async () => {
    mockOpenmrsFetch.mockResolvedValueOnce({
      data: { results: mockDrugSearchResultApiData },
    });

    const { result } = renderHook(() => useDrugsByConcepts(['concept-uuid-1']), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.drugs).toHaveLength(3);
    expect(result.current.drugs[0].display).toBe('Aspirin 81mg');
    expect(result.current.errors).toEqual([]);
  });

  test('deduplicates drugs with the same UUID', async () => {
    const duplicatedDrug = mockDrugSearchResultApiData[0];

    mockOpenmrsFetch.mockResolvedValueOnce({
      data: { results: [duplicatedDrug, duplicatedDrug, mockDrugSearchResultApiData[1]] },
    });

    const { result } = renderHook(() => useDrugsByConcepts(['concept-uuid-1']), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.drugs).toHaveLength(2);
  });

  test('collects errors from failed batches while returning successful results', async () => {
    // Generate 21 concept UUIDs to trigger two batches (max 20 per batch)
    const concepts = Array.from({ length: 21 }, (_, i) => `concept-${i}`);

    // First batch succeeds, second batch fails
    mockOpenmrsFetch.mockResolvedValueOnce({
      data: { results: [mockDrugSearchResultApiData[0]] },
    });
    mockOpenmrsFetch.mockRejectedValueOnce(new Error('Batch failed'));

    const { result } = renderHook(() => useDrugsByConcepts(concepts), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.drugs).toHaveLength(1);
    expect(result.current.drugs[0].display).toBe('Aspirin 81mg');
    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0].message).toBe('Batch failed');
  });

  test('paginates when results fill the page size', async () => {
    // Create 50 fake drugs to fill the first page
    const fullPage = Array.from({ length: 50 }, (_, i) => ({
      ...mockDrugSearchResultApiData[0],
      uuid: `drug-page1-${i}`,
      display: `Drug ${i}`,
    }));

    const secondPage = [{ ...mockDrugSearchResultApiData[1], uuid: 'drug-page2-0', display: 'Drug 50' }];

    // First call returns full page (triggers pagination), second returns partial page (stops)
    mockOpenmrsFetch.mockResolvedValueOnce({ data: { results: fullPage } });
    mockOpenmrsFetch.mockResolvedValueOnce({ data: { results: secondPage } });

    const { result } = renderHook(() => useDrugsByConcepts(['concept-uuid-1']), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.drugs).toHaveLength(51);
    expect(result.current.errors).toEqual([]);
  });
});

describe('getTemplateOrderBasketItem', () => {
  const tabletDosageForm = {
    display: 'Tablet',
    uuid: '1513AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  };

  const drugWithTabletDosageForm = {
    ...mockDrugSearchResultApiData[0],
    dosageForm: tabletDosageForm,
  };

  const baseOrderTemplate: OrderTemplate = {
    type: 'https://schema.openmrs.org/order/template/drug/simple/v1',
    dosingType: 'org.openmrs.SimpleDosingInstructions',
    dosingInstructions: {
      dose: [{ value: 1, default: true }],
      units: [],
      route: [{ value: 'oral', valueCoded: '160240AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', default: true }],
      frequency: [{ value: 'once daily', valueCoded: 'once-daily-uuid', default: true }],
    },
  };

  function createDrugOrderTemplate(template: OrderTemplate): DrugOrderTemplate {
    return {
      uuid: 'template-uuid',
      name: 'Test template',
      drug: drugWithTabletDosageForm,
      template,
    };
  }

  it('uses default from units (plural) when unit (singular) is absent', () => {
    const template = createDrugOrderTemplate({
      ...baseOrderTemplate,
      dosingInstructions: {
        ...baseOrderTemplate.dosingInstructions,
        units: [{ value: 'mg', valueCoded: '161553AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', default: true }],
      },
    });

    const result = getTemplateOrderBasketItem(drugWithTabletDosageForm, null, undefined, template);

    expect(result.unit).toEqual({
      value: 'mg',
      valueCoded: '161553AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      default: true,
    });
  });

  it('uses template unit instead of drug dosage form when template defines unit', () => {
    const template = createDrugOrderTemplate({
      ...baseOrderTemplate,
      dosingInstructions: {
        ...baseOrderTemplate.dosingInstructions,
        unit: [{ value: 'mg', valueCoded: '161553AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', default: true }],
      },
    } as OrderTemplate);

    const result = getTemplateOrderBasketItem(drugWithTabletDosageForm, null, undefined, template);

    expect(result.unit).toEqual({
      value: 'mg',
      valueCoded: '161553AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      default: true,
    });
  });

  it('falls back to drug dosage form when template has no unit list', () => {
    const template = createDrugOrderTemplate(baseOrderTemplate);

    const result = getTemplateOrderBasketItem(drugWithTabletDosageForm, null, undefined, template);

    expect(result.unit).toEqual({
      value: tabletDosageForm.display,
      valueCoded: tabletDosageForm.uuid,
    });
  });

  it('copies default dose unit to quantityUnits when template omits quantityUnits', () => {
    const template = createDrugOrderTemplate({
      ...baseOrderTemplate,
      dosingInstructions: {
        ...baseOrderTemplate.dosingInstructions,
        unit: [{ value: 'mg', valueCoded: '161553AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', default: true }],
      },
    } as OrderTemplate);

    const result = getTemplateOrderBasketItem(drugWithTabletDosageForm, null, undefined, template);

    expect(result.quantityUnits).toEqual(result.unit);
    expect(result.quantityUnits).toEqual({
      value: 'mg',
      valueCoded: '161553AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      default: true,
    });
  });

  it('uses template quantityUnits when template defines them', () => {
    const template = createDrugOrderTemplate({
      ...baseOrderTemplate,
      dosingInstructions: {
        ...baseOrderTemplate.dosingInstructions,
        unit: [{ value: 'mg', valueCoded: '161553AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', default: true }],
        quantityUnits: [{ value: 'tab', valueCoded: '1513AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', default: true }],
      },
    } as OrderTemplate);

    const result = getTemplateOrderBasketItem(drugWithTabletDosageForm, null, undefined, template);

    expect(result.unit?.valueCoded).toBe('161553AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
    expect(result.quantityUnits).toEqual({
      value: 'tab',
      valueCoded: '1513AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      default: true,
    });
  });

  it('uses dosage form for unit and quantityUnits when no template is provided', () => {
    const result = getTemplateOrderBasketItem(drugWithTabletDosageForm, null);

    expect(result.unit).toEqual({
      value: tabletDosageForm.display,
      valueCoded: tabletDosageForm.uuid,
    });
    expect(result.quantityUnits).toEqual({
      value: tabletDosageForm.display,
      valueCoded: tabletDosageForm.uuid,
    });
  });
});
