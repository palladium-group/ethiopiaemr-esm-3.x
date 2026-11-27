import { getGlobalStore } from '@openmrs/esm-framework';

const createQueueEntryWorkspaceName = 'create-queue-entry-workspace';
const clinicalWorkflowModuleName = '@palladium-ethiopia/esm-clinical-workflow-app';

const ethiopiaCreateQueueEntryWorkspace2 = {
  name: createQueueEntryWorkspaceName,
  component: 'createQueueEntryWorkspace',
  window: 'add-queue-entry',
  moduleName: clinicalWorkflowModuleName,
};

interface Workspace2StoreState {
  registeredWorkspacesByName?: Record<string, { moduleName?: string; [key: string]: unknown }>;
}

export function registerCreateQueueEntryWorkspaceOverride() {
  const workspace2Store = getGlobalStore<Workspace2StoreState>('workspace2');

  const enforceOverride = () => {
    const state = workspace2Store?.getState?.();
    if (!state) {
      return;
    }
    const current = state.registeredWorkspacesByName?.[createQueueEntryWorkspaceName];
    if (current?.moduleName === clinicalWorkflowModuleName) {
      return;
    }

    workspace2Store.setState({
      registeredWorkspacesByName: {
        ...state.registeredWorkspacesByName,
        [createQueueEntryWorkspaceName]: ethiopiaCreateQueueEntryWorkspace2,
      },
    });
  };

  enforceOverride();
  workspace2Store?.subscribe?.(enforceOverride);
}
