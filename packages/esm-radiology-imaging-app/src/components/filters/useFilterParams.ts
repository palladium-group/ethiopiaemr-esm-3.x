import dayjs from 'dayjs';
import { useSearchParams } from 'react-router-dom';
import type {
  DateRangePreset,
  ModalityFilter,
  PriorityFilter,
  RadiologyFilterValues,
  StatusFilter,
} from './radiology-filters.component';

// The date pickers produce dates at *local* midnight. Serialize/parse using local calendar
// components (not `toISOString()`, which shifts to UTC and can move the date back a day for
// timezones ahead of UTC).
const DATE_PARAM_FORMAT = 'YYYY-MM-DD';

export function useFilterParams(
  defaults: RadiologyFilterValues,
): [RadiologyFilterValues, (v: RadiologyFilterValues) => void] {
  const [params, setParams] = useSearchParams();

  const filters: RadiologyFilterValues = {
    dateRangePreset: (params.get('dateRange') as DateRangePreset) ?? defaults.dateRangePreset,
    priority: (params.get('priority') as PriorityFilter) ?? defaults.priority,
    status: (params.get('status') as StatusFilter) ?? defaults.status,
    modality: (params.get('modality') as ModalityFilter) ?? defaults.modality,
    customStart: params.get('customStart')
      ? dayjs(params.get('customStart')!).startOf('day').toDate()
      : defaults.customStart,
    customEnd: params.get('customEnd') ? dayjs(params.get('customEnd')!).endOf('day').toDate() : defaults.customEnd,
  };

  const setFilters = (next: RadiologyFilterValues) => {
    setParams(
      (prev) => {
        const updated = new URLSearchParams(prev);
        updated.set('dateRange', next.dateRangePreset);
        updated.set('priority', next.priority);
        updated.set('status', next.status);
        if (next.modality) {
          updated.set('modality', next.modality);
        } else {
          updated.delete('modality');
        }
        if (next.customStart) {
          updated.set('customStart', dayjs(next.customStart).format(DATE_PARAM_FORMAT));
        } else {
          updated.delete('customStart');
        }
        if (next.customEnd) {
          updated.set('customEnd', dayjs(next.customEnd).format(DATE_PARAM_FORMAT));
        } else {
          updated.delete('customEnd');
        }
        return updated;
      },
      { replace: true },
    );
  };

  return [filters, setFilters];
}
