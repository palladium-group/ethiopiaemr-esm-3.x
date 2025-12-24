import React from 'react';
import { useTranslation } from 'react-i18next';

import MetricsCard from '../metrics-card/metrics-card.component';
import { useTotalVisits } from '../hooks/useVisitList';

export default function TotalVisitsCard() {
  const { t } = useTranslation();
  const { count, isLoading } = useTotalVisits();

  return (
    <MetricsCard
      headerLabel={t('totalVisits', 'Total Visits')}
      label={t('visits', 'Visits')}
      value={isLoading ? '...' : count}
    />
  );
}
