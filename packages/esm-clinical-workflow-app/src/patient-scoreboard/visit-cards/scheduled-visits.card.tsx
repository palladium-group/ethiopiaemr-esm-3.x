import React from 'react';
import { useTranslation } from 'react-i18next';

import MetricsCard from '../metrics-card/metrics-card.component';
import { useTodayVisits } from '../hooks/useVisitList';

export default function PastVisitsCard() {
  const { t } = useTranslation();
  const { pastCount, isLoading } = useTodayVisits();

  return (
    <MetricsCard
      headerLabel={t('pastVisits', 'Past Visits')}
      label={t('visits', 'Visits')}
      value={isLoading ? '...' : pastCount}
    />
  );
}
