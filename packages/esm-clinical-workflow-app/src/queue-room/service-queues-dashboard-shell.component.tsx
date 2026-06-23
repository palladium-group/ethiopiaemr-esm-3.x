import React from 'react';
import { ExtensionSlot } from '@openmrs/esm-framework';
import PatientQueueHeader from './patient-queue-header.component';
import styles from './service-queues-dashboard-shell.scss';

/**
 * Replaces the upstream service-queues-dashboard root shell (header + metrics)
 * after the default queue table extension is removed from the slot.
 */
const ServiceQueuesDashboardShell: React.FC = () => {
  return (
    <>
      <PatientQueueHeader showFilters />
      <ExtensionSlot
        className={styles.metricsContainer}
        data-testid="clinic-metrics"
        name="service-queues-metrics-slot"
      />
    </>
  );
};

export default ServiceQueuesDashboardShell;
