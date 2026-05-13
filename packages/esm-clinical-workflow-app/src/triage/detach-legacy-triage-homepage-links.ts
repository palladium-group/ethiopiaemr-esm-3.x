import { detach } from '@openmrs/esm-framework';

const HOMEPAGE_DASHBOARD_SLOT = 'homepage-dashboard-slot';

/**
 * Other distributions (e.g. Kenya EMR express workflow) attach a generic
 * `triage-dashboard-link` ("Triage") to the home sidebar. Ethiopia uses
 * per-variant links registered from `triageDefinitions`, so detach the legacy id.
 */
const LEGACY_GENERIC_TRIAGE_LINK_IDS = ['triage-dashboard-link'] as const;

export function detachLegacyGenericTriageHomepageLinks(): void {
  for (const extensionId of LEGACY_GENERIC_TRIAGE_LINK_IDS) {
    detach(HOMEPAGE_DASHBOARD_SLOT, extensionId);
  }
}

/**
 * Runs detach a few times across the microfrontend registration tick so we still
 * win if another module attaches the legacy link after our first `startupApp` run.
 */
export function scheduleDetachLegacyGenericTriageHomepageLinks(): void {
  const run = () => detachLegacyGenericTriageHomepageLinks();
  run();
  queueMicrotask(run);
  setTimeout(run, 0);
  setTimeout(run, 100);
}
