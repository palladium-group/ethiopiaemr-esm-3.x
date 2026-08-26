import { getGlobalStore } from '@openmrs/esm-framework';

const admitWorkspaceName = 'admit-patient-form-workspace';
const clinicalWorkflowModuleName = '@palladium-ethiopia/esm-clinical-workflow-app';

/**
 * Workspace v2 definition for Ethiopia admit.
 * Must not be declared in routes.json `workspaces2` — that name is already registered by
 * `@kenyaemr/esm-ward-app`, and duplicate registration throws, which aborts *all* other
 * clinical-workflow workspaces2 (including triage form entry).
 */
const ethiopiaAdmitWorkspace2 = {
  name: admitWorkspaceName,
  component: 'ethiopiaAdmitPatientFormWorkspace',
  window: 'kenyaemr-esm-ward-window',
  moduleName: clinicalWorkflowModuleName,
};

interface Workspace2StoreState {
  registeredWorkspacesByName?: Record<string, { moduleName?: string; [key: string]: unknown }>;
}

/**
 * Re-apply Ethiopia admit registration whenever workspace2 changes so our flow wins
 * regardless of module load order.
 *
 * Also keeps the legacy v1 workspace registration (routes.json `workspaces`) in place for
 * any callers still on the old workspace API; v1 allows overwrite, so routes.json is enough there.
 */
export function registerAdmitWorkspaceOverride() {
  const workspace2Store = getGlobalStore<Workspace2StoreState>('workspace2');

  const enforceOverride = () => {
    const state = workspace2Store.getState();
    const current = state.registeredWorkspacesByName?.[admitWorkspaceName];
    if (current?.moduleName === clinicalWorkflowModuleName) {
      return;
    }

    workspace2Store.setState({
      registeredWorkspacesByName: {
        ...state.registeredWorkspacesByName,
        [admitWorkspaceName]: ethiopiaAdmitWorkspace2,
      },
    });
  };

  enforceOverride();
  workspace2Store.subscribe(enforceOverride);
}
