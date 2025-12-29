import React from 'react';
import { useTranslation } from 'react-i18next';

import MetricsCard from '../metrics-card/metrics-card.component';
import { useScheduledVisits } from '../hooks/useVisitList';

export default function ScheduledVisitsCard() {
  const { t } = useTranslation();
  const { count, isLoading } = useScheduledVisits();

  return (
    <MetricsCard
      headerLabel={t('pastVisits', 'Past Visits')}
      label={t('visits', 'Visits')}
      value={isLoading ? '...' : count}
    />
  );
}
