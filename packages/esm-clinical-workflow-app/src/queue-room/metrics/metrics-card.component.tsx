import React from 'react';
import classNames from 'classnames';
import { Layer, Tile } from '@carbon/react';
import styles from './metrics-card.scss';

interface MetricsCardProps {
  children?: React.ReactNode;
}

export const MetricsCard: React.FC<MetricsCardProps> = ({ children }) => {
  return (
    <Layer
      className={classNames({
        cardWithChildren: children,
      })}>
      <Tile className={styles.tileContainer}>{children}</Tile>
    </Layer>
  );
};

interface MetricsCardHeaderProps {
  title: string;
}

export const MetricsCardHeader: React.FC<MetricsCardHeaderProps> = ({ title }) => {
  return (
    <div className={styles.tileHeader}>
      <div className={styles.headerLabelContainer}>
        <label className={styles.headerLabel}>{title}</label>
      </div>
    </div>
  );
};

interface MetricsCardBodyProps {
  children?: React.ReactNode;
}

export const MetricsCardBody: React.FC<MetricsCardBodyProps> = ({ children }) => {
  return <div className={styles.metricsContainer}>{children}</div>;
};

interface MetricsCardItemProps {
  label: string;
  value: number | string | null;
}

export const MetricsCardItem: React.FC<MetricsCardItemProps> = ({ label, value }) => {
  if (value === null) {
    return null;
  }

  return (
    <div className={classNames(styles.metricItem, styles.mainItem)}>
      <span className={styles.metricLabel}>{label}</span>
      <p className={styles.metricValue}>{value}</p>
    </div>
  );
};
