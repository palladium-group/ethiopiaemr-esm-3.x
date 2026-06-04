import React from 'react';
import { useTranslation } from 'react-i18next';
import { Tile } from '@carbon/react';
import { DocumentMultiple_01 } from '@carbon/react/icons';
import styles from './info-landing.component.scss';

const InfoLanding: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className={styles.wrapper}>
      <Tile className={styles.tile}>
        <DocumentMultiple_01 size={48} className={styles.icon} />
        <h3 className={styles.title}>{t('selectAReport', 'Select a report')}</h3>
        <p className={styles.body}>
          {t('selectAReportToBegin', 'Select a report from the menu on the left to get started.')}
        </p>
      </Tile>
    </div>
  );
};

export default InfoLanding;
