import React from 'react';
import { Button } from '@carbon/react';
import { FilterRemove, Search, TaskView } from '@carbon/react/icons';
import { useTranslation } from 'react-i18next';
import RadiologyFilters, { type RadiologyFilterValues } from '../../components/filters/radiology-filters.component';
import styles from './radiology-empty-state.scss';

interface RadiologyEmptyStateProps {
  description: string;
  filters: RadiologyFilterValues;
  onFiltersChange: (filters: RadiologyFilterValues) => void;
  showStatusFilter?: boolean;
  showPriorityFilter?: boolean;
  showModalityFilter?: boolean;
  dateRangeLabel?: string;
  onClearFilters?: () => void;
}

const RadiologyEmptyState: React.FC<RadiologyEmptyStateProps> = ({
  description,
  filters,
  onFiltersChange,
  showStatusFilter,
  showPriorityFilter,
  showModalityFilter,
  dateRangeLabel,
  onClearFilters,
}) => {
  const { t } = useTranslation();

  return (
    <div className={styles.container}>
      <RadiologyFilters
        values={filters}
        onChange={onFiltersChange}
        showStatusFilter={showStatusFilter}
        showPriorityFilter={showPriorityFilter}
        showModalityFilter={showModalityFilter}
        dateRangeLabel={dateRangeLabel}
      />
      <div className={styles.tile}>
        <div className={styles.emptyState}>
          <div className={styles.iconCircle} aria-hidden="true">
            <TaskView size={36} className={styles.clipboardIcon} />
            <Search size={18} className={styles.searchIcon} />
          </div>
          <h3 className={styles.heading}>{t('noOrdersMatchingFilters', 'No orders matching filters')}</h3>
          <p className={styles.body}>{description}</p>
          {onClearFilters && (
            <Button
              kind="primary"
              size="md"
              renderIcon={FilterRemove}
              onClick={onClearFilters}
              className={styles.action}>
              {t('clearFilters', 'Clear Filters')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RadiologyEmptyState;
