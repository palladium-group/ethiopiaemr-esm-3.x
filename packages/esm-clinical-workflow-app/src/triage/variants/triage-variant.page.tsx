import React from 'react';
import TriageVariantDashboard from './triage-variant.dashboard';

interface TriageVariantPageProps {
  variant: string;
}

const TriageVariantPage: React.FC<TriageVariantPageProps> = ({ variant }) => {
  return <TriageVariantDashboard variant={variant} />;
};

export default TriageVariantPage;
