import React from 'react';
import styles from '../payment-history.scss';
import { usePaymentFilterContext } from '../usePaymentFilterContext';
import { OpenmrsDateRangePicker } from '@openmrs/esm-framework';
import dayjs from 'dayjs';

export const DateRangeFilter = () => {
  const { dateRange, setDateRange } = usePaymentFilterContext();

  const handleDateRangeChange = ([start, end]: Array<Date>) => {
    if (start && end) {
      setDateRange([dayjs(start).startOf('day').toDate(), dayjs(end).endOf('day').toDate()]);
    }
  };

  return (
    <OpenmrsDateRangePicker
      value={[...dateRange]}
      onChange={handleDateRangeChange}
      maxDate={new Date()}
      className={styles.dateRangePicker}
    />
  );
};
