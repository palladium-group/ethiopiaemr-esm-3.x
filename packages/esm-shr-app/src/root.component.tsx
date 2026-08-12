import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ShrAdmin from './components/shr-admin.component';
import styles from './root.scss';

const Root: React.FC = () => {
  const spaBasePath = `${window.getOpenmrsSpaBase()}shr-admin`;

  return (
    <BrowserRouter basename={spaBasePath}>
      <main className={styles.container}>
        <Routes>
          <Route path="/" element={<ShrAdmin />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
};

export default Root;
