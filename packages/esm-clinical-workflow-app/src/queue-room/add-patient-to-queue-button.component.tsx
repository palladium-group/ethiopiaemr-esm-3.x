import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@carbon/react';
import { Add } from '@carbon/react/icons';
import { launchWorkspace2, type Workspace2DefinitionProps } from '@openmrs/esm-framework';
import { useServiceQueuesFilterState } from './service-queues-store.util';

const QUEUE_PATIENT_SEARCH_WORKSPACE = 'queue-patient-search-workspace';
const CREATE_QUEUE_ENTRY_WORKSPACE = 'create-queue-entry-workspace';
const QUEUE_PATIENT_SEARCH_START_VISIT_WORKSPACE = 'queue-patient-search-start-visit-workspace';

/**
 * Uses workspaces2 registered by @openmrs/esm-service-queues-app v10+.
 */
const AddPatientToQueueButton: React.FC = () => {
  const { t } = useTranslation();
  const { selectedServiceUuid } = useServiceQueuesFilterState();

  return (
    <Button
      kind="secondary"
      renderIcon={(props) => <Add size={16} {...props} />}
      size="sm"
      onClick={() => {
        launchWorkspace2(
          QUEUE_PATIENT_SEARCH_WORKSPACE,
          {
            initialQuery: '',
            workspaceTitle: t('addPatientToQueue', 'Add patient to queue'),
            onPatientSelected(
              _patientUuid: string,
              patient: fhir.Patient,
              launchChildWorkspace: Workspace2DefinitionProps['launchChildWorkspace'],
            ) {
              launchChildWorkspace(CREATE_QUEUE_ENTRY_WORKSPACE, {
                currentServiceQueueUuid: selectedServiceUuid,
                selectedPatientUuid: patient.id,
              });
            },
          },
          {
            startVisitWorkspaceName: QUEUE_PATIENT_SEARCH_START_VISIT_WORKSPACE,
          },
        ).catch(() => undefined);
      }}>
      {t('addPatientToQueue', 'Add patient to queue')}
    </Button>
  );
};

export default AddPatientToQueueButton;
