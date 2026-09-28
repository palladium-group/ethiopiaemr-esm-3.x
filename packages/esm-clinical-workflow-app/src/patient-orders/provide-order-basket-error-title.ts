import { provide } from '@openmrs/esm-framework';

const ordersModuleName = '@openmrs/esm-patient-orders-app';

/**
 * The order basket titles *every* save failure "Please try launching the workspace again" and puts
 * the backend's `error.message` in the subtitle. That title is wrong for a rejected order — relaunching
 * the workspace fixes nothing, and it buries the actual reason (e.g. the missing visit diagnosis that
 * `ethiopiaemrcore` enforces).
 *
 * `Translation overrides` is a reserved config key on every module, so we can retitle the notification
 * without forking `@openmrs/esm-patient-orders-app`. Provided config is the lowest-priority source, so
 * implementers can still override the wording in their own config file.
 */
export function provideOrderBasketErrorTitle() {
  const title = 'Unable to save orders';

  provide({
    [ordersModuleName]: {
      'Translation overrides': {
        en: { tryReopeningTheWorkspaceAgain: title },
        am: { tryReopeningTheWorkspaceAgain: title },
      },
    },
  });
}
