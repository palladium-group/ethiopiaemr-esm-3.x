import React from 'react';
import { BrowserRouter, Route, Routes, useParams } from 'react-router-dom';
import ReportsLeftNav from './left-nav/reports-left-nav.component';
import InfoLanding from './report/info-landing.component';
import ReportRunner from './report/report-runner.component';
import styles from './root.scss';

/**
 * Remount ReportRunner whenever the selected report changes by giving it a
 * key tied to the route param. Without this, React Router reuses the single
 * <ReportRunner> instance across report navigations, so its local state
 * (the previously-run results) bleeds into the next report until it is re-run.
 * A changing key forces a fresh instance with reset state.
 */
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
