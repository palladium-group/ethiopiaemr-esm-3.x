import React from 'react';
import { BrowserRouter, Route, Routes, useParams } from 'react-router-dom';
import ReportsLeftNav from './left-nav/reports-left-nav.component';
import InfoLanding from './report/info-landing.component';
import ReportRunner from './report/report-runner.component';
import styles from './root.scss';

// Force a fresh ReportRunner (reset local state) on every report navigation.
const ReportRunnerWithKey: React.FC = () => {
  const { reportUuid } = useParams<{ reportUuid: string }>();
  return <ReportRunner key={reportUuid} />;
};

const Root: React.FC = () => {
  const spaBasePath = `${window.getOpenmrsSpaBase()}reports`;

  return (
    <BrowserRouter basename={spaBasePath}>
      <ReportsLeftNav />
      <main className={styles.container}>
        <Routes>
          <Route path="/" element={<InfoLanding />} />
          <Route path="/:reportUuid" element={<ReportRunnerWithKey />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
};

export default Root;
