import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
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
} from '@carbon/react';
import { ChevronDown } from '@carbon/react/icons';
import { useConfig, useSession } from '@openmrs/esm-framework';
import type { ClinicalWorkflowConfig } from '../../config-schema';
import {
  getDefaultPriorityUuid,
  resolveEmergencyPriorityUuid,
  useQueueLocations,
  useQueuePriorities,
  useQueues,
  type QueueOption,
} from '../queue-entries.resource';
import styles from '../../triage/triage-queue-assignment.scss';

export type ServiceQueuesModalConfig = {
  visitQueueNumberAttributeUuid?: string;
  concepts?: {
    defaultStatusConceptUuid?: string;
    defaultPriorityConceptUuid?: string;
    emergencyPriorityConceptUuid?: string;
    priorityConceptSetUuid?: string;
  };
};

export interface QueueSelectionState {
  priority: string;
  isEmergencyPrioritySelected: boolean;
  queueLocation: string;
  queueService: string;
  selectedQueue?: QueueOption;
}

interface QueueSelectorFieldsProps {
  idPrefix: string;
  initialPriorityUuid?: string;
  initialLocationUuid?: string;
  initialQueueUuid?: string;
  currentQueueUuid?: string;
  onChange: (state: QueueSelectionState) => void;
}

/**
 * Shared cascading queue selector: Priority -> Emergency-filtered searchable Queue location -> Service.
 */
export const QueueSelectorFields: React.FC<QueueSelectorFieldsProps> = ({
  idPrefix,
  initialPriorityUuid,
  initialLocationUuid,
  initialQueueUuid,
  currentQueueUuid,
  onChange,
}) => {
  const { t } = useTranslation();
  const { sessionLocation } = useSession();
  const { emergencyLocationTags, queueLocationTagName } = useConfig<ClinicalWorkflowConfig>();
  const serviceQueuesConfig = useConfig<ServiceQueuesModalConfig>({
    externalModuleName: '@openmrs/esm-service-queues-app',
  });

  const { priorities: availablePriorities, isLoadingQueuePriorities } = useQueuePriorities(
    serviceQueuesConfig.concepts?.priorityConceptSetUuid,
  );
  const emergencyPriorityUuid = resolveEmergencyPriorityUuid(
    serviceQueuesConfig.concepts?.emergencyPriorityConceptUuid,
    availablePriorities,
  );

  const [priority, setPriority] = useState(initialPriorityUuid ?? '');

  useEffect(() => {
    if (!availablePriorities.length) {
      return;
    }
    const defaultUuid = serviceQueuesConfig.concepts?.defaultPriorityConceptUuid;
    setPriority((current) => {
      if (current && availablePriorities.some((item) => item.uuid === current)) {
        return current;
      }
      if (initialPriorityUuid && availablePriorities.some((item) => item.uuid === initialPriorityUuid)) {
        return initialPriorityUuid;
      }
      return getDefaultPriorityUuid(availablePriorities, defaultUuid);
    });
  }, [availablePriorities, initialPriorityUuid, serviceQueuesConfig.concepts?.defaultPriorityConceptUuid]);

  const isEmergencyPrioritySelected = Boolean(priority && priority === emergencyPriorityUuid);
  const activeLocationTag = isEmergencyPrioritySelected
    ? emergencyLocationTags?.[0] || 'Emergency'
    : queueLocationTagName || 'queue location';

  const { queueLocations, isLoading: isLoadingQueueLocations } = useQueueLocations(activeLocationTag);

  const [queueLocation, setQueueLocation] = useState('');
  const [queueService, setQueueService] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevTagRef = useRef(activeLocationTag);
  const appliedInitialLocationRef = useRef(false);
  const appliedInitialQueueRef = useRef(false);

  // Clear location and service whenever priority toggles between regular and emergency tags
  useEffect(() => {
    if (prevTagRef.current !== activeLocationTag) {
      prevTagRef.current = activeLocationTag;
      setQueueLocation('');
      setQueueService('');
    }
  }, [activeLocationTag]);

  // Pre-select the patient's current location (when moving) or session location (when adding) once loaded
  useEffect(() => {
    if (appliedInitialLocationRef.current || queueLocation || !queueLocations.length) {
      return;
    }
    const preferredUuid = initialLocationUuid ?? sessionLocation?.uuid;
    if (preferredUuid && queueLocations.some((location) => location.id === preferredUuid)) {
      appliedInitialLocationRef.current = true;
      setQueueLocation(preferredUuid);
    }
  }, [initialLocationUuid, queueLocation, queueLocations, sessionLocation?.uuid]);

  const { queues, isLoading: isLoadingQueues } = useQueues(queueLocation);

  useEffect(() => {
    if (!queueLocation) {
      setQueueService('');
      return;
    }
    setQueueService((current) => {
      if (current && queues.some((q) => q.uuid === current)) {
        return current;
      }
      if (!appliedInitialQueueRef.current && initialQueueUuid && queues.some((q) => q.uuid === initialQueueUuid)) {
        appliedInitialQueueRef.current = true;
        return initialQueueUuid;
      }
      return '';
    });
  }, [initialQueueUuid, queueLocation, queues]);

  const selectedLocation = queueLocations.find((location) => location.id === queueLocation);
  const selectedQueue = queues.find((queue) => queue.uuid === queueService);
  const selectedQueueUuid = selectedQueue?.uuid;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    onChangeRef.current({
      priority,
      isEmergencyPrioritySelected,
      queueLocation,
      queueService,
      selectedQueue,
    });
    // Depend on primitive selectedQueueUuid rather than object identity so unstable array refs cannot loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmergencyPrioritySelected, priority, queueLocation, queueService, selectedQueueUuid]);

  const term = searchTerm.trim().toLowerCase();
  const filteredLocations = term
    ? queueLocations.filter((l) => (l.name ?? l.id ?? '').toLowerCase().includes(term))
    : queueLocations;

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

  return (
    <>
      <FormGroup legendText={t('priority', 'Priority')}>
        {isLoadingQueuePriorities ? (
          <RadioButtonGroup name={`${idPrefix}-priority-skeleton`}>
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
            name={`${idPrefix}-priority`}
            valueSelected={priority}
            onChange={(uuid) => setPriority(String(uuid))}>
            {availablePriorities.map(({ uuid, display }) => (
              <RadioButton key={uuid} labelText={display} value={uuid} />
            ))}
          </RadioButtonGroup>
        )}
      </FormGroup>

      <FormGroup className={styles.locationFormGroup} legendText={t('queueLocation', 'Queue location')}>
        {isLoadingQueueLocations ? (
          <InlineLoading description={t('loadingQueueLocations', 'Loading queue locations...')} />
        ) : (
          <div ref={dropdownRef} className={styles.customDropdownContainer}>
            <button
              type="button"
              id={`${idPrefix}-location-trigger`}
              className={`${styles.dropdownTrigger} ${isDropdownOpen ? styles.dropdownTriggerOpen : ''}`}
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              aria-haspopup="listbox"
              aria-expanded={isDropdownOpen}>
              {selectedLocation ? (
                <span className={styles.dropdownSelectedText}>{selectedLocation.name ?? selectedLocation.id}</span>
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
                      id={`${idPrefix}-location-filter`}
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
                    <div className={styles.dropdownEmpty}>{t('noQueueLocationsFound', 'No queue locations found')}</div>
                  ) : (
                    filteredLocations.map((location) => {
                      const isSelected = location.id === queueLocation;
                      return (
                        <button
                          key={location.id}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          className={`${styles.dropdownItem} ${isSelected ? styles.dropdownItemSelected : ''}`}
                          onClick={() => {
                            const nextLocation = location.id ?? '';
                            if (nextLocation !== queueLocation) {
                              setQueueService('');
                            }
                            setQueueLocation(nextLocation);
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

      {queueLocation ? (
        <FormGroup legendText={t('service', 'Service')}>
          {isLoadingQueues ? (
            <SelectSkeleton />
          ) : !queues.length ? (
            <InlineNotification
              kind="error"
              lowContrast
              subtitle={t('configureServices', 'Please configure services to continue.')}
              title={t('noServicesConfigured', 'No services configured')}
            />
          ) : (
            <Select
              id={`${idPrefix}-service`}
              labelText=""
              value={queueService}
              onChange={(event) => setQueueService(event.target.value)}>
              <SelectItem text={t('selectQueueService', 'Select a queue service')} value="" />
              {queues.map((queue) => {
                const label = queue.name || queue.display;
                const text =
                  queue.uuid === currentQueueUuid
                    ? t('currentValueFormatted', '{{value}} (Current)', { value: label })
                    : label;
                return <SelectItem key={queue.uuid} text={text} value={queue.uuid} />;
              })}
            </Select>
          )}
        </FormGroup>
      ) : null}
    </>
  );
};
