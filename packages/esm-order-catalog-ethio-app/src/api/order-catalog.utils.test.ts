import {
  collectSelectedItems,
  getConceptDisplayName,
  getPanelSelectionState,
  getStandaloneOrderablesSectionLabel,
  getTestsForConceptClassGroup,
  inferOrderTypeFromTab,
  parseOrderCatalogCategory,
  parseOrderCatalogCategoryStubs,
  parseOrderCatalogRoot,
  parseOrderCatalogTabStubs,
  partitionCategoryTests,
  togglePanelSelection,
  toggleTestSelection,
  getConceptClassGroups,
  defaultConceptClassGroupKey,
} from './order-catalog.utils';
import { type CatalogConceptResponse } from '../types/order-catalog.types';

const mockRoot: CatalogConceptResponse = {
  uuid: 'root',
  display: 'All Orderables',
  setMembers: [
    { uuid: 'lab-tab', names: [{ name: 'Lab', conceptNameType: 'SHORT', locale: 'en' }] },
    { uuid: 'rad-tab', names: [{ name: 'Radiology Orders', conceptNameType: 'FULLY_SPECIFIED', locale: 'en' }] },
  ],
};

const mockTab: CatalogConceptResponse = {
  uuid: 'lab-tab',
  display: 'Lab Samples',
  setMembers: [
    {
      uuid: 'blood',
      display: 'Blood Specimen',
      setMembers: [
        {
          uuid: 'panel-1',
          display: 'CBC Panel',
          conceptClass: { uuid: 'c1', name: 'LabSet', description: 'Panels' },
          setMembers: [
            {
              uuid: 'child-1',
              display: 'WBC',
              conceptClass: { uuid: 'c2', name: 'Test', description: 'Tests' },
            },
            {
              uuid: 'child-2',
              display: 'RBC',
              conceptClass: { uuid: 'c2', name: 'Test', description: 'Tests' },
            },
          ],
        },
      ],
    },
  ],
};

describe('order-catalog.utils', () => {
  it('parses tab stubs from root', () => {
    const stubs = parseOrderCatalogTabStubs(mockRoot, 'en');
    expect(stubs).toHaveLength(2);
    expect(stubs[0].orderType).toBe('lab');
    expect(stubs[1].orderType).toBe('radiology');
  });

  it('parses full catalog tree from root', () => {
    const tabs = parseOrderCatalogRoot(mockRoot, 'en');
    expect(tabs).toHaveLength(2);
    expect(tabs[0].categories).toEqual([]);
  });

  it('parses category stubs without tests', () => {
    const categories = parseOrderCatalogCategoryStubs(mockTab, 'en');
    expect(categories).toHaveLength(1);
    expect(categories[0].tests).toEqual([]);
  });

  it('parses a full category with tests and panels', () => {
    const category = parseOrderCatalogCategory(mockTab.setMembers![0], 'en');
    expect(category.tests[0].isPanel).toBe(true);
    expect(category.tests[0].availability).toBe('unavailable');
    expect(category.tests[0].childTests).toHaveLength(2);
    expect(category.tests[0].childTests[0].availability).toBe('unavailable');
  });

  it('marks a concept available only when explicitly enabled in lookup', () => {
    const categoryConcept: CatalogConceptResponse = {
      uuid: 'cat-1',
      display: 'Chemistry',
      setMembers: [{ uuid: 'glucose', display: 'Glucose' }],
    };

    const enabledCategory = parseOrderCatalogCategory(categoryConcept, 'en', new Map([['glucose', true]]));
    expect(enabledCategory.tests[0].availability).toBe('available');

    const disabledCategory = parseOrderCatalogCategory(categoryConcept, 'en', new Map([['glucose', false]]));
    expect(disabledCategory.tests[0].availability).toBe('unavailable');

    const missingInLookupCategory = parseOrderCatalogCategory(categoryConcept, 'en', new Map([['other-test', false]]));
    expect(missingInLookupCategory.tests[0].availability).toBe('unavailable');
  });

  it('propagates unavailable panel status to all children', () => {
    const category = parseOrderCatalogCategory(
      mockTab.setMembers![0],
      'en',
      new Map([
        ['panel-1', false],
        ['child-1', true],
      ]),
    );
    const panel = category.tests[0];

    expect(panel.availability).toBe('unavailable');
    expect(panel.childTests.every((child) => child.availability === 'unavailable')).toBe(true);
  });

  it('keeps panel available when child is unavailable', () => {
    const category = parseOrderCatalogCategory(
      mockTab.setMembers![0],
      'en',
      new Map([
        ['panel-1', true],
        ['child-2', false],
      ]),
    );
    const panel = category.tests[0];
    const childTwo = panel.childTests.find((child) => child.uuid === 'child-2');

    expect(panel.availability).toBe('available');
    expect(childTwo?.availability).toBe('unavailable');
  });

  it('marks standalone duplicates unavailable when their panel is unavailable', () => {
    const category = parseOrderCatalogCategory(
      {
        uuid: 'blood',
        display: 'Blood Specimen',
        setMembers: [
          {
            uuid: 'panel-1',
            display: 'CBC Panel',
            conceptClass: { uuid: 'c1', name: 'LabSet', description: 'Panels' },
            setMembers: [
              { uuid: 'child-1', display: 'WBC' },
              { uuid: 'child-2', display: 'RBC' },
            ],
          },
          { uuid: 'child-1', display: 'WBC' },
        ],
      },
      'en',
      new Map([
        ['panel-1', false],
        ['child-1', true],
      ]),
    );

    const panel = category.tests.find((test) => test.uuid === 'panel-1')!;
    const standaloneDuplicate = category.tests.find((test) => !test.isPanel && test.uuid === 'child-1')!;

    expect(panel.availability).toBe('unavailable');
    expect(panel.childTests.every((child) => child.availability === 'unavailable')).toBe(true);
    expect(standaloneDuplicate.availability).toBe('unavailable');
  });

  it('includes uncategorized tests in the default group', () => {
    const category = parseOrderCatalogCategory(
      {
        uuid: 'blood',
        display: 'Blood Specimen',
        setMembers: [
          {
            uuid: 'test-1',
            display: 'Glucose',
            conceptClass: { uuid: 'c2', name: 'Test', description: 'Tests' },
          },
          { uuid: 'test-2', display: 'Unknown test' },
        ],
      },
      'en',
    );
    const groups = getConceptClassGroups(category);
    const defaultGroup = groups.find((group) => group.name === defaultConceptClassGroupKey)!;
    expect(getTestsForConceptClassGroup(category, defaultGroup)).toHaveLength(1);
    expect(getTestsForConceptClassGroup(category, defaultGroup)[0].displayName).toBe('Unknown test');
  });

  it('prefers English names when locale is en', () => {
    const concept: CatalogConceptResponse = {
      uuid: 'x',
      names: [
        { name: 'የደም', conceptNameType: 'SHORT', locale: 'am' },
        { name: 'Blood', conceptNameType: 'SHORT', locale: 'en' },
      ],
    };
    expect(getConceptDisplayName(concept, 'en')).toBe('Blood');
  });

  it('uses display from API when present', () => {
    expect(getConceptDisplayName({ uuid: 'x', display: 'Glucose', names: [] }, 'en')).toBe('Glucose');
  });

  it('infers order types from tab labels', () => {
    expect(inferOrderTypeFromTab({ uuid: 'a', display: 'Procedure Orders' }, 'en')).toBe('procedure');
  });

  it('uses order-type-specific standalone section labels', () => {
    const t = (key: string, defaultValue: string) => defaultValue;
    expect(getStandaloneOrderablesSectionLabel('lab', t)).toBe('Tests');
    expect(getStandaloneOrderablesSectionLabel('radiology', t)).toBe('Studies');
    expect(getStandaloneOrderablesSectionLabel('procedure', t)).toBe('Procedures');
  });

  it('partitions panels above standalone tests', () => {
    const category = parseOrderCatalogCategory(mockTab.setMembers![0], 'en');
    const partition = partitionCategoryTests(category.tests);
    expect(partition.panels).toHaveLength(1);
    expect(partition.standaloneTests).toHaveLength(0);
    expect(partition.panelMembers).toHaveLength(2);
  });

  it('selects and partially deselects panel children', () => {
    const category = parseOrderCatalogCategory(mockTab.setMembers![0], 'en');
    const panel = category.tests[0];

    let selected = togglePanelSelection(panel, new Set());
    expect(selected.has('panel-1')).toBe(true);
    expect(selected.has('child-1')).toBe(true);

    selected = toggleTestSelection(panel.childTests[0], selected);
    expect(selected.has('child-1')).toBe(false);
    expect(getPanelSelectionState(panel, selected).indeterminate).toBe(true);

    const items = collectSelectedItems(
      {
        uuid: 'lab-tab',
        displayName: 'Lab',
        orderType: 'lab',
        categories: [category],
      },
      selected,
    );
    // Partially-selected panel: the panel is not ordered as a whole; the remaining member
    // becomes its own individual order.
    expect(items).toHaveLength(1);
    expect(items[0].isPanel).toBe(false);
    expect(items[0].uuid).toBe('child-2');

    selected = togglePanelSelection(panel, selected);
    expect(selected.size).toBe(0);
  });

  it('shows a fully-selected panel as a single order', () => {
    const category = parseOrderCatalogCategory(mockTab.setMembers![0], 'en');
    const panel = category.tests[0];
    const selected = togglePanelSelection(panel, new Set());

    const items = collectSelectedItems(
      { uuid: 'lab-tab', displayName: 'Lab', orderType: 'lab', categories: [category] },
      selected,
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ uuid: 'panel-1', isPanel: true });
  });

  it('hides a panel member that is also a standalone test when the panel is ordered as a whole', () => {
    // The category lists the CBC panel AND "WBC" (child-1) as a standalone test.
    const category = parseOrderCatalogCategory(
      {
        uuid: 'blood',
        display: 'Blood Specimen',
        setMembers: [
          {
            uuid: 'panel-1',
            display: 'CBC Panel',
            conceptClass: { uuid: 'c1', name: 'LabSet', description: 'Panels' },
            setMembers: [
              { uuid: 'child-1', display: 'WBC' },
              { uuid: 'child-2', display: 'RBC' },
            ],
          },
          { uuid: 'child-1', display: 'WBC' },
        ],
      },
      'en',
    );
    const panel = category.tests[0];
    const selected = togglePanelSelection(panel, new Set());

    const items = collectSelectedItems(
      { uuid: 'lab-tab', displayName: 'Lab', orderType: 'lab', categories: [category] },
      selected,
    );
    // Only the panel — not the standalone WBC copy nor the members.
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ uuid: 'panel-1', isPanel: true });
  });

  it('does not list a shared panel member more than once', () => {
    // Two panels in the same category share the member "child-1".
    const category = parseOrderCatalogCategory(
      {
        uuid: 'blood',
        display: 'Blood Specimen',
        setMembers: [
          {
            uuid: 'panel-a',
            display: 'Panel A',
            conceptClass: { uuid: 'c1', name: 'LabSet', description: 'Panels' },
            setMembers: [{ uuid: 'child-1', display: 'WBC' }],
          },
          {
            uuid: 'panel-b',
            display: 'Panel B',
            conceptClass: { uuid: 'c1', name: 'LabSet', description: 'Panels' },
            setMembers: [{ uuid: 'child-1', display: 'WBC' }],
          },
        ],
      },
      'en',
    );

    const items = collectSelectedItems(
      { uuid: 'lab-tab', displayName: 'Lab', orderType: 'lab', categories: [category] },
      new Set(['child-1']),
    );
    expect(items).toHaveLength(1);
    expect(items[0].uuid).toBe('child-1');
  });
});
