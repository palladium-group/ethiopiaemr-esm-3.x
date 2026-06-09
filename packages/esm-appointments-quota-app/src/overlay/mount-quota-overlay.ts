import { getSyncLifecycle } from '@openmrs/esm-framework';
import { mountRootParcel } from 'single-spa';
import { moduleName } from '../constants';
import QuotaOverlay from './quota-overlay.component';

const OVERLAY_ROOT_ID = 'appointments-quota-overlay-root';

/**
 * Mounts the quota overlay once as a global single-spa parcel into a container
 * appended to `document.body`. Going through `getSyncLifecycle` ensures the
 * component gets the standard OpenMRS providers (i18n, SWR, config context).
 */
export function mountQuotaOverlay(): void {
  if (typeof document === 'undefined' || document.getElementById(OVERLAY_ROOT_ID)) {
    return;
  }

  const container = document.createElement('div');
  container.id = OVERLAY_ROOT_ID;
  document.body.appendChild(container);

  const lifecycle = getSyncLifecycle(QuotaOverlay, {
    featureName: 'appointments-quota-overlay',
    moduleName,
  });

  mountRootParcel(lifecycle as Parameters<typeof mountRootParcel>[0], { domElement: container });
}
