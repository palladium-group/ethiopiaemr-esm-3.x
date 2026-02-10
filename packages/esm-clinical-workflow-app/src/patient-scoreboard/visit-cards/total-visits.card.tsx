import React from 'react';
import { useTranslation } from 'react-i18next';

import MetricsCard from '../metrics-card/metrics-card.component';
import { useTodayVisits } from '../hooks/useVisitList';

export default function TotalVisitsCard() {
  const { t } = useTranslation();
  const { totalCount, isLoading } = useTodayVisits();

  return (
    <MetricsCard
      headerLabel={t('totalVisits', 'Total Visits')}
      label={t('visits', 'Visits')}
      value={isLoading ? '...' : totalCount}
    />
  );
}
