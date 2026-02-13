import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Button,
  ComboBox,
  InlineLoading,
  InlineNotification,
  Stack,
  RadioButtonGroup,
  RadioButton,
  Tag,
  FormGroup,
} from '@carbon/react';
import {
  DefaultWorkspaceProps,
  ExtensionSlot,
  fetchCurrentPatient,
  showSnackbar,
  useConfig,
  usePatient,
  useSession,
  useVisit,
} from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import type { TriageVariantConfig, ClinicalWorkflowConfig } from '../config-schema';
import { useQueueLocations, useQueues, createQueueEntry } from './queue.resource';
import { getCurrentVisitForPatient, createVisitForPatient, invalidateVisitCache } from './triage.resource';
import { launchEmergencyTriageFormWorkspace } from './useStartVisitAndLaunchTriageForm';
import styles from './emergency-queue-selection.workspace.scss';

type EmergencyQueueSelectionWorkspaceProps = DefaultWorkspaceProps & {
  patientUuid: string;
  variantConfig: TriageVariantConfig;
  formUuid: string;
  formName: string;
};

const EmergencyQueueSelectionWorkspace: React.FC<EmergencyQueueSelectionWorkspaceProps> = ({
  patientUuid,
  variantConfig,
  formUuid,
  formName,
  closeWorkspace,
}) => {
  const { t } = useTranslation();

  const getErrorMessage = (error: unknown): string => {
    const err = error as { data?: { error?: { message?: string } } };
    const apiMessage = err?.data?.error?.message;
    if (apiMessage) {
      return apiMessage;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return t('unexpectedError', 'An unexpected error occurred');
  };

  const { visitTypeUuid, defaultQueueStatusUuid, visitQueueNumberAttributeTypeUuid } =
    useConfig<ClinicalWorkflowConfig>();
  const { sessionLocation } = useSession();
  const { patient, isLoading: isPatientLoading } = usePatient(patientUuid);
  const { activeVisit, isLoading: isVisitLoading } = useVisit(patientUuid);

  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedQueue, setSelectedQueue] = useState<string | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { queueLocations, isLoading: isLoadingLocations } = useQueueLocations();
  const { queues, isLoading: isLoadingQueues } = useQueues(selectedLocation);

  const locationOptions = queueLocations.map((loc) => ({
    id: loc.id,
    text: loc.name,
  }));

  const queueOptions = queues.map((queue) => ({
    id: queue.uuid,
    text: queue.display,
    allowedPriorities: queue.allowedPriorities || [],
  }));

  const selectedQueueData = queueOptions.find((q) => q.id === selectedQueue);
  const priorityOptions = useMemo(
    () =>
      selectedQueueData?.allowedPriorities.map((priority) => ({
        id: priority.uuid,
        text: priority.display,
        sortWeight: priority.sortWeight || 0,
      })) || [],
    [selectedQueueData],
  );

  const isFormValid = selectedLocation && selectedQueue && selectedPriority;

  const getPriorityTagColor = (priorityDisplay: string): 'red' | 'magenta' | 'green' | 'gray' => {
    const displayLower = priorityDisplay.toLowerCase();
    if (displayLower.includes('emergency')) {
      return 'red';
    }
    if (displayLower.includes('urgent') && !displayLower.includes('not')) {
      return 'magenta';
    }
    if (displayLower.includes('not urgent') || displayLower.includes('routine')) {
      return 'green';
    }
    return 'gray'; // default fallback
  };

  useEffect(() => {
    if (priorityOptions.length > 0 && !selectedPriority) {
      const emergencyPriority = priorityOptions.find((p) => p.text.toLowerCase().includes('emergency'));
      if (emergencyPriority) {
        setSelectedPriority(emergencyPriority.id);
      }
    }
  }, [priorityOptions, selectedPriority]);

  const handleContinue = useCallback(async () => {
    if (!isFormValid) {
      return;
    }

    setIsSubmitting(true);

    try {
      let visit = activeVisit;
      if (!visit) {
        visit = await getCurrentVisitForPatient(patientUuid);
      }

      if (!visit) {
        const visitResponse = await createVisitForPatient(patientUuid, visitTypeUuid, sessionLocation.uuid);
        if (!visitResponse.ok) {
          throw new Error('Failed to create visit');
        }
        visit = visitResponse.data ?? (await getCurrentVisitForPatient(patientUuid));
        if (!visit) {
          throw new Error('Failed to retrieve newly created visit');
        }
      }

      const selectedPriorityData = priorityOptions.find((p) => p.id === selectedPriority);

      await createQueueEntry(
        visit.uuid,
        selectedQueue,
        patientUuid,
        selectedPriority,
        defaultQueueStatusUuid,
        selectedPriorityData?.sortWeight || 0,
        selectedLocation,
        visitQueueNumberAttributeTypeUuid,
      );

      showSnackbar({
        title: t('success', 'Success'),
        kind: 'success',
        subtitle: t('patientAddedToQueue', 'Patient added to queue successfully'),
        isLowContrast: true,
      });

      const patientData = await fetchCurrentPatient(patientUuid);
      launchEmergencyTriageFormWorkspace(patientData, patientUuid, visit, formUuid, formName, t);

      invalidateVisitCache(patientUuid);

      closeWorkspace();
    } catch (error) {
      showSnackbar({
        title: t('errorCreatingQueueEntry', 'Error creating queue entry'),
        kind: 'error',
        subtitle: getErrorMessage(error),
        isLowContrast: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isFormValid,
    activeVisit,
    patientUuid,
    visitTypeUuid,
    sessionLocation,
    selectedQueue,
    selectedPriority,
    priorityOptions,
    selectedLocation,
    defaultQueueStatusUuid,
    visitQueueNumberAttributeTypeUuid,
    formUuid,
    formName,
    t,
    closeWorkspace,
  ]);

  if (isPatientLoading || isVisitLoading) {
    return <InlineLoading description={t('loading', 'Loading...')} />;
  }

  return (
    <>
      {patient && (
        <ExtensionSlot name="patient-header-slot" state={{ patient, patientUuid, hideActionsOverflow: true }} />
      )}
      <div className={styles.workspaceContent}>
        <Stack gap={5}>
          <h3 className={styles.heading}>{t('selectQueueForEmergencyTriage', 'Select Queue for Emergency Triage')}</h3>

          {isLoadingLocations ? (
            <InlineLoading description={t('loadingLocations', 'Loading locations...')} />
          ) : queueLocations.length === 0 ? (
            <InlineNotification
              kind="warning"
              title={t('noLocationsAvailable', 'No locations available')}
              subtitle={t('contactAdministrator', 'Please contact your administrator')}
              lowContrast
            />
          ) : (
            <ComboBox
              id="queue-location-select"
              titleText={t('queueLocation', 'Queue Location')}
              placeholder={t('selectLocation', 'Select a location')}
              items={locationOptions}
              itemToString={(item) => (item ? item.text : '')}
              onChange={({ selectedItem }) => {
                setSelectedLocation(selectedItem ? selectedItem.id : null);
                setSelectedQueue(null);
                setSelectedPriority(null);
              }}
              selectedItem={locationOptions.find((opt) => opt.id === selectedLocation) || null}
            />
          )}

          {selectedLocation && (
            <>
              {isLoadingQueues ? (
                <InlineLoading description={t('loadingQueues', 'Loading queues...')} />
              ) : queueOptions.length === 0 ? (
                <InlineNotification
                  kind="warning"
                  title={t('noQueuesAvailable', 'No queues available')}
                  subtitle={t('noQueuesForLocation', 'No queues configured for this location')}
                  lowContrast
                />
              ) : (
                <ComboBox
                  id="queue-select"
                  titleText={t('queue', 'Queue / Service')}
                  placeholder={t('selectQueue', 'Select a queue')}
                  items={queueOptions}
                  itemToString={(item) => (item ? item.text : '')}
                  onChange={({ selectedItem }) => {
                    setSelectedQueue(selectedItem ? selectedItem.id : null);
                    setSelectedPriority(null); // Reset priority when queue changes
                  }}
                  selectedItem={queueOptions.find((opt) => opt.id === selectedQueue) || null}
                />
              )}
            </>
          )}

          {selectedQueue && priorityOptions.length > 0 && (
            <FormGroup legendText={t('priority', 'Priority')}>
              <RadioButtonGroup
                name="priority"
                valueSelected={selectedPriority}
                onChange={(uuid) => setSelectedPriority(String(uuid))}>
                {priorityOptions.map(({ id, text }) => (
                  <RadioButton key={id} labelText={<Tag type={getPriorityTagColor(text)}>{text}</Tag>} value={id} />
                ))}
              </RadioButtonGroup>
            </FormGroup>
          )}

          <Button
            kind="primary"
            onClick={handleContinue}
            disabled={!isFormValid || isSubmitting}
            className={styles.continueButton}>
            {isSubmitting ? t('pleaseWait', 'Please wait...') : t('continueToTriage', 'Continue to Triage')}
          </Button>
        </Stack>
      </div>
    </>
  );
};

export default EmergencyQueueSelectionWorkspace;
