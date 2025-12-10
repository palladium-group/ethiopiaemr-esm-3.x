import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { spaBasePath } from '../constants';
import MRU from './mru.component';

const MRUDashboard: React.FC = () => {
  return (
    <BrowserRouter basename={`${spaBasePath}/mru`}>
      <Routes>
        <Route path="/" element={<MRU />} />
        <Route path="/:patientUuid" element={<MRU />} />
      </Routes>
    </BrowserRouter>
  );
};

export default MRUDashboard;
