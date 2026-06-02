import React from 'react';
import { useTranslation } from 'react-i18next';
import { Tile } from '@carbon/react';
import { formatDatetime } from '@openmrs/esm-framework';
import type { ConsultationThread } from '../types/consultation.types';
import styles from './consultation-conversation-view.scss';

interface ConsultationConversationViewProps {
  consultation: ConsultationThread;
}

function DetailField({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className={styles.field}>
      <dt>{label}</dt>
      <dd>{value?.trim() ? value : '--'}</dd>
    </div>
  );
}

const ConsultationConversationView: React.FC<ConsultationConversationViewProps> = ({ consultation }) => {
  const { t } = useTranslation();
  const isCompleted = consultation.status === 'completed';

  return (
    <div className={styles.container}>
      <Tile className={styles.section}>
        <h4 className={styles.sectionTitle}>{t('consultationRequest', 'Consultation request')}</h4>
        <dl className={styles.fieldList}>
          <DetailField
            label={t('requestedDate', 'Requested date')}
            value={consultation.requestedAt ? formatDatetime(new Date(consultation.requestedAt)) : undefined}
          />
          <DetailField
            label={t('requestingProvider', 'Requesting provider')}
            value={consultation.requestingProvider?.display}
          />
          <DetailField
            label={t('consultingDepartment', 'Consulting department')}
            value={consultation.consultingDepartment}
          />
          <DetailField
            label={t('consultedDepartment', 'Consulted department')}
            value={consultation.consultedDepartment.display}
          />
          <DetailField label={t('consultationType', 'Type')} value={consultation.consultationType} />
          <DetailField
            label={t('reasonForConsultation', 'Reason for consultation')}
            value={consultation.request.reason}
          />
          <DetailField
            label={t('pertinentInvestigation', 'Pertinent investigation')}
            value={consultation.request.pertinentInvestigation}
          />
          <DetailField label={t('briefHistory', 'Brief history')} value={consultation.request.briefHistory} />
        </dl>
      </Tile>

      {isCompleted ? (
        <Tile className={styles.section}>
          <h4 className={styles.sectionTitle}>{t('consultationResponse', 'Consultation response')}</h4>
          <dl className={styles.fieldList}>
            <DetailField
              label={t('respondedDate', 'Responded date')}
              value={consultation.respondedAt ? formatDatetime(new Date(consultation.respondedAt)) : undefined}
            />
            <DetailField
              label={t('consultedProvider', 'Consulted provider')}
              value={consultation.consultedProvider?.display}
            />
            <DetailField label={t('briefFinding', 'Brief finding')} value={consultation.response?.briefFinding} />
            <DetailField label={t('recommendation', 'Recommendation')} value={consultation.response?.recommendation} />
          </dl>
        </Tile>
      ) : null}
    </div>
  );
};

export default ConsultationConversationView;
