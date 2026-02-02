import React from 'react';
import { useTranslation } from 'react-i18next';
import { Tile } from '@carbon/react';
import { Search } from '@carbon/react/icons';
import styles from '../triage-dashboard.scss';

const EmptyState: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className={styles.emptyStateContainer}>
      <Tile className={styles.emptyStateTile}>
        <div className={styles.emptyStateContent}>
          <div className={styles.emptyStateIcon}>
            <Search size={48} />
          </div>
          <h3 className={styles.emptyStateHeading}>{t('noPatientSelected', 'No patient selected')}</h3>
          <p className={styles.emptyStateDescription}>
            {t(
              'searchForPatientToStartTriage',
              'Search for a patient using the search bar above to start the triage process, or register a new patient.',
            )}
          </p>
        </div>
      </Tile>
    </div>
  );
};

export default EmptyState;
