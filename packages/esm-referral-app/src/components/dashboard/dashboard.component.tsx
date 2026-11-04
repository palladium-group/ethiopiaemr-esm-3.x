import React from 'react';
import { useTranslation } from 'react-i18next';
import { InlineNotification, SkeletonText } from '@carbon/react';
import { useReferralDashboard } from '../../api/referral.resource';
import type { ReferralStatus } from '../../api/types';
import { statusTagType } from '../../utils/format';
import { useCodeLabel } from '../../utils/labels';
import styles from './dashboard.scss';

const sum = (counts: Record<string, number>, keys: Array<ReferralStatus>) =>
  keys.reduce((acc, k) => acc + (counts[k] ?? 0), 0);

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const label = useCodeLabel();
  const { dashboard, error, isLoading } = useReferralDashboard();

  if (isLoading) {
    return <SkeletonText paragraph lineCount={6} />;
  }
  if (error || !dashboard) {
    return (
      <InlineNotification
        kind="error"
        lowContrast
        hideCloseButton
        title={t('dashboardLoadError', 'Could not load the dashboard.')}
        subtitle={error?.message}
      />
    );
  }

  const { incoming, outgoing, rejectionReasons, averageResponseTimeHours } = dashboard;
  const total = (c: Record<string, number>) => Object.values(c).reduce((a, b) => a + b, 0);
  const incomingTotal = total(incoming);
  const accepted = sum(incoming, ['ACCEPTED', 'REFERRED_BACK', 'FEEDBACK_SENT', 'COMPLETED', 'RE_REFERRED']);
  const rejected = incoming['REJECTED'] ?? 0;
  const decided = accepted + rejected;
  const reasons = Object.entries(rejectionReasons ?? {}).sort((a, b) => b[1] - a[1]);
  const maxReason = reasons[0]?.[1] ?? 0;

  const headline = [
    {
      label: t('awaitingResponse', 'Awaiting your response'),
      value: (incoming['REFERRED'] ?? 0).toLocaleString(),
    },
    {
      label: t('awaitingLiaison', 'Awaiting liaison'),
      value: sum(outgoing, ['DRAFT', 'PENDING_LIAISON']).toLocaleString(),
    },
    {
      label: t('acceptanceRate', 'Acceptance rate'),
      value: decided ? `${Math.round((accepted / decided) * 100)}%` : '—',
    },
    {
      label: t('avgResponseTime', 'Average response time'),
      value:
        averageResponseTimeHours == null
          ? '—'
          : averageResponseTimeHours < 1
          ? t('minutes', '{{count}} min', { count: Math.round(averageResponseTimeHours * 60) })
          : t('hours', '{{count}} h', { count: Math.round(averageResponseTimeHours * 10) / 10 }),
    },
  ];

  const breakdown = (title: string, counts: Record<string, number>) => {
    const max = Math.max(1, ...Object.values(counts));
    const rows = Object.entries(counts).filter(([, n]) => n > 0);
    return (
      <section className={styles.panel}>
        <h3 className={styles.panelTitle}>
          {title} <span className={styles.panelTotal}>{total(counts).toLocaleString()}</span>
        </h3>
        {rows.length === 0 ? (
          <p className={styles.muted}>{t('noReferralsYet', 'No referrals yet.')}</p>
        ) : (
          <ul className={styles.bars}>
            {rows.map(([status, n]) => (
              <li key={status} className={styles.bar}>
                <span className={styles.barLabel}>{label('status', status)}</span>
                <span className={styles.barTrack}>
                  <span
                    className={`${styles.barFill} ${styles[`tone-${statusTagType(status as ReferralStatus)}`] ?? ''}`}
                    style={{ width: `${(n / max) * 100}%` }}
                  />
                </span>
                <span className={styles.barValue}>{n.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  };

  return (
    <div className={styles.dashboard}>
      <dl className={styles.headline}>
        {headline.map((h) => (
          <div key={h.label} className={styles.metric}>
            <dt>{h.label}</dt>
            <dd>{h.value}</dd>
          </div>
        ))}
      </dl>

      <div className={styles.panels}>
        {breakdown(t('incomingReferrals', 'Incoming referrals'), incoming)}
        {breakdown(t('outgoingReferrals', 'Outgoing referrals'), outgoing)}
        <section className={styles.panel}>
          <h3 className={styles.panelTitle}>
            {t('rejectionReasons', 'Why referrals were rejected')}{' '}
            <span className={styles.panelTotal}>{incomingTotal ? rejected.toLocaleString() : ''}</span>
          </h3>
          {reasons.length === 0 ? (
            <p className={styles.muted}>{t('noRejections', 'No rejections recorded.')}</p>
          ) : (
            <ul className={styles.bars}>
              {reasons.map(([reason, n]) => (
                <li key={reason} className={styles.bar}>
                  <span className={styles.barLabel}>{label('reason', reason)}</span>
                  <span className={styles.barTrack}>
                    <span
                      className={`${styles.barFill} ${styles['tone-red']}`}
                      style={{ width: `${(n / maxReason) * 100}%` }}
                    />
                  </span>
                  <span className={styles.barValue}>{n.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
