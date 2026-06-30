import { ConfigurableLink } from '@openmrs/esm-framework';
import React, { type FC } from 'react';

type HyperLinkPatientCellProps = {
  patientUuid: string;
  patientName: string;
};

export const HyperLinkPatientCell: FC<HyperLinkPatientCellProps> = ({ patientUuid, patientName }) => {
  const patientChartUrl = '${openmrsSpaBase}/patient/${patientUuid}/chart/Patient Summary';
  return (
    <ConfigurableLink to={patientChartUrl} templateParams={{ patientUuid }} style={{ textDecoration: 'none' }}>
      {patientName}
    </ConfigurableLink>
  );
};
