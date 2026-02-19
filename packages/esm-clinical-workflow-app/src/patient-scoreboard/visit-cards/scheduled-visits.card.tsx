import React from 'react';
import { useTranslation } from 'react-i18next';

import MetricsCard from '../metrics-card/metrics-card.component';
import { useScheduledAppointments } from '../hooks/useAppointmentList';

export default function ScheduledVisitsCard() {
  const { t } = useTranslation();
  const { count, isLoading } = useScheduledAppointments();

  return (
    <MetricsCard
      headerLabel={t('scheduledForToday', 'Scheduled for Today')}
      label={t('appointments', 'Appointments')}
      value={isLoading ? '...' : count}
    />
  );
}
