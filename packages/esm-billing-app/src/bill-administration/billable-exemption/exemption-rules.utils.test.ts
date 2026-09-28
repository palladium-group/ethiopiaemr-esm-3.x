import {
  buildKey,
  parseExemptions,
  parseKey,
  removeRule,
  ruleId,
  serializeExemptions,
  unescapeHtml,
  upsertRule,
} from './exemption-rules.utils';

const hemorrhage = { concept: 'uuid-228', description: 'Antepartum Hemorrhage' };
const malaria = { concept: 'uuid-32', description: 'Malaria Smear' };

describe('exemption rules utils', () => {
  it.each([
    ['all', { criterion: 'all', allItems: false }],
    ['program:HIV', { criterion: 'program', value: 'HIV', allItems: false }],
    ['program:HIV:all', { criterion: 'program', value: 'HIV', allItems: true }],
    [
      'location:Gynecology & Obstetric Department',
      { criterion: 'location', value: 'Gynecology & Obstetric Department', allItems: false },
    ],
    ['location:Mathare:all', { criterion: 'location', value: 'Mathare', allItems: true }],
    ['age<5', { criterion: 'ageUnder', value: '5', allItems: false }],
    ['age&lt;5', { criterion: 'ageUnder', value: '5', allItems: false }],
    ['age>60', { criterion: 'ageOver', value: '60', allItems: false }],
    ['visitAttribute:IN_PRISON', { criterion: 'visitAttribute', value: 'IN_PRISON', allItems: false }],
  ])('parses key %s', (key, expected) => {
    expect(parseKey(key)).toEqual(expected);
    expect(buildKey(parseKey(key))).toBe(unescapeHtml(key));
  });

  it.each(['all:all', 'program:', 'age<five', 'somethingElse:x'])('does not parse unsupported key %s', (key) => {
    expect(parseKey(key)).toBeNull();
  });

  it('undoes repeated HTML escaping in keys', () => {
    expect(unescapeHtml('location:Gynecology &amp;amp; Obstetric Department')).toBe(
      'location:Gynecology & Obstetric Department',
    );
  });

  it('round-trips a config and writes :all rules as empty lists', () => {
    const raw = JSON.stringify({
      services: {
        'location:Gynecology & Obstetric Department': [hemorrhage],
        'program:TB:all': [],
        'age<5': [{ concept: 32, description: 'Malaria Smear' }],
      },
      commodities: {},
    });

    const config = parseExemptions(raw);
    expect(config.rules).toHaveLength(3);
    expect(serializeExemptions(config)).toEqual(JSON.parse(raw));
  });

  it('keeps unrecognised keys untouched', () => {
    const config = parseExemptions(JSON.stringify({ services: { 'all:all': [], custom: 'x' }, commodities: {} }));

    expect(config.rules).toHaveLength(0);
    expect(serializeExemptions(config).services).toEqual({ 'all:all': [], custom: 'x' });
  });

  it('merges an escaped and an unescaped copy of the same key', () => {
    const config = parseExemptions(
      JSON.stringify({
        services: {
          'location:A &amp;amp; B': [hemorrhage],
          'location:A & B': [malaria],
        },
      }),
    );

    expect(config.rules).toHaveLength(1);
    expect(serializeExemptions(config).services).toEqual({ 'location:A & B': [hemorrhage, malaria] });
  });

  it('returns an empty config for an empty value and throws for invalid JSON', () => {
    expect(parseExemptions('').rules).toEqual([]);
    expect(() => parseExemptions('{not json')).toThrow();
  });

  it('adds, merges, edits and removes rules', () => {
    let config = parseExemptions('');

    config = upsertRule(config, {
      section: 'services',
      criterion: 'location',
      value: 'Clinic',
      allItems: false,
      items: [hemorrhage],
    });
    config = upsertRule(config, {
      section: 'services',
      criterion: 'location',
      value: 'Clinic',
      allItems: false,
      items: [hemorrhage, malaria],
    });
    expect(config.rules).toHaveLength(1);
    expect(config.rules[0].items).toEqual([hemorrhage, malaria]);

    const id = ruleId('services', 'location:Clinic');
    config = upsertRule(
      config,
      { section: 'services', criterion: 'location', value: 'Clinic', allItems: true, items: [] },
      id,
    );
    expect(serializeExemptions(config).services).toEqual({ 'location:Clinic:all': [] });

    config = removeRule(config, ruleId('services', 'location:Clinic:all'));
    expect(serializeExemptions(config)).toEqual({ services: {}, commodities: {} });
  });
});
