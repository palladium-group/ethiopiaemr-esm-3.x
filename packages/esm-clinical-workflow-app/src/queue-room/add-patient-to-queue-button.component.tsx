import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@carbon/react';
import { Add } from '@carbon/react/icons';
import { closeWorkspace, ExtensionSlot, launchWorkspace } from '@openmrs/esm-framework';
import { useServiceQueuesFilterState } from './service-queues-store.util';

const CREATE_QUEUE_ENTRY_WORKSPACE = 'create-queue-entry-workspace';

function usePatientSearchVisibility() {
  const [isOpen, setIsOpen] = useState(false);

  return {
    hidePatientSearch: useCallback(() => setIsOpen(false), []),
    isPatientSearchOpen: isOpen,
    showPatientSearch: useCallback(() => setIsOpen(true), []),
  };
}

/**
 * Uses the patient-search-button extension (from esm-patient-search-app) and the upstream
 * create-queue-entry-workspace, matching the default service-queues dashboard flow.
 */
const AddPatientToQueueButton: React.FC = () => {
  const { t } = useTranslation();
  const { selectedServiceUuid } = useServiceQueuesFilterState();
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const { isPatientSearchOpen, hidePatientSearch, showPatientSearch } = usePatientSearchVisibility();

  const handleReturnToSearchList = useCallback(() => {
    showPatientSearch();
    closeWorkspace(CREATE_QUEUE_ENTRY_WORKSPACE);
  }, [showPatientSearch]);

  return (
    <ExtensionSlot
      name="patient-search-button-slot"
      state={{
        buttonText: t('addPatientToQueue', 'Add patient to queue'),
        buttonProps: {
          kind: 'secondary',
          renderIcon: (props) => <Add size={16} {...props} />,
          size: 'sm',
        },
        handleReturnToSearchList,
        hidePatientSearch,
        isOpen: isPatientSearchOpen,
        searchQuery: patientSearchQuery,
        searchQueryUpdatedAction: (searchQuery: string) => setPatientSearchQuery(searchQuery),
        selectPatientAction: (selectedPatientUuid: string) => {
          hidePatientSearch();
          launchWorkspace(CREATE_QUEUE_ENTRY_WORKSPACE, {
            currentServiceQueueUuid: selectedServiceUuid,
            handleReturnToSearchList,
            selectedPatientUuid,
          });
        },
        showPatientSearch,
        workspaceTitle: t('addPatientToQueue', 'Add patient to queue'),
      }}
    />
  );
};

export default AddPatientToQueueButton;
