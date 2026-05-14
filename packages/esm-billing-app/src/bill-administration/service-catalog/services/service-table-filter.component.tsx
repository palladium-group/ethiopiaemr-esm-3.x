import React from 'react';
import { MultiSelect } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import styles from './service-table-filter.scss';
import { ServiceTableFilters } from '../billable-service.resource';

interface ServiceTableFilterProps {
  filters: ServiceTableFilters;
  onChange: (filters: ServiceTableFilters) => void;
  availableTypes: string[];
}

const AVAILABILITY_OPTIONS = [
  { uuid: 'ENABLED', display: 'Enabled' },
  { uuid: 'DISABLED', display: 'Disabled' },
];

const ServiceTableFilter: React.FC<ServiceTableFilterProps> = ({ filters, onChange, availableTypes }) => {
  const { t } = useTranslation();

  const typeItems = availableTypes.map((type) => ({ uuid: type, display: type }));

  const handleTypeChange = ({ selectedItems }: { selectedItems: Array<{ uuid: string; display: string }> }) => {
    onChange({ ...filters, types: selectedItems.map((i) => i.uuid) });
  };

  const handleAvailChange = ({ selectedItems }: { selectedItems: Array<{ uuid: string; display: string }> }) => {
    if (selectedItems.length === 0 || selectedItems.length === AVAILABILITY_OPTIONS.length) {
      onChange({ ...filters, available: 'all' });
    } else {
      onChange({ ...filters, available: selectedItems[0].uuid as ServiceTableFilters['available'] });
    }
  };

  return (
    <div className={styles.filterWrapper}>
      <MultiSelect
        autoAlign
        size="sm"
        className={styles.filtersAlign}
        disabled={!typeItems.length}
        id="service-type-filter"
        label={t('type', 'Type')}
        labelInline
        items={typeItems}
        itemToString={(item) => (item ? item.display : '')}
        selectedItems={typeItems.filter((i) => filters.types.includes(i.uuid))}
        onChange={handleTypeChange}
      />

      <MultiSelect
        autoAlign
        size="sm"
        className={styles.filtersAlign}
        id="service-available-filter"
        label={t('available', 'Available')}
        labelInline
        items={AVAILABILITY_OPTIONS}
        itemToString={(item) => (item ? item.display : '')}
        selectedItems={
          filters.available === 'all' ? [] : AVAILABILITY_OPTIONS.filter((i) => i.uuid === filters.available)
        }
        onChange={handleAvailChange}
      />
    </div>
  );
};

export default ServiceTableFilter;
