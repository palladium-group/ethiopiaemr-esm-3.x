import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ContentSwitcher, Switch } from '@carbon/react';
import { isDesktop, useLayoutType } from '@openmrs/esm-framework';

import styles from './patient-scoreboard.component.scss';
import ActiveVisitsCard from './visit-cards/active-visits.card';
import ScheduledVisitsCard from './visit-cards/scheduled-visits.card';
import TotalVisitsCard from './visit-cards/total-visits.card';
import VisitsTable from './visits-table/visits-table.component';
import { useActiveVisits, useScheduledVisits, useTotalVisits } from './hooks/useVisitList';

type VisitType = 'active' | 'scheduled' | 'all';

const PatientScoreboard: React.FC = () => {
  const { t } = useTranslation();
  const layout = useLayoutType();
  const responsiveSize = isDesktop(layout) ? 'sm' : 'md';
  const [selectedVisitType, setSelectedVisitType] = useState<VisitType>('active');

  const { visits: activeVisits, isLoading: isLoadingActive } = useActiveVisits();
  const { visits: scheduledVisits, isLoading: isLoadingScheduled } = useScheduledVisits();
  const { visits: totalVisits, isLoading: isLoadingTotal } = useTotalVisits();

  const getCurrentVisits = () => {
    switch (selectedVisitType) {
      case 'active':
        return { visits: activeVisits, isLoading: isLoadingActive, heading: t('activeVisits', 'Active Visits') };
      case 'scheduled':
        return {
          visits: scheduledVisits,
          isLoading: isLoadingScheduled,
          heading: t('scheduledVisits', 'Scheduled Visits'),
        };
      case 'all':
        return { visits: totalVisits, isLoading: isLoadingTotal, heading: t('allVisits', 'All Visits') };
      default:
        return { visits: [], isLoading: false, heading: '' };
    }
  };

  const { visits, isLoading, heading } = getCurrentVisits();

  return (
    <div className={styles.patientScoreboardContainer}>
      <h1>Patient Scoreboard</h1>
      <div className={styles.cardsGrid}>
        <ActiveVisitsCard />
        <ScheduledVisitsCard />
        <TotalVisitsCard />
      </div>

      <div className={styles.visitsSection}>
        <ContentSwitcher
          className={styles.switcher}
          size={responsiveSize}
          onChange={({ name }) => setSelectedVisitType(name as VisitType)}
          selectedIndex={['active', 'scheduled', 'all'].indexOf(selectedVisitType)}>
          <Switch name="active" text={t('active', 'Active')} />
          <Switch name="scheduled" text={t('scheduled', 'Scheduled')} />
          <Switch name="all" text={t('all', 'All')} />
        </ContentSwitcher>

        <VisitsTable visits={visits} isLoading={isLoading} tableHeading={heading} />
      </div>
    </div>
  );
};

export default PatientScoreboard;
