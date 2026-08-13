import { getGlobalStore } from '@openmrs/esm-framework';

const admitWorkspaceName = 'admit-patient-form-workspace';
const clinicalWorkflowModuleName = '@palladium-ethiopia/esm-clinical-workflow-app';

type WorkspaceRegistration = {
  moduleName?: string;
  [key: string]: unknown;
};

interface WorkspaceStoreState {
  registeredWorkspacesByName?: Record<string, WorkspaceRegistration>;
}

/**
 * Ward registers `admit-patient-form-workspace` at startup. Re-apply our registration
 * whenever the store changes so the Ethiopia admit flow wins regardless of module load order.
 */
export function registerAdmitWorkspaceOverride() {
  const workspaceStore = getGlobalStore<WorkspaceStoreState>('workspace');
  const workspace2Store = getGlobalStore<WorkspaceStoreState>('workspace2');
  let ourWorkspaceRegistration: WorkspaceRegistration | null = null;
  let ourWorkspace2Registration: WorkspaceRegistration | null = null;

  const captureOurRegistration = (store: ReturnType<typeof getGlobalStore<WorkspaceStoreState>>, slot: 'v1' | 'v2') => {
    const registration = store.getState().registeredWorkspacesByName?.[admitWorkspaceName];
    if (registration?.moduleName === clinicalWorkflowModuleName) {
      if (slot === 'v1') {
        ourWorkspaceRegistration = registration;
      } else {
        ourWorkspace2Registration = registration;
      }
    }
  };

  const enforceOverride = (
    store: ReturnType<typeof getGlobalStore<WorkspaceStoreState>>,
    registration: WorkspaceRegistration | null,
  ) => {
    if (!registration) {
      return;
    }

    const state = store.getState();
    const current = state.registeredWorkspacesByName?.[admitWorkspaceName];
    if (current?.moduleName === clinicalWorkflowModuleName) {
      return;
    }

    store.setState({
      registeredWorkspacesByName: {
        ...state.registeredWorkspacesByName,
        [admitWorkspaceName]: registration,
      },
    });
  };

  const sync = () => {
    captureOurRegistration(workspaceStore, 'v1');
    captureOurRegistration(workspace2Store, 'v2');
    enforceOverride(workspaceStore, ourWorkspaceRegistration);
    enforceOverride(workspace2Store, ourWorkspace2Registration);
  };

  sync();
  workspaceStore.subscribe(sync);
  workspace2Store.subscribe(sync);
}
