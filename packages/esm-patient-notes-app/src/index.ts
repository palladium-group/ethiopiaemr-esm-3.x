export * from '@openmrs/esm-patient-notes-app';

import {
  defineConfigSchema,
  getAsyncLifecycle,
  getSyncLifecycle,
  messageOmrsServiceWorker,
  restBaseUrl,
} from '@openmrs/esm-framework';
import { configSchema } from '@openmrs/esm-patient-notes-app/src/config-schema';
import notesOverviewExtension from '@openmrs/esm-patient-notes-app/src/notes/notes-overview.extension';
import visitNotesActionButtonExtension from '@openmrs/esm-patient-notes-app/src/visit-note-action-button.extension';

const moduleName = '@openmrs/esm-patient-notes-app';

const options = {
  featureName: 'patient-notes',
  moduleName,
};

export function startupApp() {
  messageOmrsServiceWorker({
    type: 'registerDynamicRoute',
    pattern: `.+${restBaseUrl}/encounter.+`,
  });

  defineConfigSchema(moduleName, configSchema);
}

export const notesOverview = getSyncLifecycle(notesOverviewExtension, options);
export const visitNotesActionButton = getSyncLifecycle(visitNotesActionButtonExtension, options);

// t('visitNoteWorkspaceTitle', 'Visit Note')
export const visitNotesFormWorkspace = getAsyncLifecycle(() => import('./notes/visit-notes-form.workspace'), options);
