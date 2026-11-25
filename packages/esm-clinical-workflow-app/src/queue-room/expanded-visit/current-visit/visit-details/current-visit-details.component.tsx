import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  StructuredListBody,
  StructuredListCell,
  StructuredListHead,
  StructuredListRow,
  StructuredListWrapper,
} from '@carbon/react';
import { type Visit } from '@openmrs/esm-framework';
import { useVitalsFromObs } from '../hooks/useVitalsConceptMetadata';
import Vitals from './vitals.component';
import styles from '../current-visit.scss';

interface CurrentVisitDetailsProps {
  patientUuid: string;
  visit: Visit;
  mutateVisit?: () => void;
}

const CurrentVisitDetails: React.FC<CurrentVisitDetailsProps> = ({ patientUuid, visit, mutateVisit }) => {
  const { t } = useTranslation();
  const vitals = useVitalsFromObs(visit?.encounters);

  return (
    <div className={styles.wrapper}>
      <div className={styles.visitContainer}>
        <StructuredListWrapper className={styles.structuredList}>
          <StructuredListHead />
          <StructuredListBody>
            <StructuredListRow className={styles.structuredListRow}>
              <StructuredListCell>{t('vitals', 'Vitals')}</StructuredListCell>
              <StructuredListCell>
                <Vitals
                  vitals={vitals}
                  patientUuid={patientUuid}
                  visitType="currentVisit"
                  visit={visit}
                  mutateVisit={mutateVisit}
                />
              </StructuredListCell>
            </StructuredListRow>
          </StructuredListBody>
        </StructuredListWrapper>
      </div>
    </div>
  );
};

export default CurrentVisitDetails;
