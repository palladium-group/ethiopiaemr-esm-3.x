import React from 'react';
import { createDashboardLink } from '@openmrs/esm-patient-common-lib';
import { useShrEnabled } from './shr-chart.resource';
import { shrDashboardMeta } from './dashboard.meta';

const DashboardLink = createDashboardLink(shrDashboardMeta);

/** The chart's left-nav link, shown only where the SHR is switched on. */
const ShrDashboardLink: React.FC<{ basePath: string }> = (props) => {
  const { isEnabled } = useShrEnabled();
  return isEnabled ? <DashboardLink {...props} /> : null;
};

export default ShrDashboardLink;
