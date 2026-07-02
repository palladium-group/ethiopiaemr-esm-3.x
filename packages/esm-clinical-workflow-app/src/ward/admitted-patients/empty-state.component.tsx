import { Tile } from '@carbon/react';
import { EmptyCardIllustration } from '@openmrs/esm-framework';
import React, { type FC } from 'react';
import styles from './empty-state.scss';

type EmptyStateProps = {
  message?: string;
};

export const EmptyState: FC<EmptyStateProps> = ({ message }) => {
  return (
    <Tile className={styles.empty}>
      <EmptyCardIllustration />
      <p>{message}</p>
    </Tile>
  );
};
