/**
 * Converts between the `kenyaemr.billing.exemptions` global property JSON and a list of
 * exemption rules that the UI can edit.
 *
 * The JSON has the shape `{ services: { <key>: Item[] }, commodities: { <key>: Item[] } }`.
 * Each key encodes who the exemption applies to; see `buildKey` for the supported forms.
 */

export type ExemptionSection = 'services' | 'commodities';

export type ExemptionCriterion = 'all' | 'program' | 'location' | 'ageUnder' | 'ageOver' | 'visitAttribute';

export interface ExemptionItem {
  /** Concept UUID (preferred) or a legacy integer concept ID */
  concept: string | number;
  description: string;
}

export interface ExemptionRule {
  /** Stable identity: section + generated key */
  id: string;
  section: ExemptionSection;
  criterion: ExemptionCriterion;
  /** Program name, location name, age or visit attribute value. Unused for `all`. */
  value?: string;
  /** Exempt every service/commodity for matching patients (written as `<key>:all: []`) */
  allItems: boolean;
  items: Array<ExemptionItem>;
}

export type UnrecognisedEntries = Record<ExemptionSection, Record<string, unknown>>;

export interface ExemptionsConfig {
  rules: Array<ExemptionRule>;
  /** Keys this UI does not understand. They are kept untouched when saving. */
  unrecognised: UnrecognisedEntries;
}

export interface ExemptionsJson {
  services: Record<string, Array<ExemptionItem>>;
  commodities: Record<string, Array<ExemptionItem>>;
  [key: string]: unknown;
}

export const EXEMPTIONS_GLOBAL_PROPERTY = 'kenyaemr.billing.exemptions';

const SECTIONS: Array<ExemptionSection> = ['services', 'commodities'];
const ALL_SUFFIX = ':all';

export const criteriaSupportingAllItems: Array<ExemptionCriterion> = [
  'program',
  'location',
  'ageUnder',
  'ageOver',
  'visitAttribute',
];

/** Undoes HTML escaping (possibly applied several times) left behind by the legacy admin form. */
export function unescapeHtml(value: string): string {
  let current = value;
  let previous: string;
  do {
    previous = current;
    current = previous
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&');
  } while (current !== previous);
  return current;
}

export function buildKey(rule: Pick<ExemptionRule, 'criterion' | 'value' | 'allItems'>): string {
  const value = rule.value?.trim() ?? '';
  let key: string;
  switch (rule.criterion) {
    case 'all':
      return 'all';
    case 'program':
      key = `program:${value}`;
      break;
    case 'location':
      key = `location:${value}`;
      break;
    case 'ageUnder':
      key = `age<${value}`;
      break;
    case 'ageOver':
      key = `age>${value}`;
      break;
    case 'visitAttribute':
      key = `visitAttribute:${value}`;
      break;
  }
  return rule.allItems ? `${key}${ALL_SUFFIX}` : key;
}

export function ruleId(section: ExemptionSection, key: string) {
  return `${section}|${key}`;
}

/** Returns the rule described by `key`, or null when the key is not a supported form. */
export function parseKey(rawKey: string): Omit<ExemptionRule, 'id' | 'section' | 'items'> | null {
  let key = unescapeHtml(rawKey.trim());
  const allItems = key.toLowerCase().endsWith(ALL_SUFFIX) && key.toLowerCase() !== 'all';
  if (allItems) {
    key = key.slice(0, -ALL_SUFFIX.length);
  }

  if (key.toLowerCase() === 'all') {
    return allItems ? null : { criterion: 'all', allItems: false };
  }

  const prefixed: Array<[string, ExemptionCriterion]> = [
    ['program:', 'program'],
    ['location:', 'location'],
    ['visitattribute:', 'visitAttribute'],
  ];
  for (const [prefix, criterion] of prefixed) {
    if (key.toLowerCase().startsWith(prefix)) {
      const value = key.slice(prefix.length).trim();
      return value ? { criterion, value, allItems } : null;
    }
  }

  const age = key.match(/^age\s*([<>])\s*(\d+)$/i);
  if (age) {
    return { criterion: age[1] === '<' ? 'ageUnder' : 'ageOver', value: age[2], allItems };
  }

  return null;
}

function normalizeItems(value: unknown): Array<ExemptionItem> | null {
  if (!Array.isArray(value)) {
    return null;
  }
  return value
    .filter((item) => item && typeof item === 'object' && item.concept !== undefined && item.concept !== null)
    .map((item) => ({ concept: item.concept, description: item.description ?? '' }));
}

function mergeItems(existing: Array<ExemptionItem>, incoming: Array<ExemptionItem>) {
  const seen = new Set(existing.map((item) => String(item.concept)));
  return [...existing, ...incoming.filter((item) => !seen.has(String(item.concept)))];
}

export function emptyConfig(): ExemptionsConfig {
  return { rules: [], unrecognised: { services: {}, commodities: {} } };
}

/** Parses the global property value. Throws if the value is not valid JSON. */
export function parseExemptions(raw: string | null | undefined): ExemptionsConfig {
  const config = emptyConfig();
  if (!raw || !raw.trim()) {
    return config;
  }

  const json = JSON.parse(raw);
  for (const section of SECTIONS) {
    const entries = json?.[section];
    if (!entries || typeof entries !== 'object') {
      continue;
    }

    for (const [rawKey, value] of Object.entries(entries)) {
      const parsed = parseKey(rawKey);
      const items = normalizeItems(value);
      if (!parsed || !items) {
        config.unrecognised[section][rawKey] = value;
        continue;
      }

      const id = ruleId(section, buildKey(parsed));
      const existing = config.rules.find((rule) => rule.id === id);
      if (existing) {
        // e.g. an escaped and an unescaped copy of the same key
        existing.items = mergeItems(existing.items, items);
      } else {
        config.rules.push({ id, section, ...parsed, items: parsed.allItems ? [] : items });
      }
    }
  }
  return config;
}

export function serializeExemptions(config: ExemptionsConfig): ExemptionsJson {
  const json: ExemptionsJson = {
    services: { ...config.unrecognised.services } as ExemptionsJson['services'],
    commodities: { ...config.unrecognised.commodities } as ExemptionsJson['commodities'],
  };

  for (const rule of config.rules) {
    const key = buildKey(rule);
    const items = rule.allItems ? [] : rule.items.map(({ concept, description }) => ({ concept, description }));
    const existing = json[rule.section][key];
    json[rule.section][key] = Array.isArray(existing) ? mergeItems(existing, items) : items;
  }
  return json;
}

/**
 * Adds or replaces a rule. When `previousId` is given the old rule is removed first (editing
 * a rule can change its key). A rule whose key already exists is merged into that rule.
 */
export function upsertRule(
  config: ExemptionsConfig,
  rule: Omit<ExemptionRule, 'id'>,
  previousId?: string,
): ExemptionsConfig {
  const id = ruleId(rule.section, buildKey(rule));
  const rules = config.rules.filter((existing) => existing.id !== previousId);
  const target = rules.find((existing) => existing.id === id);
  const items = rule.allItems ? [] : rule.items;

  const nextRules = target
    ? rules.map((existing) =>
        existing.id === id ? { ...existing, items: rule.allItems ? [] : mergeItems(existing.items, items) } : existing,
      )
    : [...rules, { ...rule, id, items }];

  return { ...config, rules: nextRules };
}

export function removeRule(config: ExemptionsConfig, id: string): ExemptionsConfig {
  return { ...config, rules: config.rules.filter((rule) => rule.id !== id) };
}

export function findRule(config: ExemptionsConfig, rule: Omit<ExemptionRule, 'id'>) {
  const id = ruleId(rule.section, buildKey(rule));
  return config.rules.find((existing) => existing.id === id);
}
