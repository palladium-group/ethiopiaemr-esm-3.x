import { getGlobalStore } from '@openmrs/esm-framework';

const clinicalWorkflowModuleName = '@palladium-ethiopia/esm-clinical-workflow-app';

const MODAL_OVERRIDES: Array<[target: string, source: string]> = [
  ['move-queue-entry-modal', 'ethiopia-move-queue-entry-modal'],
  ['transition-patient-to-latest-queue-modal', 'ethiopia-transition-patient-to-latest-queue-modal'],
];

interface ModalEntry {
  name: string;
  load: () => Promise<unknown>;
  moduleName: string;
}

/**
 * Ensures upstream callers opening `move-queue-entry-modal` or `transition-patient-to-latest-queue-modal`
 * resolve to the clinical-workflow queue selector modals regardless of module load order.
 */
export function registerQueueModalsOverride() {
  const modalRegistryStore = getGlobalStore<{ modals?: Record<string, ModalEntry> }>('modalRegistry');

  const enforceOverride = () => {
    const modals = modalRegistryStore?.getState?.()?.modals;
    if (!modals) {
      return;
    }

    const updates = Object.fromEntries(
      MODAL_OVERRIDES.flatMap(([target, source]) => {
        const src = modals[source];
        return src && modals[target]?.moduleName !== clinicalWorkflowModuleName
          ? [[target, { name: target, load: src.load, moduleName: clinicalWorkflowModuleName }]]
          : [];
      }),
    );

    if (Object.keys(updates).length > 0) {
      modalRegistryStore.setState({ modals: { ...modals, ...updates } });
    }
  };

  enforceOverride();
  modalRegistryStore?.subscribe?.(enforceOverride);
}
