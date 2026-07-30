/** Community appointments booking form workspace (esm-appointments-app). */
export const APPOINTMENTS_FORM_WORKSPACE = 'appointments-form-workspace';

export const RADIOLOGY_APPOINTMENT_WORKSPACE = 'radiology-appointment-workspace';

interface OpenedWorkspaceState {
  workspaceName: string;
  props?: { patientUuid?: string } | null;
}

interface OpenedWindowState {
  openedWorkspaces?: Array<OpenedWorkspaceState>;
}

export interface Workspace2StoreState {
  openedWindows?: Array<OpenedWindowState>;
}

export function isAppointmentFormOpenForPatient(state: Workspace2StoreState, patientUuid: string): boolean {
  return (
    state.openedWindows?.some((window) =>
      window.openedWorkspaces?.some(
        (workspace) =>
          workspace.workspaceName === APPOINTMENTS_FORM_WORKSPACE && workspace.props?.patientUuid === patientUuid,
      ),
    ) ?? false
  );
}

export function isRadiologyAppointmentWorkspaceOpen(state: Workspace2StoreState): boolean {
  return (
    state.openedWindows?.some((window) =>
      window.openedWorkspaces?.some((workspace) => workspace.workspaceName === RADIOLOGY_APPOINTMENT_WORKSPACE),
    ) ?? false
  );
}
