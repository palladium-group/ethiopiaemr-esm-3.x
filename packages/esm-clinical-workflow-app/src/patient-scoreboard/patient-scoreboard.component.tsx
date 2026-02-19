import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ContentSwitcher, Switch } from '@carbon/react';
import { isDesktop, useLayoutType, type Visit } from '@openmrs/esm-framework';

import styles from './patient-scoreboard.component.scss';
import ActiveVisitsCard from './visit-cards/active-visits.card';
import ScheduledVisitsCard from './visit-cards/scheduled-visits.card';
import TotalVisitsCard from './visit-cards/total-visits.card';
import VisitsTable from './visits-table/visits-table.component';
import { useActiveVisits, useTotalVisits } from './hooks/useVisitList';
import { useScheduledAppointments, type Appointment } from './hooks/useAppointmentList';
import { DEFAULT_PAGE_SIZE } from '../constants';

type VisitType = 'active' | 'total' | 'scheduled';

// Transform appointments to visit-like format for display in the table
const transformAppointmentToVisit = (appointment: Appointment): Visit => {
  return {
    uuid: appointment.uuid,
    patient: {
      uuid: appointment.patient.uuid,
      person: {
        display: appointment.patient.name,
        uuid: appointment.patient.uuid,
      },
      identifiers: [
        {
          identifier: appointment.patient.identifier,
          uuid: '',
        },
      ],
    },
    visitType: {
      display: appointment.service.name,
      uuid: appointment.service.uuid,
      name: appointment.service.name,
    },
    location: appointment.location
      ? {
          display: appointment.location.name,
          uuid: appointment.location.uuid,
          name: appointment.location.name,
        }
      : undefined,
    startDatetime: appointment.startDateTime,
    stopDatetime: appointment.endDateTime,
  } as Visit;
};

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
  // Completed visits: fetch all without pagination, will do local pagination (filtered to completed today)
  const { visits: totalVisits, isLoading: isLoadingTotal, count: totalVisitsCount } = useTotalVisits();
  const { appointments, isLoading: isLoadingScheduled, count: scheduledCount } = useScheduledAppointments();

  // Transform appointments to visit-like format
  const scheduledVisits = useMemo(() => {
    return appointments.map(transformAppointmentToVisit);
  }, [appointments]);

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
      case 'total':
        return {
          visits: totalVisits,
          isLoading: isLoadingTotal,
          heading: t('completedVisits', 'Completed Visits'),
          totalCount: totalVisitsCount,
          useLocalPagination: true, // Local pagination (filtered client-side)
        };
      case 'scheduled':
        return {
          visits: scheduledVisits,
          isLoading: isLoadingScheduled,
          heading: t('scheduledForToday', 'Scheduled for Today'),
          totalCount: scheduledCount,
          useLocalPagination: true, // Local pagination
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
        <TotalVisitsCard />
        <ScheduledVisitsCard />
      </div>

      <div className={styles.visitsSection}>
        <ContentSwitcher
          className={styles.switcher}
          size={responsiveSize}
          onChange={handleVisitTypeChange}
          selectedIndex={['active', 'total', 'scheduled'].indexOf(selectedVisitType)}>
          <Switch name="active" text={t('active', 'Active')} />
          <Switch name="total" text={t('completed', 'Completed')} />
          <Switch name="scheduled" text={t('scheduledForToday', 'Scheduled for Today')} />
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
