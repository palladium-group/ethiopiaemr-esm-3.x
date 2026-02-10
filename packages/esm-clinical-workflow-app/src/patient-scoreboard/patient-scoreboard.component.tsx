import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ContentSwitcher, Switch } from '@carbon/react';
import { isDesktop, useLayoutType } from '@openmrs/esm-framework';

import styles from './patient-scoreboard.component.scss';
import ActiveVisitsCard from './visit-cards/active-visits.card';
import PastVisitsCard from './visit-cards/scheduled-visits.card';
import TotalVisitsCard from './visit-cards/total-visits.card';
import VisitsTable from './visits-table/visits-table.component';
import { useActiveVisits, usePastVisits, useTotalVisits } from './hooks/useVisitList';
import { DEFAULT_PAGE_SIZE } from '../constants';

type VisitType = 'active' | 'past' | 'all';

const PatientScoreboard: React.FC = () => {
  const { t } = useTranslation();
  const layout = useLayoutType();
  const responsiveSize = isDesktop(layout) ? 'sm' : 'md';
  const [selectedVisitType, setSelectedVisitType] = useState<VisitType>('active');
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [currentPage, setCurrentPage] = useState(1);

  // Calculate startIndex based on currentPage and pageSize
  // startIndex is 0-based: page 1 = startIndex 0, page 2 = startIndex 25 (if pageSize is 25)
  const startIndex = (currentPage - 1) * pageSize;

  const paginationParams = {
    startIndex,
    limit: pageSize,
  };

  const { visits: activeVisits, isLoading: isLoadingActive, count: activeCount } = useActiveVisits(paginationParams);
  // Past visits: fetch all without pagination, will do local pagination
  const { visits: allPastVisits, isLoading: isLoadingPast, count: pastCount } = usePastVisits();
  const { visits: totalVisits, isLoading: isLoadingTotal, count: totalVisitsCount } = useTotalVisits(paginationParams);

  // Reset to page 1 when switching visit types
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedVisitType]);

  const getCurrentVisits = () => {
    switch (selectedVisitType) {
      case 'active':
        return {
          visits: activeVisits,
          isLoading: isLoadingActive,
          heading: t('activeVisits', 'Active Visits'),
          totalCount: activeCount,
          useLocalPagination: false, // API pagination
        };
      case 'past':
        return {
          visits: allPastVisits,
          isLoading: isLoadingPast,
          heading: t('pastVisits', 'Past Visits'),
          totalCount: pastCount,
          useLocalPagination: true, // Local pagination
        };
      case 'all':
        return {
          visits: totalVisits,
          isLoading: isLoadingTotal,
          heading: t('allVisits', 'All Visits'),
          totalCount: totalVisitsCount,
          useLocalPagination: false, // API pagination
        };
      default:
        return { visits: [], isLoading: false, heading: '', totalCount: 0, useLocalPagination: false };
    }
  };

  const { visits, isLoading, heading, totalCount, useLocalPagination } = getCurrentVisits();

  const handleVisitTypeChange = ({ name }: { name: string }) => {
    setSelectedVisitType(name as VisitType);
  };

  const handlePaginationChange = ({ page, pageSize: newPageSize }: { page: number; pageSize: number }) => {
    setCurrentPage(page);
    setPageSize(newPageSize);
  };

  return (
    <div className={styles.patientScoreboardContainer}>
      <h1>Patient Scoreboard</h1>
      <div className={styles.cardsGrid}>
        <ActiveVisitsCard />
        <PastVisitsCard />
        <TotalVisitsCard />
      </div>

      <div className={styles.visitsSection}>
        <ContentSwitcher
          className={styles.switcher}
          size={responsiveSize}
          onChange={handleVisitTypeChange}
          selectedIndex={['active', 'past', 'all'].indexOf(selectedVisitType)}>
          <Switch name="active" text={t('active', 'Active')} />
          <Switch name="past" text={t('past', 'Past')} />
          <Switch name="all" text={t('all', 'All')} />
        </ContentSwitcher>

        <VisitsTable
          visits={visits}
          isLoading={isLoading}
          tableHeading={heading}
          totalCount={totalCount}
          pageSize={pageSize}
          currentPage={currentPage}
          onPaginationChange={handlePaginationChange}
          useLocalPagination={useLocalPagination}
        />
      </div>
    </div>
  );
};

export default PatientScoreboard;
