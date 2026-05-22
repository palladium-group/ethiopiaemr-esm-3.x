import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ConsultationDetail from '../consultation-detail/consultation-detail.component';
import ConsultationListPage from './consultation-list-page.component';

interface ConsultationDashboardProps {
  patient: fhir.Patient;
}

export default function ConsultationDashboard({ patient }: ConsultationDashboardProps) {
  const consultationBasePath = `${window.getOpenmrsSpaBase()}patient/${patient.id}/chart/consultation`;

  return (
    <BrowserRouter basename={consultationBasePath}>
      <Routes>
        <Route index element={<ConsultationListPage patient={patient} />} />
        <Route path=":encounterUuid" element={<ConsultationDetail patient={patient} />} />
      </Routes>
    </BrowserRouter>
  );
}
