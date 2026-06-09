import React from 'react';

/**
 * Renders nothing. Exists so the quota module is lazy-loaded when the community
 * booking form mounts (patient-header-slot is inside the form workspace).
 * Without this, the module only loads from the appointments metrics tile and
 * startupApp never runs when booking from the patient chart on a fresh page load.
 */
const QuotaBookingFormBootstrap: React.FC = () => null;

export default QuotaBookingFormBootstrap;
