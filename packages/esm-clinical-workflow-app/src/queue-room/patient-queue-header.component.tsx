import React, { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Dropdown, DropdownSkeleton, InlineNotification } from '@carbon/react';
import { PageHeader, PageHeaderContent, ServiceQueuesPictogram, useConfig, useSession } from '@openmrs/esm-framework';
import { useQueueLocations, useQueues } from './queue-entries.resource';
import {
  updateSelectedQueueLocationName,
  updateSelectedQueueLocationUuid,
  updateSelectedService,
  useServiceQueuesFilterState,
} from './service-queues-store.util';
import styles from './patient-queue-header.scss';

interface ServiceQueuesHeaderConfig {
  dashboardTitle?: {
    key: string;
    value: string;
  };
}

interface PatientQueueHeaderProps {
  title?: string | React.ReactElement;
  showFilters: boolean;
  actions?: React.ReactNode;
}

interface LocationOption {
  id: string;
  name: string;
}

const PatientQueueHeader: React.FC<PatientQueueHeaderProps> = ({ title, showFilters, actions }) => {
  const { t } = useTranslation();
  const { queueLocations, isLoading, error } = useQueueLocations();
  const { dashboardTitle } = useConfig<ServiceQueuesHeaderConfig>({
    externalModuleName: '@openmrs/esm-service-queues-app',
  });
  const userSession = useSession();
  const { selectedQueueLocationName, selectedQueueLocationUuid, selectedServiceDisplay, selectedServiceUuid } =
    useServiceQueuesFilterState();
  const { queues } = useQueues();

  const locationOptions = useMemo<LocationOption[]>(
    () =>
      queueLocations.map((location) => ({
        id: location.id ?? '',
        name: location.name ?? '',
      })),
    [queueLocations],
  );

  const locationDropdownItems = useMemo(() => {
    return locationOptions.length !== 1 ? [{ id: 'all', name: t('all', 'All') }, ...locationOptions] : locationOptions;
  }, [locationOptions, t]);

  const showLocationDropdown = showFilters && locationOptions.length > 1;
  const showServiceDropdown = showFilters && queues.length > 1;

  const serviceOptions = useMemo(() => {
    const options = queues
      .map((queue) => ({ id: queue.service.uuid, name: queue.service.display }))
      .reduce<Array<{ id: string; name: string }>>((acc, curr) => {
        if (!acc.some((option) => option.id === curr.id)) {
          acc.push(curr);
        }
        return acc;
      }, []);
    return options.length !== 1 ? [{ id: 'all', name: t('all', 'All') }, ...options] : options;
  }, [queues, t]);

  const handleQueueLocationChange = useCallback(
    ({ selectedItem }: { selectedItem: LocationOption }) => {
      if (selectedItem.id === 'all') {
        updateSelectedQueueLocationUuid(null);
        updateSelectedQueueLocationName(null);
      } else {
        updateSelectedQueueLocationUuid(selectedItem.id);
        updateSelectedQueueLocationName(selectedItem.name);
        updateSelectedService(null, t('all', 'All'));
      }
    },
    [t],
  );

  const handleServiceChange = useCallback(
    ({ selectedItem }: { selectedItem: { id: string; name: string } }) => {
      if (selectedItem.id === 'all') {
        updateSelectedService(null, t('all', 'All'));
      } else {
        updateSelectedService(selectedItem.id, selectedItem.name);
      }
    },
    [t],
  );

  useEffect(() => {
    if (!isLoading && !error && !selectedQueueLocationUuid) {
      if (locationOptions.length === 1) {
        handleQueueLocationChange({ selectedItem: locationOptions[0] });
      } else if (
        locationOptions.some((location) => location.id === userSession?.sessionLocation?.uuid) &&
        userSession?.sessionLocation?.uuid
      ) {
        handleQueueLocationChange({
          selectedItem: {
            id: userSession.sessionLocation.uuid,
            name: userSession.sessionLocation.display,
          },
        });
      }
    }
  }, [
    error,
    handleQueueLocationChange,
    isLoading,
    locationOptions,
    selectedQueueLocationUuid,
    userSession?.sessionLocation?.display,
    userSession?.sessionLocation?.uuid,
  ]);

  const dashboardTitleKey = dashboardTitle?.key ?? 'serviceQueues';
  const dashboardTitleValue = dashboardTitle?.value ?? 'Service queues';

  return (
    <PageHeader className={styles.header} data-testid="patient-queue-header">
      <PageHeaderContent
        title={title ?? t(dashboardTitleKey, dashboardTitleValue)}
        illustration={<ServiceQueuesPictogram />}
      />
      <div className={styles.dropdownContainer}>
        {isLoading ? (
          <div className={styles.dropdownSkeletonContainer}>
            <DropdownSkeleton />
          </div>
        ) : error ? (
          <InlineNotification
            kind="error"
            title={t('failedToLoadLocations', 'Failed to load locations')}
            hideCloseButton
          />
        ) : (
          showLocationDropdown && (
            <Dropdown
              aria-label={t('selectQueueLocation', 'Select a queue location')}
              className={styles.dropdown}
              id="queueLocationDropdown"
              label={selectedQueueLocationName ?? t('all', 'All')}
              items={locationDropdownItems}
              itemToString={(item: LocationOption | null) => (item ? item.name : '')}
              titleText={t('location', 'Location')}
              type="inline"
              onChange={handleQueueLocationChange}
            />
          )
        )}
        {showServiceDropdown ? (
          <Dropdown
            aria-label={t('selectService', 'Select a service')}
            className={styles.dropdown}
            id="serviceDropdown"
            label={selectedServiceDisplay ?? t('all', 'All')}
            items={serviceOptions}
            itemToString={(item) => item?.name}
            titleText={t('service', 'Service')}
            type="inline"
            onChange={handleServiceChange}
            selectedItem={serviceOptions.find((option) => option.id === selectedServiceUuid)}
          />
        ) : null}
        {actions}
      </div>
    </PageHeader>
  );
};

export default PatientQueueHeader;
