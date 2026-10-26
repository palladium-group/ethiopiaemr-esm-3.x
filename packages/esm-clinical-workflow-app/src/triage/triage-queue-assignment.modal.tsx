import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Form,
  FormGroup,
  InlineLoading,
  InlineNotification,
  ModalBody,
  ModalFooter,
  ModalHeader,
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
import { ChevronDown } from '@carbon/react/icons';
import { showSnackbar, useConfig, useSession, type Visit } from '@openmrs/esm-framework';
import type { ClinicalWorkflowConfig } from '../config-schema';
import {
  getDefaultPriorityUuid,
  resolveEmergencyPriorityUuid,
  useMutateQueueEntries,
  useQueueLocations,
  useQueuePriorities,
  useQueues,
} from '../queue-room/queue-entries.resource';
import { findTriageDefinition } from './triage-config';
import {
  getErrorMessage,
  isDuplicateQueueEntryError,
  postQueueEntry,
  setAssignedQueueVisitAttribute,
  useTriageAssignmentCounts,
} from './triage-queue-assignment.resource';
import styles from './triage-queue-assignment.scss';

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

interface TriageQueueAssignmentModalProps {
  activeVisit: Visit;
  triageId?: string;
  closeModal: () => void;
}

const TriageQueueAssignmentModal: React.FC<TriageQueueAssignmentModalProps> = ({
  activeVisit,
  triageId,
  closeModal,
}) => {
  const { t } = useTranslation();
  const { sessionLocation } = useSession();
  const { mutateQueueEntries } = useMutateQueueEntries();
  const {
    assignedQueueVisitAttributeTypeUuid,
    triageVisitAttributeTypeUuid,
    triageDefinitions,
    emergencyLocationTags,
    queueLocationTagName,
  } = useConfig<ClinicalWorkflowConfig>();
  const serviceQueuesConfig = useConfig<ServiceQueuesConfig>({
    externalModuleName: '@openmrs/esm-service-queues-app',
  });

  const resolvedTriageId =
    triageId ??
    activeVisit?.attributes
      ?.find((attr) => attr.attributeType?.uuid === triageVisitAttributeTypeUuid)
      ?.value?.toString();

  const isEmergencyTriage = useMemo(() => {
    if (!resolvedTriageId) {
      return false;
    }
    const triageDef = findTriageDefinition(triageDefinitions, resolvedTriageId);
    const id = (triageDef?.id ?? resolvedTriageId).toLowerCase();
    return (
      id === 'emergency' || id === 'emergency-triage' || triageDef?.routePath?.toLowerCase() === 'emergency-triage'
    );
  }, [resolvedTriageId, triageDefinitions]);

  const { priorities: availablePriorities, isLoadingQueuePriorities } = useQueuePriorities(
    serviceQueuesConfig.concepts?.priorityConceptSetUuid,
  );

  const emergencyPriorityUuid = resolveEmergencyPriorityUuid(
    serviceQueuesConfig.concepts?.emergencyPriorityConceptUuid,
    availablePriorities,
  );

  const [priority, setPriority] = useState('');

  useEffect(() => {
    if (isEmergencyTriage) {
      setPriority(emergencyPriorityUuid);
    } else if (availablePriorities.length) {
      const defaultUuid = serviceQueuesConfig.concepts?.defaultPriorityConceptUuid;
      setPriority((curr) =>
        curr && availablePriorities.some((item) => item.uuid === curr)
          ? curr
          : getDefaultPriorityUuid(availablePriorities, defaultUuid),
      );
    }
  }, [
    isEmergencyTriage,
    emergencyPriorityUuid,
    availablePriorities,
    serviceQueuesConfig.concepts?.defaultPriorityConceptUuid,
  ]);

  const isEmergencyPrioritySelected = isEmergencyTriage || Boolean(priority && priority === emergencyPriorityUuid);

  const emergencyLocationTag = emergencyLocationTags?.[0] || 'Emergency';
  const defaultQueueLocationTag = queueLocationTagName || 'queue location';
  const activeLocationTag =
    !isEmergencyTriage && isEmergencyPrioritySelected ? emergencyLocationTag : defaultQueueLocationTag;

  const { queueLocations, isLoading: isLoadingQueueLocations } = useQueueLocations(activeLocationTag);
  const queueLocationUuids = useMemo(
    () => queueLocations.map((l) => l.id).filter(Boolean) as string[],
    [queueLocations],
  );
  const { byLocationUuid, isLoading: isLoadingCounts } = useTriageAssignmentCounts(
    resolvedTriageId,
    queueLocationUuids,
  );

  const [queueLocation, setQueueLocation] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [queueService, setQueueService] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // When location tag changes between emergency and queue location, clear previous selection
  const prevActiveLocationTagRef = useRef(activeLocationTag);
  useEffect(() => {
    if (prevActiveLocationTagRef.current !== activeLocationTag) {
      prevActiveLocationTagRef.current = activeLocationTag;
      setQueueLocation('');
      setQueueService('');
    }
  }, [activeLocationTag]);

  const { queues, isLoading: isLoadingQueues } = useQueues(queueLocation);
  const assignmentQueues = queues as AssignmentQueue[];

  const selectedLocation = queueLocations.find((location) => location.id === queueLocation);
  const selectedCount = selectedLocation?.id ? byLocationUuid[selectedLocation.id] ?? 0 : 0;

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

  useEffect(() => {
    if (queueLocation || !sessionLocation?.uuid || !queueLocations.length) {
      return;
    }
    const sessionIsQueueLocation = queueLocations.some((location) => location.id === sessionLocation.uuid);
    if (sessionIsQueueLocation) {
      setQueueLocation(sessionLocation.uuid);
    }
  }, [queueLocation, queueLocations, sessionLocation?.uuid]);

  useEffect(() => {
    setQueueService('');
  }, [queueLocation]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const statusUuid = serviceQueuesConfig.concepts?.defaultStatusConceptUuid;
    const patientUuid = activeVisit?.patient?.uuid;

    if (!queueLocation || !queueService || !priority || !statusUuid || !patientUuid || !activeVisit?.uuid) {
      showSnackbar({
        title: t('incompleteForm', 'Incomplete form'),
        kind: 'error',
        subtitle: isEmergencyTriage
          ? t('missingRequiredFieldsEmergency', 'Select a queue location and service')
          : t('missingRequiredFields', 'Select a queue location, service, and priority'),
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
      closeModal();
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

  return (
    <Form onSubmit={handleSubmit}>
      <ModalHeader closeModal={closeModal} title={t('addPatientToQueue', 'Add patient to queue')} />
      <ModalBody className={styles.modalBody}>
        <Stack gap={5}>
          {!isEmergencyTriage && (
            <FormGroup legendText={t('priority', 'Priority')}>
              {isLoadingQueuePriorities ? (
                <RadioButtonGroup name="triage-queue-priority-skeleton">
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
                  name="triage-queue-priority"
                  valueSelected={priority}
                  onChange={(uuid) => setPriority(String(uuid))}>
                  {availablePriorities.map(({ uuid, display }) => (
                    <RadioButton key={uuid} labelText={display} value={uuid} />
                  ))}
                </RadioButtonGroup>
              )}
            </FormGroup>
          )}

          <FormGroup className={styles.locationFormGroup} legendText={t('queueLocation', 'Queue location')}>
            {isLoadingQueueLocations || isLoadingCounts ? (
              <InlineLoading description={t('loadingQueueLocations', 'Loading queue locations...')} />
            ) : (
              <div ref={dropdownRef} className={styles.customDropdownContainer}>
                <button
                  type="button"
                  id="triage-queue-location-trigger"
                  className={`${styles.dropdownTrigger} ${isDropdownOpen ? styles.dropdownTriggerOpen : ''}`}
                  onClick={() => setIsDropdownOpen((prev) => !prev)}
                  aria-haspopup="listbox"
                  aria-expanded={isDropdownOpen}>
                  {selectedLocation ? (
                    <>
                      <span className={styles.dropdownSelectedText}>
                        {selectedLocation.name ?? selectedLocation.id}
                      </span>
                      <div className={styles.dropdownTriggerRight}>
                        <Tag size="sm" type={selectedCount > 0 ? 'blue' : 'gray'}>
                          {selectedCount}{' '}
                          {selectedCount === 1
                            ? t('patientAssigned', 'patient assigned')
                            : t('patientsAssigned', 'patients assigned')}
                        </Tag>
                        <ChevronDown
                          size={16}
                          className={`${styles.dropdownChevron} ${isDropdownOpen ? styles.dropdownChevronOpen : ''}`}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <span className={styles.dropdownPlaceholder}>
                        {t('selectQueueLocation', 'Select a queue location')}
                      </span>
                      <ChevronDown
                        size={16}
                        className={`${styles.dropdownChevron} ${isDropdownOpen ? styles.dropdownChevronOpen : ''}`}
                      />
                    </>
                  )}
                </button>

                {isDropdownOpen && (
                  <div className={styles.dropdownMenu}>
                    {queueLocations.length > 5 && (
                      <div className={styles.dropdownSearchContainer}>
                        <Search
                          id="triage-queue-location-filter"
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
                          const count = byLocationUuid[location.id ?? ''] ?? 0;
                          const isSelected = location.id === queueLocation;
                          return (
                            <button
                              key={location.id}
                              type="button"
                              role="option"
                              aria-selected={isSelected}
                              className={`${styles.dropdownItem} ${isSelected ? styles.dropdownItemSelected : ''}`}
                              onClick={() => {
                                setQueueLocation(location.id ?? '');
                                setIsDropdownOpen(false);
                                setSearchTerm('');
                              }}>
                              <span className={styles.dropdownItemName}>{location.name ?? location.id}</span>
                              <Tag size="sm" type={count > 0 ? 'blue' : 'gray'}>
                                {count}{' '}
                                {count === 1
                                  ? t('patientAssigned', 'patient assigned')
                                  : t('patientsAssigned', 'patients assigned')}
                              </Tag>
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

          {queueLocation ? (
            <FormGroup legendText={t('service', 'Service')}>
              {isLoadingQueues || isLoadingCounts ? (
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
                  id="triage-queue-service"
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
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeModal}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button disabled={isSubmitting} kind="primary" type="submit">
          {isSubmitting
            ? t('addingPatientToQueue', 'Adding patient to queue') + '...'
            : t('addPatientToQueue', 'Add patient to queue')}
        </Button>
      </ModalFooter>
    </Form>
  );
};

export default TriageQueueAssignmentModal;
