import React from 'react';
import styles from './procedure-info-card.scss';

type ProcedureInfoItem = {
  label: string;
  value?: React.ReactNode;
};

type ProcedureInfoCardProps = {
  items: Array<ProcedureInfoItem>;
  className?: string;
};

export const ProcedureInfoCard: React.FC<ProcedureInfoCardProps> = ({ items, className }) => {
  return (
    <div className={`${styles.procedureInfo} ${className ?? ''}`}>
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`} className={styles.procedureInfoCard}>
          <div className={styles.label}>{item.label}</div>
          <div className={styles.value}>{item.value || '—'}</div>
        </div>
      ))}
    </div>
  );
};
