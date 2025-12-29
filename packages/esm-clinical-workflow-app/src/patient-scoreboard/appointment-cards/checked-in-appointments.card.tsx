import React from 'react';
import { useTranslation } from 'react-i18next';

import MetricsCard from '../metrics-card/metrics-card.component';
import { useActiveVisits } from '../hooks/useVisitList';

export default function ActiveVisitsCard() {
  const { t } = useTranslation();
  const { count, isLoading } = useActiveVisits();

  return (
    <MetricsCard
      headerLabel={t('activeVisits', 'Active Visits')}
      label={t('visits', 'Visits')}
      value={isLoading ? '...' : count}
    />
  );
}
