import { createGlobalStore } from '@openmrs/esm-framework';
import type { AppointmentQuotaLaunchProps } from '../types';

export const QUOTA_OVERLAY_STORE = 'appointments-quota-overlay';

export interface QuotaOverlayState {
  /** Whether the overlay is currently shown on screen. */
  visible: boolean;
  /** Set when the user explicitly closes the overlay; suppresses auto-show until reset. */
  dismissed: boolean;
  /** Current quota inputs (service / date / time) driving the panel. */
  props: AppointmentQuotaLaunchProps;
}

const initialState: QuotaOverlayState = {
  visible: false,
  dismissed: false,
  props: {},
};

export const quotaOverlayStore = createGlobalStore<QuotaOverlayState>(QUOTA_OVERLAY_STORE, initialState);

/**
 * Auto-show driven by the booking form. Called on every new booking-form event
 * (service / date / time change), so it re-opens the overlay each time even if
 * the user had closed it — a fresh change always brings capacity back into view.
 */
export function syncQuotaOverlay(props: AppointmentQuotaLaunchProps): void {
  quotaOverlayStore.setState({
    props,
    dismissed: false,
    visible: true,
  });
}

/** Manual open (e.g. the "Check availability" tile). Clears any prior dismissal. */
export function openQuotaOverlay(props?: AppointmentQuotaLaunchProps): void {
  const current = quotaOverlayStore.getState();
  quotaOverlayStore.setState({
    props: props ?? current.props,
    dismissed: false,
    visible: true,
  });
}

/** User closed the overlay; keep it hidden until the form is reset/reopened. */
export function dismissQuotaOverlay(): void {
  const current = quotaOverlayStore.getState();
  quotaOverlayStore.setState({ ...current, visible: false, dismissed: true });
}

/** Full reset — used when the booking form closes or a new instance opens. */
export function resetQuotaOverlay(): void {
  quotaOverlayStore.setState({ ...initialState });
}
