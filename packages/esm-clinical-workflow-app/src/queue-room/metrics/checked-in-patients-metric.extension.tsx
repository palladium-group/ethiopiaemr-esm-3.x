import React from 'react';
import { useTranslation } from 'react-i18next';
import { MetricsCard, MetricsCardBody, MetricsCardHeader, MetricsCardItem } from './metrics-card.component';
import { useCheckedInPatientsCount } from './checked-in-patients-metric.resource';

const CheckedInPatientsMetricExtension: React.FC = () => {
  const { t } = useTranslation();
  const { isLoading, activeVisitsCount, error } = useCheckedInPatientsCount();

  return (
    <MetricsCard>
      <MetricsCardHeader title={t('checkedInPatients', 'Checked in patients')} />
      <MetricsCardBody>
        <MetricsCardItem
          label={t('patients', 'Patients')}
          value={isLoading ? '--' : error ? '--' : activeVisitsCount}
        />
      </MetricsCardBody>
    </MetricsCard>
  );
};

export default CheckedInPatientsMetricExtension;
