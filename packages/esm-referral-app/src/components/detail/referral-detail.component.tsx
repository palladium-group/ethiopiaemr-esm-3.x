import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, InlineNotification, SkeletonText } from '@carbon/react';
import { ArrowLeft, Edit } from '@carbon/react/icons';
import { useReferral } from '../../api/referral.resource';
import type { ReferralActionRecord, ReferralDetail as Detail } from '../../api/types';
import { formatDateTime } from '../../utils/format';
import { useCodeLabel } from '../../utils/labels';
import { PriorityTag, StatusTag } from '../shared/status-tag.component';
import { availableActions, type ReferralActionKind } from './available-actions';
import ReferralActionModal from './referral-action-modal.component';
import styles from './referral-detail.scss';

const Field: React.FC<{ label: string; value?: React.ReactNode; wide?: boolean }> = ({ label, value, wide }) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return (
    <div className={wide ? styles.fieldWide : styles.field}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
};

const ReferralDetail: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const label = useCodeLabel();
  const { uuid } = useParams();
  const { data, error, isLoading, mutate } = useReferral(uuid);
  const [action, setAction] = useState<ReferralActionKind | null>(null);

  const back = () => navigate(data?.referral?.direction === 'OUTGOING' ? '/outgoing' : '/incoming');

  if (isLoading) {
    return (
      <div className={styles.page}>
        <SkeletonText heading width="40%" />
        <SkeletonText paragraph lineCount={8} />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className={styles.page}>
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          title={t('referralLoadError', 'Could not load this referral.')}
          subtitle={error?.message}
        />
      </div>
    );
  }

  const r: Detail = data.referral;
  const actions = availableActions(r);
  const isIncoming = r.direction === 'INCOMING';
  const undelivered = !isIncoming && r.status === 'REFERRED' && !r.delivered;

  const actionLabel: Record<ReferralActionKind, string> = {
    submit: t('submitToLiaison', 'Submit to liaison'),
    send: t('sendReferral', 'Send referral'),
    cancel: t('cancelReferral', 'Cancel referral'),
    accept: t('acceptReferral', 'Accept referral'),
    reject: t('rejectReferral', 'Reject referral'),
    'refer-back': t('referBack', 'Refer back'),
    feedback: t('sendFeedback', 'Send feedback'),
    're-refer': t('reRefer', 'Re-refer'),
  };
  const buttonKind = (kind: ReferralActionKind, index: number) =>
    kind === 'reject' || kind === 'cancel' ? 'danger--tertiary' : index === 0 ? 'primary' : 'tertiary';

  const vitals = [
    r.bloodPressure && `${t('bp', 'BP')} ${r.bloodPressure}`,
    r.pulseRate != null && `${t('pulse', 'Pulse')} ${r.pulseRate}`,
    r.respiratoryRate != null && `${t('rr', 'RR')} ${r.respiratoryRate}`,
    r.temperature != null && `${t('temp', 'Temp')} ${r.temperature} °C`,
    r.oxygenSaturation != null && `SpO₂ ${r.oxygenSaturation}%`,
  ].filter(Boolean);

  return (
    <div className={styles.page}>
      <Button kind="ghost" size="sm" renderIcon={ArrowLeft} onClick={back} className={styles.back}>
        {isIncoming ? t('incoming', 'Incoming') : t('outgoing', 'Outgoing')}
      </Button>

      <header className={styles.header}>
        <div>
          <div className={styles.tags}>
            <StatusTag status={r.status} />
            <PriorityTag priority={r.priority} />
          </div>
          <h2 className={styles.title}>{r.patientName ?? t('unnamedPatient', 'Unnamed patient')}</h2>
          <p className={styles.route}>
            {r.referringFacilityName ?? r.referringFacilityCode ?? '—'}
            <span className={styles.arrow} aria-hidden>
              →
            </span>
            {r.receivingFacilityName ?? r.receivingFacilityCode ?? t('destinationNotChosen', 'destination not chosen')}
            {r.requestedService && <span className={styles.service}> · {r.requestedService}</span>}
          </p>
        </div>
        <div className={styles.actions}>
          {!isIncoming && r.status === 'DRAFT' && (
            <Button kind="ghost" renderIcon={Edit} onClick={() => navigate(`/${r.uuid}/edit`)}>
              {t('edit', 'Edit')}
            </Button>
          )}
          {actions.map((kind, i) => (
            <Button key={kind} kind={buttonKind(kind, i)} onClick={() => setAction(kind)}>
              {actionLabel[kind]}
            </Button>
          ))}
        </div>
      </header>

      {undelivered && (
        <InlineNotification
          kind="warning"
          lowContrast
          hideCloseButton
          title={t('notYetDelivered', 'Not yet delivered.')}
          subtitle={t(
            'notYetDeliveredHelp',
            'The referral is recorded here. It will show as delivered once the receiving facility collects it.',
          )}
        />
      )}

      <div className={styles.body}>
        <div className={styles.main}>
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{t('patient', 'Patient')}</h3>
            <dl className={styles.grid}>
              <Field label={t('mrn', 'MRN')} value={r.patientMrn} />
              <Field label={t('healthId', 'Health ID')} value={r.patientHealthId} />
              <Field label={t('sex', 'Sex')} value={r.patientGender} />
              <Field label={t('birthdate', 'Birthdate')} value={r.patientBirthdate?.slice(0, 10)} />
              <Field label={t('patientType', 'Patient type')} value={label('patientType', r.patientType)} />
              <Field label={t('phone', 'Phone')} value={r.patientPhone} />
              <Field
                label={t('address', 'Address')}
                value={[r.patientWoreda, r.patientZone, r.patientRegion].filter(Boolean).join(', ')}
              />
            </dl>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{t('clinical', 'Clinical')}</h3>
            <dl className={styles.grid}>
              <Field label={t('vitals', 'Vitals')} value={vitals.join(' · ')} wide />
              <Field label={t('chiefComplaints', 'Chief complaints')} value={r.chiefComplaints} wide />
              <Field label={t('diagnosis', 'Diagnosis')} value={r.diagnosis} wide />
              <Field label={t('reasonForReferral', 'Reason for referral')} value={r.reasonForReferral} wide />
              <Field label={t('historyOfIllness', 'History of illness')} value={r.historyOfIllness} wide />
              <Field label={t('physicalExamination', 'Physical examination')} value={r.physicalExamination} wide />
              <Field label={t('investigations', 'Investigations')} value={r.investigationSummary} wide />
              <Field label={t('treatmentGiven', 'Treatment given')} value={r.treatmentGiven} wide />
              <Field label={t('bloodGroup', 'Blood group')} value={r.bloodGroup} />
              <Field label={t('transfusionNeeded', 'Transfusion needed')} value={r.transfusionNeeded} />
            </dl>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{t('referralDetails', 'Referral details')}</h3>
            <dl className={styles.grid}>
              <Field label={t('referralType', 'Referral type')} value={label('type', r.referralType)} />
              <Field label={t('department', 'Department')} value={r.department} />
              <Field
                label={t('referringPhysician', 'Referring physician')}
                value={[r.physicianName, r.physicianPhone].filter(Boolean).join(' · ')}
              />
              <Field label={t('escort', 'Escort')} value={[r.escortName, r.escortPhone].filter(Boolean).join(' · ')} />
              <Field label={t('created', 'Created')} value={formatDateTime(r.dateCreated)} />
              <Field label={t('sent', 'Sent')} value={r.submittedDate && formatDateTime(r.submittedDate)} />
              <Field label={t('responded', 'Responded')} value={r.respondedDate && formatDateTime(r.respondedDate)} />
            </dl>
          </section>
        </div>

        <aside className={styles.timeline} aria-label={t('history', 'History')}>
          <h3 className={styles.sectionTitle}>{t('history', 'History')}</h3>
          {data.actions.length === 0 ? (
            <p className={styles.muted}>{t('noActionsYet', 'No actions yet.')}</p>
          ) : (
            <ol className={styles.events}>
              {data.actions.map((a) => (
                <TimelineEvent key={a.uuid} action={a} />
              ))}
            </ol>
          )}
        </aside>
      </div>

      {action && (
        <ReferralActionModal
          kind={action}
          referral={r}
          onClose={() => setAction(null)}
          onDone={(response) => {
            setAction(null);
            // Re-referring answers with the new onward referral, which is the one to work next.
            if (action === 're-refer' && response?.referral?.uuid && response.referral.uuid !== r.uuid) {
              navigate(`/${response.referral.uuid}`);
            } else {
              mutate();
            }
          }}
        />
      )}
    </div>
  );
};

const TimelineEvent: React.FC<{ action: ReferralActionRecord }> = ({ action: a }) => {
  const { t } = useTranslation();
  const label = useCodeLabel();
  const details: Array<[string, string | null]> = [
    [t('reason', 'Reason'), a.reasonCode ? label('reason', a.reasonCode) : null],
    [t('onwardFacility', 'Onward facility'), a.onwardFacilityName ?? a.onwardFacilityCode],
    [
      t('conditionAtHandover', 'Condition at handover'),
      a.conditionAtHandover ? label('condition', a.conditionAtHandover) : null,
    ],
    [t('receivingDepartment', 'Receiving department'), a.receivingDepartment],
    [t('arrivalDate', 'Arrival date and time'), a.arrivalDate ? formatDateTime(a.arrivalDate) : null],
    [t('handoverSummary', 'Handover summary'), a.handoverSummary],
    [t('finalDiagnosis', 'Final diagnosis'), a.feedbackDiagnosis],
    [t('treatmentSummary', 'Treatment summary'), a.treatmentSummary],
    [t('proceduresDone', 'Procedures / treatment given'), a.feedbackTreatmentGiven],
    [t('medicationPlan', 'Medication plan'), a.medicationPlan],
    [t('followUp', 'Follow-up'), a.followUpInstruction],
  ];
  return (
    <li className={styles.event}>
      <div className={styles.eventHead}>
        <span className={styles.eventTitle}>{label('action', a.actionType)}</span>
        <span className={styles.muted}>{formatDateTime(a.dateCreated)}</span>
      </div>
      <span className={styles.muted}>
        {[a.actor, a.statusAfter && label('status', a.statusAfter)].filter(Boolean).join(' · ')}
      </span>
      {details
        .filter(([, value]) => value)
        .map(([k, value]) => (
          <p key={k} className={styles.eventDetail}>
            <strong>{k}:</strong> {value}
          </p>
        ))}
      {a.comment && <p className={styles.eventComment}>{a.comment}</p>}
    </li>
  );
};

export default ReferralDetail;
