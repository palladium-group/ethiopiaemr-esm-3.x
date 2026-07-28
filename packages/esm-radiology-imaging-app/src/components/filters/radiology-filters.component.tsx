import React from 'react';
import { Layer, Select, SelectItem } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { showModal } from '@openmrs/esm-framework';
import dayjs from 'dayjs';
import styles from './radiology-filters.scss';

export type DateRangePreset = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth' | 'custom';
export type PriorityFilter = 'all' | 'STAT' | 'ROUTINE' | 'ON_SCHEDULED_DATE';
export type StatusFilter = 'all' | 'unassigned' | 'IN_PROGRESS' | 'COMPLETED' | 'DECLINED' | 'EXCEPTION';

/**
 * DICOM modality codes. These must match the codes returned by `inferModalityFromConcept`
 * in `src/resources/pacs.resource.ts`.
 */
export type ModalityFilter = 'all' | 'CT' | 'MR' | 'US' | 'CR' | 'DX' | 'MG' | 'NM' | 'PT' | 'RF' | 'XA' | 'OT';

export interface RadiologyFilterValues {
  dateRangePreset: DateRangePreset;
  priority: PriorityFilter;
  status: StatusFilter;
  modality?: ModalityFilter;
  customStart?: Date;
  customEnd?: Date;
}

/**
 * Broad activation-date window for server fetches where the UI date filter is applied
 * client-side (scheduled date or activation date). Keeps requests bounded to roughly one year.
 */
export function getScheduledFetchRange(): [Date, Date] {
  return [dayjs().subtract(1, 'year').startOf('day').toDate(), dayjs().endOf('day').toDate()];
}

/** Uses scheduled date when present, otherwise order activation date. */
export function isOrderInFilterDateRange(
  order: { scheduledDate?: string | null; dateActivated: string },
  from: Date,
  to: Date,
): boolean {
  const relevantDate = dayjs(order.scheduledDate ?? order.dateActivated);
  return !relevantDate.isBefore(dayjs(from)) && !relevantDate.isAfter(dayjs(to));
}

export function getDateRange(filters: RadiologyFilterValues): [Date, Date] {
  const endOfToday = dayjs().endOf('day').toDate();
  switch (filters.dateRangePreset) {
    case 'yesterday': {
      const y = dayjs().subtract(1, 'day');
      return [y.startOf('day').toDate(), y.endOf('day').toDate()];
    }
    case 'last7days':
      return [dayjs().subtract(7, 'days').startOf('day').toDate(), endOfToday];
    case 'last30days':
      return [dayjs().subtract(30, 'days').startOf('day').toDate(), endOfToday];
    case 'thisMonth':
      return [dayjs().startOf('month').toDate(), endOfToday];
    case 'custom':
      return [filters.customStart ?? dayjs().startOf('day').toDate(), filters.customEnd ?? endOfToday];
    default:
      return [dayjs().startOf('day').toDate(), endOfToday];
  }
}

export function getFulfillerStatus(status: StatusFilter): string | null | undefined {
  if (status === 'all') {
    return undefined;
  }
  if (status === 'unassigned') {
    return null;
  }
  return status;
}

interface RadiologyFiltersProps {
  values: RadiologyFilterValues;
  onChange: (values: RadiologyFilterValues) => void;
  showStatusFilter?: boolean;
  showPriorityFilter?: boolean;
  showModalityFilter?: boolean;
  dateRangeLabel?: string;
}

const RadiologyFilters: React.FC<RadiologyFiltersProps> = ({
  values,
  onChange,
  showStatusFilter = true,
  showPriorityFilter = true,
  showModalityFilter = false,
  dateRangeLabel,
}) => {
  const { t } = useTranslation();

  const set = <K extends keyof RadiologyFilterValues>(key: K, value: RadiologyFilterValues[K]) =>
    onChange({ ...values, [key]: value });

  const modalityOptions: Array<{ value: ModalityFilter; label: string }> = [
    { value: 'all', label: t('all', 'All') },
    { value: 'CT', label: t('modalityCt', 'CT') },
    { value: 'MR', label: t('modalityMri', 'MRI') },
    { value: 'US', label: t('modalityUltrasound', 'Ultrasound') },
    { value: 'CR', label: t('modalityXray', 'X-Ray') },
    { value: 'DX', label: t('modalityXrayDigital', 'X-Ray (Digital)') },
    { value: 'MG', label: t('modalityMammography', 'Mammography') },
    { value: 'NM', label: t('modalityNuclearMedicine', 'Nuclear Medicine') },
    { value: 'PT', label: t('modalityPet', 'PET') },
    { value: 'RF', label: t('modalityFluoroscopy', 'Fluoroscopy') },
    { value: 'XA', label: t('modalityAngiography', 'Angiography') },
    { value: 'OT', label: t('modalityOther', 'Other') },
  ];

  const handlePresetChange = (preset: DateRangePreset) => {
    if (preset === 'custom') {
      const dispose = showModal('custom-date-range-modal', {
        initialStart: values.customStart,
        initialEnd: values.customEnd,
        onApply: (start: Date, end: Date) => {
          onChange({ ...values, dateRangePreset: 'custom', customStart: start, customEnd: end });
        },
        closeModal: () => dispose(),
      });
    } else {
      onChange({ ...values, dateRangePreset: preset });
    }
  };

  const customLabel =
    values.dateRangePreset === 'custom' && values.customStart && values.customEnd
      ? `${dayjs(values.customStart).format('MMM D')} – ${dayjs(values.customEnd).format('MMM D, YYYY')}`
      : t('custom', 'Custom');

  return (
    <div className={styles.filterBar}>
      <div className={styles.filterGroup}>
        <span className={styles.filterLabel}>{dateRangeLabel ?? t('dateRange', 'Date Range')}</span>
        <Layer>
          <Select
            id="radiology-date-range"
            labelText=""
            hideLabel
            size="md"
            value={values.dateRangePreset}
            onChange={(e) => handlePresetChange(e.target.value as DateRangePreset)}>
            <SelectItem value="today" text={t('today', 'Today')} />
            <SelectItem value="yesterday" text={t('yesterday', 'Yesterday')} />
            <SelectItem value="last7days" text={t('last7Days', 'Last 7 Days')} />
            <SelectItem value="last30days" text={t('last30Days', 'Last 30 Days')} />
            <SelectItem value="thisMonth" text={t('thisMonth', 'This Month')} />
            <SelectItem value="custom" text={customLabel} />
          </Select>
        </Layer>
      </div>

      {showPriorityFilter && (
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>{t('priority', 'Priority')}</span>
          <Layer>
            <Select
              id="radiology-priority"
              labelText=""
              hideLabel
              size="md"
              value={values.priority}
              onChange={(e) => set('priority', e.target.value as PriorityFilter)}>
              <SelectItem value="all" text={t('all', 'All')} />
              <SelectItem value="STAT" text="STAT" />
              <SelectItem value="ROUTINE" text={t('routine', 'Routine')} />
              <SelectItem value="ON_SCHEDULED_DATE" text={t('scheduled', 'Scheduled')} />
            </Select>
          </Layer>
        </div>
      )}

      {showModalityFilter && (
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>{t('modality', 'Modality')}</span>
          <Layer>
            <Select
              id="radiology-modality"
              labelText=""
              hideLabel
              size="md"
              value={values.modality ?? 'all'}
              onChange={(e) => set('modality', e.target.value as ModalityFilter)}>
              {modalityOptions.map((option) => (
                <SelectItem key={option.value} value={option.value} text={option.label} />
              ))}
            </Select>
          </Layer>
        </div>
      )}

      {showStatusFilter && (
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>{t('status', 'Status')}</span>
          <Layer>
            <Select
              id="radiology-status"
              labelText=""
              hideLabel
              size="md"
              value={values.status}
              onChange={(e) => set('status', e.target.value as StatusFilter)}>
              <SelectItem value="all" text={t('all', 'All')} />
              <SelectItem value="unassigned" text={t('unassigned', 'Unassigned')} />
              <SelectItem value="IN_PROGRESS" text={t('inProgress', 'In Progress')} />
              <SelectItem value="COMPLETED" text={t('completed', 'Completed')} />
              <SelectItem value="EXCEPTION" text={t('referredExternally', 'Referred Externally')} />
              <SelectItem value="DECLINED" text={t('declined', 'Declined')} />
            </Select>
          </Layer>
        </div>
      )}
    </div>
  );
};

export default RadiologyFilters;
