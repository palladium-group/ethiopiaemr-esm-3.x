import React from 'react';
import { Tag } from '@carbon/react';
import { type Visit } from '@openmrs/esm-framework';
import { DiagnosisTags } from './diagnosis-tags.component';
import { useTranslation } from 'react-i18next';
import styles from './visit-diagnoses-cell-with-certainty.module.scss';

interface Props {
  visit: Visit;
  patient: fhir.Patient;
}

const VisitDiagnosisCell: React.FC<Props> = ({ visit }) => {
  const { t } = useTranslation();
  const diagnoses = visit.encounters
    .flatMap((enc) => enc.diagnoses)
    .filter((d) => !d.voided)
    .sort((a, b) => a.rank - b.rank);

  if (!diagnoses.length) {
    return null;
  }

  return (
    <div className={styles.cell}>
      <DiagnosisTags diagnoses={diagnoses} />
    </div>
  );
};

export default VisitDiagnosisCell;
