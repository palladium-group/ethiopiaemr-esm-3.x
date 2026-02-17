import React from 'react';
import { useTranslation } from 'react-i18next';

import MetricsCard from '../metrics-card/metrics-card.component';
import { useTotalVisitsCount } from '../hooks/useVisitList';

export default function TotalVisitsCard() {
  const { t } = useTranslation();
  const { count, isLoading } = useTotalVisitsCount();

  return (
    <MetricsCard
      headerLabel={t('completedVisits', 'Completed Visits')}
      label={t('visits', 'Visits')}
      value={isLoading ? '...' : count}
    />
  );
}
