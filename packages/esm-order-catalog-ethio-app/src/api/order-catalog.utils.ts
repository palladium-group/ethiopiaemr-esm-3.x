import {
  type CatalogCategory,
  type CatalogConceptResponse,
  type CatalogTab,
  type CatalogTabStub,
  type CatalogTest,
  type OrderCatalogOrderType,
} from '../types/order-catalog.types';

function normalizeLocale(locale: string): string {
  return locale.split(/[-_]/)[0].toLowerCase();
}

function findConceptName(
  names: CatalogConceptResponse['names'],
  conceptNameType: string,
  locale: string,
): string | undefined {
  if (!names?.length) {
    return undefined;
  }

  const normalizedLocale = normalizeLocale(locale);
  const match = names.find(
    (entry) =>
      entry.conceptNameType === conceptNameType && entry.locale && normalizeLocale(entry.locale) === normalizedLocale,
  );
  return match?.name;
}

/** Resolves a concept label for a single locale (used when parsing API responses). */
export function getConceptDisplayName(concept: CatalogConceptResponse, locale = 'en'): string {
  const normalizedLocale = normalizeLocale(locale);

  if (concept.display?.trim()) {
    return concept.display.trim();
  }

  const shortName = findConceptName(concept.names, 'SHORT', normalizedLocale);
  if (shortName) {
    return shortName;
  }

  const fullySpecified = findConceptName(concept.names, 'FULLY_SPECIFIED', normalizedLocale);
  if (fullySpecified) {
    return fullySpecified;
  }

  if (normalizedLocale !== 'en') {
    const shortEn = findConceptName(concept.names, 'SHORT', 'en');
    if (shortEn) {
      return shortEn;
    }
    const fullySpecifiedEn = findConceptName(concept.names, 'FULLY_SPECIFIED', 'en');
    if (fullySpecifiedEn) {
      return fullySpecifiedEn;
    }
  }

  const anyShort = concept.names?.find((entry) => entry.conceptNameType === 'SHORT')?.name;
  if (anyShort) {
    return anyShort;
  }

  const anyFullySpecified = concept.names?.find((entry) => entry.conceptNameType === 'FULLY_SPECIFIED')?.name;
  if (anyFullySpecified) {
    return anyFullySpecified;
  }

  return concept.name?.display ?? concept.display ?? '';
}

export function inferOrderTypeFromTab(tabConcept: CatalogConceptResponse, locale = 'en'): OrderCatalogOrderType {
  const label = getConceptDisplayName(tabConcept, locale).toLowerCase();
  if (label.includes('radiology')) {
    return 'radiology';
  }
  if (label.includes('procedure')) {
    return 'procedure';
  }
  return 'lab';
}

/** Section heading for non-panel orderables in the browse grid (varies by tab order type). */
export function getStandaloneOrderablesSectionLabel(
  orderType: OrderCatalogOrderType,
  t: (key: string, defaultValue: string) => string,
): string {
  switch (orderType) {
    case 'radiology':
      return t('standaloneRadiologyOrderables', 'Studies');
    case 'procedure':
      return t('standaloneProcedureOrderables', 'Procedures');
    default:
      return t('standaloneLabOrderables', 'Tests');
  }
}

function mapTest(concept: CatalogConceptResponse, locale: string): CatalogTest {
  const childMembers = concept.setMembers ?? [];
  return {
    uuid: concept.uuid,
    displayName: getConceptDisplayName(concept, locale),
    conceptClassName: concept.conceptClass?.name ?? '',
    conceptClassDescription: concept.conceptClass?.description ?? concept.conceptClass?.name ?? '',
    isPanel: childMembers.length > 0,
    childTests: childMembers.map((child) => mapTest(child, locale)),
  };
}

export function parseOrderCatalogRoot(rootConcept: CatalogConceptResponse, locale = 'en'): Array<CatalogTab> {
  return (rootConcept.setMembers ?? []).map((tabMember) => ({
    uuid: tabMember.uuid,
    displayName: getConceptDisplayName(tabMember, locale),
    orderType: inferOrderTypeFromTab(tabMember, locale),
    categories: (tabMember.setMembers ?? []).map((categoryMember) => parseOrderCatalogCategory(categoryMember, locale)),
  }));
}

export function parseOrderCatalogTabStubs(rootConcept: CatalogConceptResponse, locale = 'en'): Array<CatalogTabStub> {
  return parseOrderCatalogRoot(rootConcept, locale).map(({ uuid, displayName, orderType }) => ({
    uuid,
    displayName,
    orderType,
  }));
}

export function parseOrderCatalogTab(tabConcept: CatalogConceptResponse, locale = 'en'): CatalogTab {
  return {
    uuid: tabConcept.uuid,
    displayName: getConceptDisplayName(tabConcept, locale),
    orderType: inferOrderTypeFromTab(tabConcept, locale),
    categories: parseOrderCatalogCategoryStubs(tabConcept, locale),
  };
}

export function parseOrderCatalogCategoryStubs(
  tabConcept: CatalogConceptResponse,
  locale = 'en',
): Array<CatalogCategory> {
  return (tabConcept.setMembers ?? []).map((member) => ({
    uuid: member.uuid,
    displayName: getConceptDisplayName(member, locale),
    tests: [],
  }));
}

export function parseOrderCatalogCategory(categoryConcept: CatalogConceptResponse, locale = 'en'): CatalogCategory {
  return {
    uuid: categoryConcept.uuid,
    displayName: getConceptDisplayName(categoryConcept, locale),
    tests: (categoryConcept.setMembers ?? []).map((member) => mapTest(member, locale)),
  };
}

export const defaultConceptClassGroupKey = '__default__';

export interface ConceptClassGroup {
  name: string;
  description: string;
}

export function getConceptClassGroups(category: CatalogCategory | undefined): Array<ConceptClassGroup> {
  if (!category) {
    return [];
  }

  const byClassKey = new Map<string, ConceptClassGroup>();
  let hasUncategorized = false;

  for (const test of category.tests) {
    const key = test.conceptClassName || test.conceptClassDescription;
    if (!key) {
      hasUncategorized = true;
      continue;
    }
    if (byClassKey.has(key)) {
      continue;
    }
    byClassKey.set(key, {
      name: test.conceptClassName,
      description: test.conceptClassDescription || test.conceptClassName,
    });
  }

  const groups = Array.from(byClassKey.values()).sort((a, b) => a.description.localeCompare(b.description));
  if (hasUncategorized) {
    groups.push({
      name: defaultConceptClassGroupKey,
      description: 'Tests',
    });
  }

  return groups;
}

export function getTestsForConceptClassGroup(category: CatalogCategory, group: ConceptClassGroup): Array<CatalogTest> {
  if (group.name === defaultConceptClassGroupKey) {
    return category.tests.filter((test) => !test.conceptClassName && !test.conceptClassDescription);
  }

  return category.tests.filter(
    (test) => test.conceptClassName === group.name || test.conceptClassDescription === group.description,
  );
}

export function filterTestsBySearch(tests: Array<CatalogTest>, searchTerm: string): Array<CatalogTest> {
  const query = searchTerm.trim().toLowerCase();
  if (!query) {
    return tests;
  }
  return tests.filter((test) => test.displayName.toLowerCase().includes(query));
}

export interface PartitionedCategoryTests {
  panels: Array<CatalogTest>;
  panelMembers: Array<{ panel: CatalogTest; child: CatalogTest }>;
  standaloneTests: Array<CatalogTest>;
}

export function partitionCategoryTests(tests: Array<CatalogTest>): PartitionedCategoryTests {
  const panels = tests.filter((test) => test.isPanel);
  const standaloneTests = tests.filter((test) => !test.isPanel);
  const panelMembers = panels.flatMap((panel) => panel.childTests.map((child) => ({ panel, child })));

  return { panels, panelMembers, standaloneTests };
}

function matchesSearch(label: string, query: string): boolean {
  return label.toLowerCase().includes(query);
}

export function filterPartitionedTests(
  partition: PartitionedCategoryTests,
  searchTerm: string,
): PartitionedCategoryTests {
  const query = searchTerm.trim().toLowerCase();
  if (!query) {
    return partition;
  }

  const standaloneTests = partition.standaloneTests.filter((test) => matchesSearch(test.displayName, query));

  const panels = partition.panels.filter(
    (panel) =>
      matchesSearch(panel.displayName, query) ||
      panel.childTests.some((child) => matchesSearch(child.displayName, query)),
  );

  const visiblePanelUuids = new Set(panels.map((panel) => panel.uuid));
  const panelMembers = partition.panelMembers.filter(({ panel, child }) => {
    if (!visiblePanelUuids.has(panel.uuid)) {
      return false;
    }
    if (matchesSearch(panel.displayName, query)) {
      return true;
    }
    return matchesSearch(child.displayName, query);
  });

  return { panels, panelMembers, standaloneTests };
}

export function hasVisiblePartitionedTests(partition: PartitionedCategoryTests): boolean {
  return partition.panels.length > 0 || partition.panelMembers.length > 0 || partition.standaloneTests.length > 0;
}

/**
 * The child tests of a panel that should be shown when the panel is expanded.
 * If the panel name matches the search (or there is no search), all children show;
 * otherwise only the children whose name matches.
 */
export function getVisiblePanelChildren(panel: CatalogTest, searchTerm: string): Array<CatalogTest> {
  const query = searchTerm.trim().toLowerCase();
  if (!query || matchesSearch(panel.displayName, query)) {
    return panel.childTests;
  }
  return panel.childTests.filter((child) => matchesSearch(child.displayName, query));
}

/** A panel is "expanded" (its members are shown for partial selection) when it has any selection. */
export function isPanelExpanded(panel: CatalogTest, selectedUuids: Set<string>): boolean {
  return isOrderButtonActive(panel, selectedUuids);
}

export function isConceptSelected(testUuid: string, selectedUuids: Set<string>): boolean {
  return selectedUuids.has(testUuid);
}

export function getPanelSelectionState(
  panel: CatalogTest,
  selectedUuids: Set<string>,
): { checked: boolean; indeterminate: boolean } {
  const panelSelected = selectedUuids.has(panel.uuid);
  const selectedChildCount = panel.childTests.filter((child) => selectedUuids.has(child.uuid)).length;

  if (!panelSelected && selectedChildCount === 0) {
    return { checked: false, indeterminate: false };
  }

  if (panelSelected && selectedChildCount === panel.childTests.length) {
    return { checked: true, indeterminate: false };
  }

  return { checked: panelSelected, indeterminate: true };
}

/** Toggle a panel: clears when any selection exists; otherwise selects panel + all children. */
export function togglePanelSelection(panel: CatalogTest, selectedUuids: Set<string>): Set<string> {
  const next = new Set(selectedUuids);
  const { checked } = getPanelSelectionState(panel, selectedUuids);

  if (checked) {
    next.delete(panel.uuid);
    panel.childTests.forEach((child) => next.delete(child.uuid));
    return next;
  }

  next.add(panel.uuid);
  panel.childTests.forEach((child) => next.add(child.uuid));
  return next;
}

/** Toggle a single test or panel member; does not disable siblings when panel is selected. */
export function toggleTestSelection(test: CatalogTest, selectedUuids: Set<string>): Set<string> {
  if (test.isPanel) {
    return togglePanelSelection(test, selectedUuids);
  }

  const next = new Set(selectedUuids);
  if (next.has(test.uuid)) {
    next.delete(test.uuid);
    return next;
  }

  next.add(test.uuid);
  return next;
}

export function toggleChildSelection(panel: CatalogTest, child: CatalogTest, selectedUuids: Set<string>): Set<string> {
  const next = new Set(selectedUuids);
  if (next.has(child.uuid)) {
    next.delete(child.uuid);
    return next;
  }

  next.add(child.uuid);
  if (!next.has(panel.uuid)) {
    next.add(panel.uuid);
  }
  return next;
}

export function isOrderButtonActive(test: CatalogTest, selectedUuids: Set<string>): boolean {
  if (test.isPanel) {
    const state = getPanelSelectionState(test, selectedUuids);
    return state.checked || state.indeterminate;
  }
  return selectedUuids.has(test.uuid);
}

export function isPanelMemberEnabled(panel: CatalogTest, selectedUuids: Set<string>): boolean {
  return selectedUuids.has(panel.uuid);
}

export interface SelectedCatalogItem {
  uuid: string;
  displayName: string;
  isPanel: boolean;
  isChild?: boolean;
  panelUuid?: string;
}

export function collectSelectedItems(tab: CatalogTab, selectedUuids: Set<string>): Array<SelectedCatalogItem> {
  const items: Array<SelectedCatalogItem> = [];

  const seen = new Set<string>();
  const pushOnce = (item: SelectedCatalogItem) => {
    if (seen.has(item.uuid)) {
      return;
    }
    seen.add(item.uuid);
    items.push(item);
  };

  const isOrderedAsPanel = (panel: CatalogTest): boolean =>
    panel.childTests.length > 0 &&
    selectedUuids.has(panel.uuid) &&
    panel.childTests.every((child) => selectedUuids.has(child.uuid));

  // Members of a fully-ordered panel are covered by that panel and must not also appear
  // on their own — even when the same concept is listed as a standalone test or belongs
  // to another panel in the catalog tree.
  const coveredByPanel = new Set<string>();
  for (const category of tab.categories) {
    for (const test of category.tests) {
      if (test.isPanel && isOrderedAsPanel(test)) {
        test.childTests.forEach((child) => coveredByPanel.add(child.uuid));
      }
    }
  }

  for (const category of tab.categories) {
    for (const test of category.tests) {
      if (test.isPanel) {
        if (isOrderedAsPanel(test)) {
          // The whole panel is one order; its members are not listed separately.
          pushOnce({ uuid: test.uuid, displayName: test.displayName, isPanel: true });
        } else {
          // Partial (or members-only) selection: each remaining member is its own order,
          // unless it is already covered by another panel ordered as a whole.
          for (const child of test.childTests) {
            if (selectedUuids.has(child.uuid) && !coveredByPanel.has(child.uuid)) {
              pushOnce({ uuid: child.uuid, displayName: child.displayName, isPanel: false });
            }
          }
        }
        continue;
      }

      if (selectedUuids.has(test.uuid) && !coveredByPanel.has(test.uuid)) {
        pushOnce({ uuid: test.uuid, displayName: test.displayName, isPanel: false });
      }
    }
  }

  return items;
}
