import React from 'react';
import { Route, Routes } from 'react-router-dom';
import ConsultationDetail from '../consultation-detail/consultation-detail.component';
import ConsultationListPage from './consultation-list-page.component';

interface ConsultationDashboardProps {
  patient: fhir.Patient;
}

export default function ConsultationDashboard({ patient }: ConsultationDashboardProps) {
  return (
    <Routes>
      <Route index element={<ConsultationListPage patient={patient} />} />
      <Route path=":encounterUuid" element={<ConsultationDetail patient={patient} />} />
    </Routes>
  );
}
