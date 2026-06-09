import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import EtlAdmin from './components/etl-admin.component';
import styles from './root.scss';

const Root: React.FC = () => {
  const spaBasePath = `${window.getOpenmrsSpaBase()}etl-admin`;

  return (
    <BrowserRouter basename={spaBasePath}>
      <main className={styles.container}>
        <Routes>
          <Route path="/" element={<EtlAdmin />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
};

export default Root;
