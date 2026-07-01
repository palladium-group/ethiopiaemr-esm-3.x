import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Dropdown } from '@carbon/react';
import { PageHeader, PageHeaderContent, ServiceQueuesPictogram, useConfig } from '@openmrs/esm-framework';
import { useQueues } from './queue-entries.resource';
import { updateSelectedService, useServiceQueuesFilterState } from './service-queues-store.util';
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

const PatientQueueHeader: React.FC<PatientQueueHeaderProps> = ({ title, showFilters, actions }) => {
  const { t } = useTranslation();
  const { dashboardTitle } = useConfig<ServiceQueuesHeaderConfig>({
    externalModuleName: '@openmrs/esm-service-queues-app',
  });
  const { selectedServiceDisplay, selectedServiceUuid } = useServiceQueuesFilterState();
  const { queues } = useQueues();

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

  const dashboardTitleKey = dashboardTitle?.key ?? 'serviceQueues';
  const dashboardTitleValue = dashboardTitle?.value ?? 'Service queues';

  return (
    <PageHeader className={styles.header} data-testid="patient-queue-header">
      <PageHeaderContent
        title={title ?? t(dashboardTitleKey, dashboardTitleValue)}
        illustration={<ServiceQueuesPictogram />}
      />
      <div className={styles.dropdownContainer}>
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
