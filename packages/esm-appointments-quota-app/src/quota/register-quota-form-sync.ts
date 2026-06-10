import { getConfig, getGlobalStore } from '@openmrs/esm-framework';
import { fetchAppointmentServicesFull } from '../api/quota.resource';
import { BOOKING_FORM_WORKSPACE_NAMES, moduleName } from '../constants';
import { type ConfigObject } from '../config-schema';
import { deriveQuotaPropsFromFormProps } from './quota-form-props.helper';
import {
  buildQuotaPropsFromSnapshot,
  getBookingFormUpdateKey,
  readBookingFormSnapshotFromDom,
  type BookingFormSnapshot,
} from './quota-form-dom.helper';
import { resetQuotaOverlay, syncQuotaOverlay } from '../overlay/quota-overlay.store';
import type { AppointmentQuotaLaunchProps } from '../types';

interface OpenedWorkspaceState {
  workspaceName: string;
  props: Record<string, unknown> | null;
  uuid: string;
  hasUnsavedChanges: boolean;
}

interface OpenedWindowState {
  windowName: string;
  openedWorkspaces: Array<OpenedWorkspaceState>;
  hidden: boolean;
}

interface Workspace2StoreState {
  registeredWorkspacesByName: Record<string, { window: string }>;
  openedWindows: Array<OpenedWindowState>;
}

function isBookingFormWorkspaceName(name: string | undefined): boolean {
  return BOOKING_FORM_WORKSPACE_NAMES.includes(name as (typeof BOOKING_FORM_WORKSPACE_NAMES)[number]);
}

/**
 * Finds the focused booking form across any workspace window (appointments
 * dashboard, patient chart, etc.). Mirrors workspace2's "last non-hidden window"
 * focus rule.
 */
function findActiveBookingForm(state: Workspace2StoreState): OpenedWorkspaceState | null {
  for (let i = state.openedWindows.length - 1; i >= 0; i--) {
    const openedWindow = state.openedWindows[i];

    if (openedWindow.hidden) {
      continue;
    }

    const leafWorkspace = openedWindow.openedWorkspaces[openedWindow.openedWorkspaces.length - 1];

    if (isBookingFormWorkspaceName(leafWorkspace?.workspaceName)) {
      return leafWorkspace;
    }
  }

  return null;
}

function isBookingFormActive(state: Workspace2StoreState): boolean {
  return findActiveBookingForm(state) !== null;
}

async function enrichQuotaPropsWithService(
  snapshot: BookingFormSnapshot,
  baseProps: AppointmentQuotaLaunchProps,
): Promise<AppointmentQuotaLaunchProps> {
  const props = { ...baseProps };

  if (props.serviceUuid || !snapshot.serviceName) {
    return props;
  }

  const services = await fetchAppointmentServicesFull();
  const matchedService = services.find((service) => service.name === snapshot.serviceName);

  if (matchedService) {
    props.serviceUuid = matchedService.uuid;
  }

  return props;
}

function buildInitialQuotaProps(formWorkspaceProps: Record<string, unknown> | null): AppointmentQuotaLaunchProps {
  return deriveQuotaPropsFromFormProps(formWorkspaceProps);
}

/**
 * Watches the community appointment booking form and mirrors its service / date /
 * time selections into the quota overlay store. Uses DOM polling + event hints
 * because the community form's internal state is not directly accessible.
 */
export function registerAppointmentQuotaFormSync() {
  const workspace2Store = getGlobalStore<Workspace2StoreState>('workspace2');
  let config: ConfigObject = {
    enabled: true,
    warnThresholdPercent: 80,
    countStatuses: [],
    autoOpenOnBookingForm: true,
  };
  let lastUpdateKey = '';
  let syncInFlight = false;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  /** UUID of the booking form workspace instance we last tracked. */
  let trackedFormUuid: string | null = null;

  getConfig<ConfigObject>(moduleName)
    .then((loadedConfig) => {
      config = loadedConfig;
      tryStartSyncForCurrentState();
    })
    .catch((error) => {
      console.error('[appointments-quota] Failed to load config for booking-form sync.', error);
    });

  const onBookingFormClosed = () => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    trackedFormUuid = null;
    lastUpdateKey = '';
    resetQuotaOverlay();
  };

  const syncQuotaPanel = async (snapshot: BookingFormSnapshot, formWorkspaceProps: Record<string, unknown> | null) => {
    if (syncInFlight) {
      return;
    }

    syncInFlight = true;

    try {
      let quotaProps = buildQuotaPropsFromSnapshot(snapshot);
      quotaProps = { ...buildInitialQuotaProps(formWorkspaceProps), ...quotaProps };
      quotaProps = await enrichQuotaPropsWithService(snapshot, quotaProps);

      syncQuotaOverlay(quotaProps);
    } catch (error) {
      console.error('[appointments-quota] Failed to sync quota panel from booking form.', error);
    } finally {
      syncInFlight = false;
    }
  };

  const pollBookingForm = () => {
    if (!config.enabled || !config.autoOpenOnBookingForm) {
      return;
    }

    const state = workspace2Store.getState();

    if (!isBookingFormActive(state)) {
      onBookingFormClosed();
      return;
    }

    const formWorkspace = findActiveBookingForm(state);

    // Show the overlay as soon as the booking form opens (new workspace instance).
    if (formWorkspace && formWorkspace.uuid !== trackedFormUuid) {
      trackedFormUuid = formWorkspace.uuid;
      lastUpdateKey = '';
      syncQuotaOverlay(buildInitialQuotaProps(formWorkspace.props ?? null));
    }

    const snapshot = readBookingFormSnapshotFromDom();
    const updateKey = getBookingFormUpdateKey(snapshot);

    if (updateKey === lastUpdateKey) {
      return;
    }

    lastUpdateKey = updateKey;
    syncQuotaPanel(snapshot, formWorkspace?.props ?? null).catch(() => {
      // syncQuotaPanel already logs internally; swallow to avoid an unhandled rejection.
    });
  };

  const ensurePolling = () => {
    if (pollTimer) {
      return;
    }

    pollTimer = setInterval(pollBookingForm, 400);
    pollBookingForm();
  };

  /** Start sync when the booking form is already open (module lazy-loaded after form mount). */
  const tryStartSyncForCurrentState = () => {
    if (!config.enabled || !config.autoOpenOnBookingForm) {
      return;
    }

    if (isBookingFormActive(workspace2Store.getState())) {
      ensurePolling();
    }
  };

  workspace2Store.subscribe((state) => {
    if (!config.enabled || !config.autoOpenOnBookingForm) {
      onBookingFormClosed();
      return;
    }

    if (isBookingFormActive(state)) {
      ensurePolling();
      return;
    }

    onBookingFormClosed();
  });

  tryStartSyncForCurrentState();

  const schedulePoll = () => {
    // Defer so React can finish rendering recurring fields / date segments.
    setTimeout(pollBookingForm, 50);
  };

  // Carbon's native select/input elements fire bubbling change events — use them
  // for a fast-path poll on service and time fields.
  document.addEventListener(
    'change',
    (event) => {
      if (!config.enabled || !config.autoOpenOnBookingForm) {
        return;
      }

      const target = event.target;

      if (!(target instanceof HTMLElement)) {
        return;
      }

      if (
        target.id === 'service' ||
        target.id === 'time-picker' ||
        target.id === 'time-picker-select-1' ||
        target.id === 'duration'
      ) {
        pollBookingForm();
      }
    },
    true,
  );

  // Recurring/all-day toggles and the React Aria date range picker do not emit
  // reliable bubbling change events — poll after click instead.
  document.addEventListener(
    'click',
    (event) => {
      if (!config.enabled || !config.autoOpenOnBookingForm) {
        return;
      }

      const target = event.target;

      if (!(target instanceof HTMLElement)) {
        return;
      }

      if (
        target.closest('#recurringToggle') ||
        target.closest('#allDayToggle') ||
        target.closest('#appointmentRecurringDateRangePicker') ||
        target.closest('[data-testid="appointmentRecurringDateRangePicker"]')
      ) {
        schedulePoll();
      }
    },
    true,
  );
}

/** @deprecated Use registerAppointmentQuotaFormSync */
export const registerAppointmentQuotaAutoOpen = registerAppointmentQuotaFormSync;
