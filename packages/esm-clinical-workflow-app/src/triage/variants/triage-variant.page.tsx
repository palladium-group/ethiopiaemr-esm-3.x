import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import TriageVariantDashboard from './triage-variant.dashboard';

interface TriageVariantPageProps {
  variant: string;
}

const TriageVariantPage: React.FC<TriageVariantPageProps> = ({ variant }) => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="*" element={<TriageVariantDashboard variant={variant} />} />
      </Routes>
    </BrowserRouter>
  );
};

export default TriageVariantPage;
