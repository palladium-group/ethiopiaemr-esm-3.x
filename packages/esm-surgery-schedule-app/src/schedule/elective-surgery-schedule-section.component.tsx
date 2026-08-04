import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import ElectiveSurgeryScheduleTable from './elective-surgery-schedule-table.component';
import type { ElectiveSurgeryScheduleItem, SurgeryCategory } from '../types/elective-surgery-schedule.types';
import { getCategoryLabel } from '../utils/schedule-status.utils';
import styles from '../homepage/elective-surgery-schedule-dashboard.scss';

interface ElectiveSurgeryScheduleSectionProps {
  category: SurgeryCategory;
  schedules: Array<ElectiveSurgeryScheduleItem>;
  onActionComplete: () => void;
}

const ElectiveSurgeryScheduleSection: React.FC<ElectiveSurgeryScheduleSectionProps> = ({
  category,
  schedules,
  onActionComplete,
}) => {
  const { t } = useTranslation();
  const sectionTitle = useMemo(() => getCategoryLabel(t, category), [category, t]);

  return (
    <section className={styles.section}>
      <h5 className={styles.sectionTitle}>{sectionTitle}</h5>
      {!schedules.length ? (
        <p className={styles.emptySection}>{t('noPatientsInCategory', 'No patients in this category.')}</p>
      ) : (
        <ElectiveSurgeryScheduleTable schedules={schedules} onActionComplete={onActionComplete} />
      )}
    </section>
  );
};

export default ElectiveSurgeryScheduleSection;
