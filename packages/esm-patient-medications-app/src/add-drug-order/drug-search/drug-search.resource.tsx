import { useCallback, useMemo } from 'react';
import { useSWRConfig } from 'swr';
import useSWRImmutable from 'swr/immutable';
import { type FetchResponse, openmrsFetch, restBaseUrl, useFeatureFlag, type Visit } from '@openmrs/esm-framework';
import {
  type Drug,
  type DosingUnit,
  type DrugOrderBasketItem,
  type DrugOrderTemplate,
  type OrderTemplate,
} from '@openmrs/esm-patient-common-lib';

export interface DrugSearchResult {
  uuid: string;
  display: string;
  name: string;
  strength: string;
  dosageForm: {
    display: string;
    uuid: string;
  };
  concept: {
    display: string;
    uuid: string;
  };
}

export interface ConceptTreeNode {
  uuid: string;
  display: string;
  isSet: boolean;
  setMembers?: Array<ConceptTreeNode>;
}

export interface ConceptSet {
  uuid: string;
  display: string;
}

interface ConceptFetchResponse {
  [uuid: string]: ConceptSet;
}

interface OrderTemplateResource {
  uuid: string;
  drug: Drug;
  name: string;
  template: string;
}

interface DrugListFetchResult {
  drugs: Array<DrugSearchResult>;
  errors: Array<Error>;
}

const maxConceptsPerRequest = 20;
const drugPageSize = 50;
const drugSearchRepresentation = 'custom:(uuid,display,name,strength,dosageForm:(display,uuid),concept:(display,uuid))';

// Limits upfront template requests until backend supports batch fetching (OEUI-312)
export const MAX_TEMPLATE_PREFETCH = 15;

/**
 * Search for a list of drugs based on the given query string or concepts (uuid/name/mapping)
 * @param query
 * @returns
 */
export function useDrugSearch(query: string) {
  const { data, ...rest } = useSWRImmutable<FetchResponse<{ results: Array<DrugSearchResult> }>, Error>(
    query ? `${restBaseUrl}/drug?q=${query}&v=${drugSearchRepresentation}` : null,
    openmrsFetch,
  );

  const results = useMemo(
    () => ({
      drugs: data?.data?.results,
      ...rest,
    }),
    [data, rest],
  );

  return results;
}

export function useConceptTree(conceptUuid: string) {
  const fetcher = (url: string) => openmrsFetch<ConceptTreeNode>(url).then((res) => res.data);

  const { data, error, isLoading } = useSWRImmutable<ConceptTreeNode, Error>(
    conceptUuid ? `${restBaseUrl}/concepttree?concept=${conceptUuid}` : null,
    fetcher,
  );

  return useMemo(
    () => ({
      tree: data,
      isLoading,
      error,
    }),
    [data, isLoading, error],
  );
}

export function useDrugsByConcepts(concepts: string[]) {
  const shouldFetch = concepts && concepts.length > 0;
  const sortedConcepts = [...concepts].sort();
  const cacheKey = shouldFetch ? ['drugs-by-uuids', ...sortedConcepts] : null;

  const { data, isLoading } = useSWRImmutable<DrugListFetchResult, Error>(cacheKey, async () => {
    const drugs: Array<DrugSearchResult> = [];
    const errors: Array<Error> = [];

    for (let start = 0; start < concepts.length; start += maxConceptsPerRequest) {
      const batch = concepts.slice(start, start + maxConceptsPerRequest);
      const conceptsParam = batch.join(',');
      try {
        let startIndex = 0;
        let hasMore = true;

        while (hasMore) {
          const response = await openmrsFetch<{ results: Array<DrugSearchResult> }>(
            `${restBaseUrl}/drug?concepts=${conceptsParam}&v=${drugSearchRepresentation}&limit=${drugPageSize}&startIndex=${startIndex}`,
          );
          const results = response.data?.results ?? [];
          drugs.push(...results);
          hasMore = results.length === drugPageSize;
          startIndex += drugPageSize;
        }
      } catch (e) {
        console.error(`Failed to fetch drugs for concepts: ${conceptsParam}`, e);
        errors.push(e instanceof Error ? e : new Error(String(e)));
      }
    }

    const deduped = Array.from(new Map(drugs.map((drug) => [drug.uuid, drug])).values());

    return { drugs: deduped, errors };
  });

  return useMemo(
    () => ({
      drugs: data?.drugs ?? [],
      errors: data?.errors ?? [],
      isLoading,
    }),
    [data, isLoading],
  );
}

export function useConceptSets(conceptSetUuids: string[] = []) {
  const url =
    conceptSetUuids.length > 0
      ? `${restBaseUrl}/conceptreferences?references=${conceptSetUuids.join(',')}&v=custom:(uuid,display)`
      : null;

  const { data, error, isLoading } = useSWRImmutable<{ data: ConceptFetchResponse }, Error>(url, openmrsFetch);

  return useMemo(() => {
    const conceptSets: ConceptSet[] = data?.data
      ? Object.values(data.data).map((concept) => ({
          uuid: concept.uuid,
          display: concept.display,
        }))
      : [];

    return {
      conceptSets,
      isLoading,
      error,
    };
  }, [data, isLoading, error]);
}

/**
 * Search for a list of order templates associated with the given drug.
 * Requires the ordertemplates module installed to work properly.
 * @param drugUuid
 * @returns
 */
export function useDrugTemplate(drugUuid: string): {
  isLoading: boolean;
  templates: Array<DrugOrderTemplate>;
  error: Error;
} {
  const isOrderTemplatesModuleInstalled = useFeatureFlag('ordertemplates-module');
  const { data, error, isLoading } = useSWRImmutable<
    FetchResponse<{
      results: Array<OrderTemplateResource>;
    }>,
    Error
  >(
    isOrderTemplatesModuleInstalled && drugUuid ? `${restBaseUrl}/ordertemplates/orderTemplate?drug=${drugUuid}` : null,
    openmrsFetch,
  );

  const results = useMemo(
    () => ({
      isLoading,
      templates: data?.data?.results?.map((drug) => ({
        ...drug,
        template: JSON.parse(drug.template) as OrderTemplate,
      })),
      error: error,
    }),
    [data, error, isLoading],
  );
  return results;
}

/**
 * Search for a list of order templates associated with drugs in the given array.
 * Requires the ordertemplates module installed to work properly.
 *
 * Caches results per individual drug UUID in SWR's cache so incremental searches
 * (typing letter by letter) reuse cached templates for drugs that appear across
 * multiple result sets, without triggering extra network requests.
 *
 * Note: Having a backend batch handler for multiple drug uuids would further reduce
 * requests. See: https://openmrs.atlassian.net/browse/OEUI-312
 */
export function useDrugTemplates(drugs: Drug[]) {
  const isOrderTemplatesModuleInstalled = useFeatureFlag('ordertemplates-module');
  const { cache, mutate } = useSWRConfig();

  const drugUuids = useMemo(() => drugs?.map((d) => d.uuid) ?? [], [drugs]);

  const getTemplateKey = useCallback(
    (drugUuid: string) =>
      isOrderTemplatesModuleInstalled && drugUuid
        ? `${restBaseUrl}/ordertemplates/orderTemplate?drug=${drugUuid}`
        : null,
    [isOrderTemplatesModuleInstalled],
  );

  // Split drugs into those already in SWR cache vs those that need fetching
  const { cachedTemplates, uncachedUuids } = useMemo(() => {
    const cachedTemplates = new Map<string, DrugOrderTemplate[]>();
    const uncachedUuids: string[] = [];

    for (const uuid of drugUuids) {
      const key = getTemplateKey(uuid);
      const entry = key ? cache.get(key) : undefined;
      if (entry?.data !== undefined) {
        const results = (entry.data as FetchResponse<{ results: Array<OrderTemplateResource> }>)?.data?.results ?? [];
        const templates = results.map((t) => ({
          ...t,
          template: JSON.parse(t.template) as OrderTemplate,
        }));
        if (templates.length) {
          cachedTemplates.set(uuid, templates);
        }
      } else {
        uncachedUuids.push(uuid);
      }
    }

    return { cachedTemplates, uncachedUuids };
  }, [drugUuids, cache, getTemplateKey]);

  // Only fetch the drugs not already in SWR cache
  const batchKey = uncachedUuids.length > 0 ? ['drug-templates-batch', ...uncachedUuids] : null;

  const {
    data: batchData,
    isLoading,
    error,
  } = useSWRImmutable(batchKey, async () => {
    const results = await Promise.all(
      uncachedUuids.map((uuid) =>
        openmrsFetch<{ results: Array<OrderTemplateResource> }>(
          `${restBaseUrl}/ordertemplates/orderTemplate?drug=${uuid}`,
        ),
      ),
    );
    // Populate individual SWR cache entries keyed by drug UUID so future
    // searches that include the same drug skip the network entirely
    uncachedUuids.forEach((uuid, i) => {
      const key = getTemplateKey(uuid);
      if (key) {
        mutate(key, results[i], { revalidate: false });
      }
    });
    return results.map((r, i) => ({
      uuid: uncachedUuids[i],
      templates: (r.data?.results ?? []).map((t) => ({
        ...t,
        template: JSON.parse(t.template) as OrderTemplate,
      })),
    }));
  });

  // Merge already-cached templates with the newly fetched ones
  const templateByDrugUuid = useMemo(() => {
    const map = new Map<string, DrugOrderTemplate[]>(cachedTemplates);
    for (const { uuid, templates } of batchData ?? []) {
      if (templates.length) {
        map.set(uuid, templates);
      }
    }
    return map;
  }, [cachedTemplates, batchData]);

  return { templateByDrugUuid, isLoading, error };
}

export function getDefault(template: OrderTemplate, prop: string) {
  return template.dosingInstructions[prop]?.find((x) => x.default) || template.dosingInstructions[prop]?.[0];
}

export function getTemplateDoseUnits(
  dosingInstructions?: OrderTemplate['dosingInstructions'],
): DosingUnit[] | undefined {
  if (!dosingInstructions) {
    return undefined;
  }
  const instructions = dosingInstructions as OrderTemplate['dosingInstructions'] & { unit?: DosingUnit[] };
  const units = instructions.unit ?? instructions.units;
  return units?.length ? units : undefined;
}

export function getDefaultDoseUnit(template: OrderTemplate): DosingUnit | undefined {
  const units = getTemplateDoseUnits(template.dosingInstructions);
  return units?.find((x) => x.default) ?? units?.[0];
}

export function getTemplateOrderBasketItem(
  drug: DrugSearchResult,
  visit: Visit,
  configDefaultDurationConcept?: {
    uuid: string;
    display: string;
  },
  template?: DrugOrderTemplate,
): DrugOrderBasketItem {
  if (template) {
    const defaultUnit =
      getDefaultDoseUnit(template.template) ??
      (drug?.dosageForm ? { value: drug?.dosageForm?.display, valueCoded: drug?.dosageForm?.uuid } : null);

    return {
      action: 'NEW',
      display: drug.display,
      drug,
      unit: defaultUnit,
      dosage: getDefault(template.template, 'dose')?.value,
      frequency: getDefault(template.template, 'frequency'),
      route: getDefault(template.template, 'route'),
      commonMedicationName: drug.display,
      isFreeTextDosage: false,
      patientInstructions: '',
      asNeeded: template.template.dosingInstructions.asNeeded || false,
      asNeededCondition: template.template.dosingInstructions.asNeededCondition,
      startDate: new Date(),
      duration: null,
      durationUnit: configDefaultDurationConcept
        ? {
            value: configDefaultDurationConcept?.display,
            valueCoded: configDefaultDurationConcept?.uuid,
          }
        : null,
      pillsDispensed: null,
      numRefills: null,
      freeTextDosage: '',
      indication: '',
      template: template.template,
      quantityUnits: getDefault(template.template, 'quantityUnits') ?? defaultUnit,
      visit,
    };
  }

  return {
    action: 'NEW',
    display: drug.display,
    drug,
    unit: drug?.dosageForm
      ? {
          value: drug?.dosageForm?.display,
          valueCoded: drug?.dosageForm?.uuid,
        }
      : null,
    dosage: null,
    frequency: null,
    route: null,
    commonMedicationName: drug.display,
    isFreeTextDosage: false,
    patientInstructions: '',
    asNeeded: false,
    asNeededCondition: null,
    startDate: new Date(),
    duration: null,
    durationUnit: configDefaultDurationConcept
      ? {
          value: configDefaultDurationConcept?.display,
          valueCoded: configDefaultDurationConcept?.uuid,
        }
      : null,
    pillsDispensed: null,
    numRefills: null,
    freeTextDosage: '',
    indication: '',
    quantityUnits: drug?.dosageForm
      ? {
          value: drug?.dosageForm?.display,
          valueCoded: drug?.dosageForm?.uuid,
        }
      : null,
    visit,
  };
}
