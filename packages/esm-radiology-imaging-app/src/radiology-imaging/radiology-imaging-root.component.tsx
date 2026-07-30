import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useLeftNav } from '@openmrs/esm-framework';
import RadiologyImagingDashboard from './radiology-imaging-dashboard.component';
import {
  IncomingOrdersView,
  ScheduledOrdersView,
  InProgressView,
  ImageAcquiredView,
  NotDoneView,
  ReferredOutView,
  ImagingSearchView,
} from './orders';
import { PreliminaryReportView, FinalizedReportView, FinalizedReportPage } from './reports';
import styles from './radiology-imaging-root.scss';
import ImagingDetails from './imaging-details/imaging-details.component';

const basePath = `${window.spaBase}/radiology-imaging`;

const RadiologyImagingRoot: React.FC = () => {
  useLeftNav({ name: 'radiology-imaging-left-panel-slot', basePath });

  return (
    <BrowserRouter basename={basePath}>
      <main className={styles.container}>
        <Routes>
          <Route path="/" element={<RadiologyImagingDashboard />}>
            <Route index element={<Navigate to="incoming-orders" replace />} />
            <Route path="incoming-orders" element={<IncomingOrdersView />} />
            <Route path="scheduled-orders" element={<ScheduledOrdersView />} />
            <Route path="imaging-details/:orderUuid" element={<ImagingDetails />} />
            <Route path="in-progress" element={<InProgressView />} />
            <Route path="image-acquired" element={<ImageAcquiredView />} />
            <Route path="preliminary-report" element={<PreliminaryReportView />} />
            <Route path="finalized-report" element={<FinalizedReportView />} />
            <Route path="finalized-report/:procedureUuid" element={<FinalizedReportPage />} />
            <Route path="referred-out" element={<ReferredOutView />} />
            <Route path="not-done" element={<NotDoneView />} />
            <Route path="imaging-search" element={<ImagingSearchView />} />
          </Route>
        </Routes>
      </main>
    </BrowserRouter>
  );
};

export default RadiologyImagingRoot;
