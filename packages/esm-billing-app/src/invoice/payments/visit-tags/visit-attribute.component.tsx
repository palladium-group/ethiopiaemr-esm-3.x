import React from 'react';
import { Tag } from '@carbon/react';
import { Money } from '@carbon/react/icons';
import { useParams } from 'react-router-dom';
import { usePatientPaymentInfo } from '../../../billing.resource';
import styles from './visit-attribute.scss';

type VisitAttributeTagsProps = {
  patientUuid?: string;
  patient?: { id?: string; uuid?: string };
};

const VisitAttributeTags: React.FC<VisitAttributeTagsProps> = ({ patientUuid, patient }) => {
  const routeParams = useParams<{ patientUuid?: string }>();
  const resolvedPatientUuid = patientUuid || patient?.id || patient?.uuid || routeParams?.patientUuid;
  const { activeVisit, paymentType, isLoading } = usePatientPaymentInfo(resolvedPatientUuid);

  if (isLoading || !activeVisit || !paymentType) {
    return null;
  }

  return (
    <div className={styles.visitAttributeTagsContainer}>
      <Tag type="purple" renderIcon={Money} className={styles.paymentTypeTag}>
        {paymentType}
      </Tag>
    </div>
  );
};

export default VisitAttributeTags;
