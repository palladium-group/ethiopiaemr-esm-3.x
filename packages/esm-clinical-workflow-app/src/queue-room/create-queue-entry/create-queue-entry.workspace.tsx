import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  ButtonSet,
  DataTableSkeleton,
  Form,
  FormGroup,
  InlineLoading,
  InlineNotification,
  RadioButton,
  RadioButtonGroup,
  RadioButtonSkeleton,
  Search,
  Select,
  SelectItem,
  SelectSkeleton,
  Stack,
  Tag,
} from '@carbon/react';
import { ArrowLeft, ChevronDown } from '@carbon/react/icons';
import {
  ErrorState,
  ExtensionSlot,
  getPatientName,
  PatientBannerContactDetails,
  PatientBannerPatientInfo,
  PatientBannerToggleContactDetailsButton,
  PatientPhoto,
  showSnackbar,
  useConfig,
  usePatient,
  useSession,
  useVisit,
  Workspace2,
  type Workspace2DefinitionProps,
} from '@openmrs/esm-framework';
import type { ClinicalWorkflowConfig } from '../../config-schema';
import {
  getDefaultPriorityUuid,
  resolveEmergencyPriorityUuid,
  useMutateQueueEntries,
  useQueueLocations,
  useQueuePriorities,
  useQueues,
} from '../queue-entries.resource';
import {
  getErrorMessage,
  isDuplicateQueueEntryError,
  postQueueEntry,
  setAssignedQueueVisitAttribute,
} from '../../triage/triage-queue-assignment.resource';
import styles from './create-queue-entry.scss';

type ServiceQueuesConfig = {
  visitQueueNumberAttributeUuid?: string;
  concepts?: {
    defaultStatusConceptUuid?: string;
    defaultPriorityConceptUuid?: string;
    emergencyPriorityConceptUuid?: string;
    priorityConceptSetUuid?: string;
  };
};

type AssignmentQueue = {
  uuid: string;
  display: string;
  name?: string;
  allowedPriorities?: Array<{ uuid: string; display: string }>;
};

export interface CreateQueueEntryWorkspaceProps {
  selectedPatientUuid?: string;
  currentServiceQueueUuid?: string;
  workspaceProps?: {
    selectedPatientUuid?: string;
    currentServiceQueueUuid?: string;
  };
  windowProps?: {
    startVisitWorkspaceName?: string;
  };
  closeWorkspace?: (options?: { closeWindow?: boolean; discardUnsavedChanges?: boolean }) => void;
  launchChildWorkspace?: (name: string, props?: Record<string, unknown>) => void;
  [key: string]: unknown;
}

const CreateQueueEntryWorkspace: React.FC<CreateQueueEntryWorkspaceProps> = (props) => {
  const selectedPatientUuid = props.workspaceProps?.selectedPatientUuid ?? props.selectedPatientUuid;
  const currentServiceQueueUuid = props.workspaceProps?.currentServiceQueueUuid ?? props.currentServiceQueueUuid;
  const startVisitWorkspaceName =
    props.windowProps?.startVisitWorkspaceName ?? 'queue-patient-search-start-visit-workspace';
  const closeWorkspace = props.closeWorkspace ?? (() => undefined);
  const launchChildWorkspace = props.launchChildWorkspace ?? (() => undefined);

  const { t } = useTranslation();
  const { sessionLocation } = useSession();
  const { mutateQueueEntries } = useMutateQueueEntries();

  const { assignedQueueVisitAttributeTypeUuid, emergencyLocationTags, queueLocationTagName } =
    useConfig<ClinicalWorkflowConfig>();

  const serviceQueuesConfig = useConfig<ServiceQueuesConfig>({
    externalModuleName: '@openmrs/esm-service-queues-app',
  });

  const { patient, isLoading: isLoadingPatient } = usePatient(selectedPatientUuid);
  const { activeVisit, isLoading: isLoadingVisit, error: visitError } = useVisit(selectedPatientUuid);

  const [showContactDetails, setShowContactDetails] = useState(false);
  const handleToggleContactDetails = useCallback(() => {
    setShowContactDetails((prev) => !prev);
  }, []);

  const patientName = patient ? getPatientName(patient) : '';

  // Priority selection (workflow starts from priority selection)
  const { priorities: availablePriorities, isLoadingQueuePriorities } = useQueuePriorities(
    serviceQueuesConfig.concepts?.priorityConceptSetUuid,
  );

  const emergencyPriorityUuid = resolveEmergencyPriorityUuid(
    serviceQueuesConfig.concepts?.emergencyPriorityConceptUuid,
    availablePriorities,
  );

  const [priority, setPriority] = useState('');

  useEffect(() => {
    if (availablePriorities.length) {
      const defaultUuid = serviceQueuesConfig.concepts?.defaultPriorityConceptUuid;
      setPriority((curr) =>
        curr && availablePriorities.some((item) => item.uuid === curr)
          ? curr
          : getDefaultPriorityUuid(availablePriorities, defaultUuid),
      );
    }
  }, [availablePriorities, serviceQueuesConfig.concepts?.defaultPriorityConceptUuid]);

  const isEmergencyPrioritySelected = Boolean(priority && priority === emergencyPriorityUuid);

  // Location selection (switches to emergency locations if emergency priority is selected)
  const emergencyLocationTag = emergencyLocationTags?.[0] || 'Emergency';
  const defaultQueueLocationTag = queueLocationTagName || 'queue location';
  const activeLocationTag = isEmergencyPrioritySelected ? emergencyLocationTag : defaultQueueLocationTag;

  const { queueLocations, isLoading: isLoadingQueueLocations } = useQueueLocations(activeLocationTag);

  const [queueLocation, setQueueLocation] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [queueService, setQueueService] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Clear location and service if active location tag changes (emergency vs queue location)
  const prevActiveLocationTagRef = useRef(activeLocationTag);
  useEffect(() => {
    if (prevActiveLocationTagRef.current !== activeLocationTag) {
      prevActiveLocationTagRef.current = activeLocationTag;
      setQueueLocation('');
      setQueueService('');
    }
  }, [activeLocationTag]);

  // Auto-select session location if it is in queueLocations and none selected
  useEffect(() => {
    if (queueLocation || !sessionLocation?.uuid || !queueLocations.length) {
      return;
    }
    const sessionIsQueueLocation = queueLocations.some((location) => location.id === sessionLocation.uuid);
    if (sessionIsQueueLocation) {
      setQueueLocation(sessionLocation.uuid);
    }
  }, [queueLocation, queueLocations, sessionLocation?.uuid]);

  // Queues / services for selected location
  const { queues, isLoading: isLoadingQueues } = useQueues(queueLocation);
  const assignmentQueues = queues as AssignmentQueue[];

  // Reset or pre-select service when location changes
  useEffect(() => {
    if (!queueLocation) {
      setQueueService('');
      return;
    }
    setQueueService((current) => {
      if (current && assignmentQueues.some((q) => q.uuid === current)) {
        return current;
      }
      if (currentServiceQueueUuid && assignmentQueues.some((q) => q.uuid === currentServiceQueueUuid)) {
        return currentServiceQueueUuid;
      }
      return '';
    });
  }, [queueLocation, currentServiceQueueUuid, assignmentQueues]);

  const selectedLocation = queueLocations.find((location) => location.id === queueLocation);

  const filteredLocations = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return term ? queueLocations.filter((l) => (l.name ?? l.id ?? '').toLowerCase().includes(term)) : queueLocations;
  }, [searchTerm, queueLocations]);

  useEffect(() => {
    if (!isDropdownOpen) {
      return;
    }
    const onMouseDown = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isDropdownOpen]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const statusUuid = serviceQueuesConfig.concepts?.defaultStatusConceptUuid;
    const patientUuid = selectedPatientUuid || activeVisit?.patient?.uuid;

    if (!queueLocation || !queueService || !priority || !statusUuid || !patientUuid || !activeVisit?.uuid) {
      showSnackbar({
        title: t('incompleteForm', 'Incomplete form'),
        kind: 'error',
        subtitle: t('missingRequiredFields', 'Select a queue location, service, and priority'),
      });
      return;
    }

    setIsSubmitting(true);
    const sortWeight = isEmergencyPrioritySelected ? 1 : 0;

    try {
      await postQueueEntry(
        activeVisit.uuid,
        queueService,
        patientUuid,
        priority,
        statusUuid,
        sortWeight,
        queueLocation,
        serviceQueuesConfig.visitQueueNumberAttributeUuid,
      );
      await setAssignedQueueVisitAttribute(activeVisit, assignedQueueVisitAttributeTypeUuid, queueLocation);
      mutateQueueEntries();
      showSnackbar({
        kind: 'success',
        isLowContrast: true,
        title: t('addedPatientToQueue', 'Added patient to queue'),
        subtitle: t('queueEntryAddedSuccessfully', 'Queue entry added successfully'),
      });
      closeWorkspace({ closeWindow: true, discardUnsavedChanges: true });
    } catch (error) {
      if (isDuplicateQueueEntryError(error)) {
        showSnackbar({
          title: t('patientAlreadyInQueue', 'Patient already in queue'),
          kind: 'warning',
          subtitle: t('duplicateQueueEntry', 'This patient is already in the selected queue.'),
        });
      } else {
        showSnackbar({
          title: t('queueEntryError', 'Error adding patient to the queue'),
          kind: 'error',
          subtitle: getErrorMessage(error),
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!selectedPatientUuid) {
    return null;
  }

  return (
    <Workspace2 title={t('addPatientToQueue', 'Add patient to queue')}>
      <div className={styles.patientSearchContainer}>
        <div className={styles.patientBannerContainer}>
          <div className={styles.patientBanner}>
            <div className={styles.patientPhoto}>
              <PatientPhoto patientUuid={patient?.id} patientName={patientName} />
            </div>
            {patient ? <PatientBannerPatientInfo patient={patient} /> : null}
            <PatientBannerToggleContactDetailsButton
              className={styles.toggleContactDetailsButton}
              showContactDetails={showContactDetails}
              toggleContactDetails={handleToggleContactDetails}
            />
          </div>
          {showContactDetails && patient ? (
            <PatientBannerContactDetails deceased={patient.deceasedBoolean} patientId={patient.id} />
          ) : null}
        </div>

        <div className={styles.backButton}>
          <Button
            kind="ghost"
            renderIcon={(iconProps) => <ArrowLeft size={24} {...iconProps} />}
            iconDescription={t('backToSearchResults', 'Back to search results')}
            size="sm"
            onClick={() => closeWorkspace()}>
            <span>{t('backToSearchResults', 'Back to search results')}</span>
          </Button>
        </div>

        {isLoadingPatient || isLoadingVisit ? (
          <DataTableSkeleton role="progressbar" />
        ) : visitError ? (
          <ErrorState headerTitle={t('errorFetchingVisit', 'Error fetching patient visit')} error={visitError} />
        ) : !activeVisit ? (
          <Stack className={styles.noVisitContainer} gap={4}>
            <InlineNotification
              hideCloseButton
              kind="info"
              lowContrast
              subtitle={t('visitRequiredToCreateQueueEntry', 'A visit is required to add this patient to the queue')}
            />
            <ExtensionSlot
              name="start-visit-button-slot2"
              state={{
                patientUuid: patient?.id,
                launchChildWorkspace,
                startVisitWorkspaceName,
              }}
            />
          </Stack>
        ) : (
          <Form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.container}>
              <Stack gap={5}>
                {/* 1. Priority Selection first */}
                <FormGroup legendText={t('priority', 'Priority')}>
                  {isLoadingQueuePriorities ? (
                    <RadioButtonGroup name="create-queue-priority-skeleton">
                      <RadioButtonSkeleton />
                      <RadioButtonSkeleton />
                    </RadioButtonGroup>
                  ) : !availablePriorities.length ? (
                    <InlineNotification
                      kind="error"
                      lowContrast
                      title={t('noPrioritiesForServiceTitle', 'No priorities available')}>
                      {t(
                        'noPrioritiesForService',
                        'The selected service does not have any allowed priorities. This is an error in configuration. Please contact your system administrator.',
                      )}
                    </InlineNotification>
                  ) : (
                    <RadioButtonGroup
                      name="create-queue-priority"
                      valueSelected={priority}
                      onChange={(uuid) => setPriority(String(uuid))}>
                      {availablePriorities.map(({ uuid, display }) => (
                        <RadioButton key={uuid} labelText={display} value={uuid} />
                      ))}
                    </RadioButtonGroup>
                  )}
                </FormGroup>

                {/* 2. Queue Location Selection second (emergency locations if emergency priority selected) */}
                <FormGroup className={styles.locationFormGroup} legendText={t('queueLocation', 'Queue location')}>
                  {isLoadingQueueLocations ? (
                    <InlineLoading description={t('loadingQueueLocations', 'Loading queue locations...')} />
                  ) : (
                    <div ref={dropdownRef} className={styles.customDropdownContainer}>
                      <button
                        type="button"
                        id="create-queue-location-trigger"
                        className={`${styles.dropdownTrigger} ${isDropdownOpen ? styles.dropdownTriggerOpen : ''}`}
                        onClick={() => setIsDropdownOpen((prev) => !prev)}
                        aria-haspopup="listbox"
                        aria-expanded={isDropdownOpen}>
                        {selectedLocation ? (
                          <span className={styles.dropdownSelectedText}>
                            {selectedLocation.name ?? selectedLocation.id}
                          </span>
                        ) : (
                          <span className={styles.dropdownPlaceholder}>
                            {t('selectQueueLocation', 'Select a queue location')}
                          </span>
                        )}
                        <ChevronDown
                          size={16}
                          className={`${styles.dropdownChevron} ${isDropdownOpen ? styles.dropdownChevronOpen : ''}`}
                        />
                      </button>

                      {isDropdownOpen && (
                        <div className={styles.dropdownMenu}>
                          {queueLocations.length > 5 && (
                            <div className={styles.dropdownSearchContainer}>
                              <Search
                                id="create-queue-location-filter"
                                labelText={t('filterQueueLocations', 'Filter queue locations')}
                                placeholder={t('searchQueueLocationPlaceholder', 'Search location...')}
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value ?? '')}
                                onClear={() => setSearchTerm('')}
                                size="sm"
                                autoFocus
                              />
                            </div>
                          )}
                          <div
                            className={styles.dropdownList}
                            role="listbox"
                            aria-label={t('queueLocationOptions', 'Queue location options')}>
                            {filteredLocations.length === 0 ? (
                              <div className={styles.dropdownEmpty}>
                                {t('noQueueLocationsFound', 'No queue locations found')}
                              </div>
                            ) : (
                              filteredLocations.map((location) => {
                                const isSelected = location.id === queueLocation;
                                return (
                                  <button
                                    key={location.id}
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    className={`${styles.dropdownItem} ${
                                      isSelected ? styles.dropdownItemSelected : ''
                                    }`}
                                    onClick={() => {
                                      setQueueLocation(location.id ?? '');
                                      setIsDropdownOpen(false);
                                      setSearchTerm('');
                                    }}>
                                    <span className={styles.dropdownItemName}>{location.name ?? location.id}</span>
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </FormGroup>

                {/* 3. Queue Service Selection third */}
                {queueLocation ? (
                  <FormGroup legendText={t('service', 'Service')}>
                    {isLoadingQueues ? (
                      <SelectSkeleton />
                    ) : !assignmentQueues.length ? (
                      <InlineNotification
                        kind="error"
                        lowContrast
                        subtitle={t('configureServices', 'Please configure services to continue.')}
                        title={t('noServicesConfigured', 'No services configured')}
                      />
                    ) : (
                      <Select
                        id="create-queue-service"
                        labelText=""
                        value={queueService}
                        onChange={(event) => setQueueService(event.target.value)}>
                        <SelectItem text={t('selectQueueService', 'Select a queue service')} value="" />
                        {assignmentQueues.map((queue) => (
                          <SelectItem key={queue.uuid} text={queue.name || queue.display} value={queue.uuid} />
                        ))}
                      </Select>
                    )}
                  </FormGroup>
                ) : null}
              </Stack>
            </div>

            <ButtonSet className={styles.buttonSet}>
              <Button
                className={styles.button}
                kind="secondary"
                onClick={() => closeWorkspace({ discardUnsavedChanges: false })}>
                {t('discard', 'Discard')}
              </Button>
              <Button
                className={styles.button}
                disabled={isSubmitting || !queueLocation || !queueService || !priority}
                kind="primary"
                type="submit">
                {isSubmitting
                  ? t('addingPatientToQueue', 'Adding patient to queue') + '...'
                  : t('addPatientToQueue', 'Add patient to queue')}
              </Button>
            </ButtonSet>
          </Form>
        )}
      </div>
    </Workspace2>
  );
};

export default CreateQueueEntryWorkspace;
