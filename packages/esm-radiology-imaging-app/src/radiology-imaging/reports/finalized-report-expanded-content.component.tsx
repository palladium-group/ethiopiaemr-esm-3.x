import React from 'react';
import { useTranslation } from 'react-i18next';
import { ErrorCard, formatDate, parseDate } from '@openmrs/esm-framework';
import { SkeletonText, Tag } from '@carbon/react';
import ImagingSeriesPanel from '../imaging-details/imaging-series/imaging-series-panel.component';
import {
  ClinicalHistorySection,
  FindingsSection,
  getDisplayName,
  ImpressionBlock,
  RadiologistEntry,
  ReportHeader,
  useReportPatientData,
} from './report-expanded-content.shared';
import { type Procedure } from '../../types';
import styles from './finalized-report-expanded-content.scss';

interface Props {
  procedure: Procedure;
}

const FinalizedReportExpandedContent: React.FC<Props> = ({ procedure }) => {
  const { t } = useTranslation();
  const { patient, isLoading, error, mrn, dobDisplay } = useReportPatientData(procedure.patient.uuid);

  if (isLoading) {
    return <SkeletonText paragraph lineCount={4} />;
  }
  if (error) {
    return <ErrorCard error={error} headerTitle={t('errorLoadingPatient', 'Error loading patient')} />;
  }

  const studyDate = procedure.parentOrder.dateActivated
    ? formatDate(parseDate(procedure.parentOrder.dateActivated), { noToday: true })
    : '—';
  const accession = procedure.parentOrder.accessionNumber ?? procedure.parentOrder.orderNumber ?? '—';

  const residentRadiologist = getDisplayName(procedure.preliminaryReportEnteredBy);
  const reportEnteredAt = procedure.preliminaryReportEnteredAt
    ? formatDate(parseDate(procedure.preliminaryReportEnteredAt), { noToday: true, time: true })
    : null;

  const attendingRadiologist = getDisplayName(procedure.preliminaryReportApprovedBy);
  const reportApprovedAt = procedure.preliminaryReportApprovedAt
    ? formatDate(parseDate(procedure.preliminaryReportApprovedAt), { noToday: true, time: true })
    : null;

  return (
    <div className={styles.wrapper}>
      <ReportHeader
        patient={patient}
        mrn={mrn}
        dobDisplay={dobDisplay}
        studyDate={studyDate}
        accession={accession}
        procedureName={procedure.parentOrder.concept.display}
        tag={
          <Tag type="red" className={styles.statusTag}>
            {t('finalized', 'FINALIZED')}
          </Tag>
        }
      />

      <div className={styles.reportCard}>
        <ClinicalHistorySection procedure={procedure} />
        <FindingsSection procedure={procedure} />
        {procedure.impressions && <ImpressionBlock impressions={procedure.impressions} />}
        <div className={styles.radiologists}>
          <RadiologistEntry
            label={t('residentRadiologist', 'RESIDENT RADIOLOGIST')}
            name={residentRadiologist}
            timestamp={reportEnteredAt}
          />
          <RadiologistEntry
            label={t('attendingRadiologist', 'ATTENDING RADIOLOGIST')}
            name={attendingRadiologist}
            timestamp={reportApprovedAt}
          />
        </div>
        <ImagingSeriesPanel orderNumber={procedure.parentOrder.orderNumber} />
      </div>
    </div>
  );
};

export default FinalizedReportExpandedContent;
