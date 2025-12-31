import {
  defineConfigSchema,
  getAsyncLifecycle,
  getGlobalStore,
  getSyncLifecycle,
  messageOmrsServiceWorker,
  restBaseUrl,
} from '@openmrs/esm-framework';
import { configSchema } from '@openmrs/esm-patient-notes-app/src/config-schema';
import visitNotesActionButtonExtension from './notes/visit-note-action-button.extension';

const moduleName = '@openmrs/esm-patient-notes-app';

const options = {
  featureName: 'patient-notes',
  moduleName,
};

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

export function startupApp() {
  messageOmrsServiceWorker({
    type: 'registerDynamicRoute',
    pattern: `.+${restBaseUrl}/encounter.+`,
  });

  defineConfigSchema(moduleName, configSchema);

  // Remove the core visit-note workspace window since we're providing a custom one
  const workspace2Store = getGlobalStore<any>('workspace2');
  const removeCoreButton = () => {
    const state = workspace2Store.getState();
    if (state.registeredWindowsByName['visit-note']) {
      const newWindows = { ...state.registeredWindowsByName };
      delete newWindows['visit-note'];
      workspace2Store.setState({
        registeredWindowsByName: newWindows,
      });
    }
  };

  // Try immediately and also subscribe to handle cases where the core module registers later
  removeCoreButton();
  workspace2Store.subscribe(removeCoreButton);
}

export const visitNoteActionButton = getSyncLifecycle(visitNotesActionButtonExtension, options);

// t('visitNoteWorkspaceTitle', 'Visit Note')
export const visitNotesFormWorkspace = getAsyncLifecycle(
  () => import('./notes/visit-notes-form-shadow.workspace'),
  options,
);
