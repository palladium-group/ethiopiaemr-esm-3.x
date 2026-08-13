import React from 'react';
import { createDashboardLink as createPatientChartDashboardLink } from '@openmrs/esm-patient-common-lib';
import { useConfig } from '@openmrs/esm-framework';
import { type ClinicalWorkflowConfig } from '../config-schema';

const LegacySummaryLink = createPatientChartDashboardLink({
  path: 'legacy-summary',
  title: 'Legacy Summary',
  icon: 'omrs-icon-document',
});

type LegacySummaryDashboardLinkProps = {
  basePath: string;
};

const LegacySummaryDashboardLink: React.FC<LegacySummaryDashboardLinkProps> = ({ basePath }) => {
  const config = useConfig<ClinicalWorkflowConfig>();

  if (config.legacySummaryDisplayEnabled === false) {
    return null;
  }

  return <LegacySummaryLink basePath={basePath} />;
};

export default LegacySummaryDashboardLink;
