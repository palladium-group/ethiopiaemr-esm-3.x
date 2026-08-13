import { readShrAdminEnabled, SHR_ADMIN_ENABLED_PROPERTY } from './use-shr-admin-enabled';

const setting = (value: unknown) => [{ property: SHR_ADMIN_ENABLED_PROPERTY, value }] as never;

describe('readShrAdminEnabled', () => {
  it('enables the feature only for the exact string "true"', () => {
    expect(readShrAdminEnabled(setting('true'))).toBe(true);
    expect(readShrAdminEnabled(setting('TRUE'))).toBe(true);
    expect(readShrAdminEnabled(setting('  true  '))).toBe(true);
  });

  it('leaves the feature off for anything that is not "true"', () => {
    expect(readShrAdminEnabled(setting('false'))).toBe(false);
    expect(readShrAdminEnabled(setting(''))).toBe(false);
    expect(readShrAdminEnabled(setting('yes'))).toBe(false);
    expect(readShrAdminEnabled(setting('1'))).toBe(false);
  });

  it('leaves the feature off when the value is not a string', () => {
    // The server stores global properties as text, but a stray boolean or null must not be coerced
    // into enabling the feature.
    expect(readShrAdminEnabled(setting(true))).toBe(false);
    expect(readShrAdminEnabled(setting(null))).toBe(false);
    expect(readShrAdminEnabled(setting(undefined))).toBe(false);
  });

  it('leaves the feature off while loading or when the request failed', () => {
    expect(readShrAdminEnabled(undefined)).toBe(false);
    expect(readShrAdminEnabled([] as never)).toBe(false);
  });

  it('ignores neighbouring properties the search happened to match', () => {
    const results = [
      { property: 'ethiopiaemrshr.shrAdminEnabledSomethingElse', value: 'true' },
      { property: SHR_ADMIN_ENABLED_PROPERTY, value: 'false' },
    ] as never;
    expect(readShrAdminEnabled(results)).toBe(false);
  });

  it('finds the exact property regardless of result order', () => {
    const results = [
      { property: 'ethiopiaemrshr.allowUntrustedSsl', value: 'false' },
      { property: SHR_ADMIN_ENABLED_PROPERTY, value: 'true' },
    ] as never;
    expect(readShrAdminEnabled(results)).toBe(true);
  });
});
