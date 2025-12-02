import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { useLeftNav } from '@openmrs/esm-framework';

import { spaBasePath } from './constants';
import styles from './root.scss';

const Root: React.FC = () => {
  useLeftNav({ name: 'clinical-workflow-left-panel-slot', basePath: spaBasePath });

  return (
    <BrowserRouter basename={spaBasePath}>
      <main className={styles.container}>
        <Routes></Routes>
      </main>
    </BrowserRouter>
  );
};

export default Root;
