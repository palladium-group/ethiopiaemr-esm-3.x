import { getConfig, getGlobalStore } from '@openmrs/esm-framework';
import { type ConfigObject } from '../config-schema';
import { BOOKING_FORM_WORKSPACE_NAMES, moduleName } from '../constants';

interface OpenedWorkspaceState {
  workspaceName: string;
  uuid: string;
}

interface OpenedWindowState {
  openedWorkspaces: Array<OpenedWorkspaceState>;
}

interface Workspace2StoreState {
  openedWindows: Array<OpenedWindowState>;
}

/** The toggle mounts a render or two after the workspace itself opens. */
const TOGGLE_WAIT_MS = 5000;
const POLL_INTERVAL_MS = 100;

function findBookingFormWorkspace(state: Workspace2StoreState): OpenedWorkspaceState | null {
  for (const openedWindow of state.openedWindows ?? []) {
    const bookingForm = openedWindow.openedWorkspaces?.find((workspace) =>
      BOOKING_FORM_WORKSPACE_NAMES.includes(workspace.workspaceName as (typeof BOOKING_FORM_WORKSPACE_NAMES)[number]),
    );

    if (bookingForm) {
      return bookingForm;
    }
  }

  return null;
}

/**
 * Switches the All Day toggle off. Returns `false` while the toggle has not been
 * rendered yet so the caller can retry.
 */
function switchAllDayToggleOff(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }

  // Carbon v11 — renders as <button role="switch" aria-checked="true|false">
  const button = document.querySelector<HTMLButtonElement>('button#allDayToggle[role="switch"]');

  if (button) {
    if (button.getAttribute('aria-checked') === 'true') {
      button.click();
    }

    return true;
  }

  // Carbon v10 — renders as <input type="checkbox">
  const checkbox = document.querySelector<HTMLInputElement>('input#allDayToggle[type="checkbox"]');

  if (checkbox) {
    if (checkbox.checked) {
      checkbox.click();
    }

    return true;
  }

  return false;
}

/**
 * The community booking form seeds `isAllDayAppointment` from the same
 * `allowAllDayAppointments` config flag that decides whether the All Day toggle is
 * rendered, so allowing all-day appointments also makes every appointment default to
 * all-day. This switches the toggle back off once per form instance, leaving it
 * available for the user to turn on deliberately.
 */
export function registerBookingFormAllDayDefault() {
  const workspace2Store = getGlobalStore<Workspace2StoreState>('workspace2');
  let isEnabled = false;
  /** UUID of the booking form instance the default was already applied to. */
  let handledFormUuid: string | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let waitedMs = 0;

  const stopWaitingForToggle = () => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }

    waitedMs = 0;
  };

  const waitForToggle = () => {
    if (switchAllDayToggleOff()) {
      stopWaitingForToggle();
      return;
    }

    waitedMs += POLL_INTERVAL_MS;

    // The toggle is hidden when all-day appointments are not allowed — give up.
    if (waitedMs >= TOGGLE_WAIT_MS) {
      stopWaitingForToggle();
    }
  };

  const handleWorkspaceState = (state: Workspace2StoreState) => {
    if (!isEnabled) {
      return;
    }

    const bookingForm = findBookingFormWorkspace(state);

    if (!bookingForm) {
      handledFormUuid = null;
      stopWaitingForToggle();
      return;
    }

    if (bookingForm.uuid === handledFormUuid) {
      return;
    }

    handledFormUuid = bookingForm.uuid;
    stopWaitingForToggle();

    if (!switchAllDayToggleOff()) {
      pollTimer = setInterval(waitForToggle, POLL_INTERVAL_MS);
    }
  };

  workspace2Store.subscribe(handleWorkspaceState);

  getConfig<ConfigObject>(moduleName)
    .then((config) => {
      isEnabled = config.defaultAllDayToggleOff;
      // The module is lazy-loaded from a slot inside the form, so the form is
      // usually already open by the time the config resolves.
      handleWorkspaceState(workspace2Store.getState());
    })
    .catch((error) => {
      console.error('[appointments-quota] Failed to load config for the booking-form all-day default.', error);
    });
}
