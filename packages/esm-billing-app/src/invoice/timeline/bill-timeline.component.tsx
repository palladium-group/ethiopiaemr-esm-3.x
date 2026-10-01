import React from 'react';
import { InlineLoading, Tag } from '@carbon/react';
import { formatDate, formatTime } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { useCurrencyFormatting } from '../../helpers/currency';
import { MappedBill } from '../../types';
import { groupEventsByDay, TimelineEvent, TimelineEventKind, useBillTimeline } from './bill-timeline.resource';
import styles from './bill-timeline.scss';

const kindClass: Record<TimelineEventKind, string> = {
  opened: styles.opened,
  itemAdded: styles.itemAdded,
  payment: styles.payment,
  closed: styles.closed,
};

export const paymentStatusTagType = (status?: string) => {
  switch (status) {
    case 'PAID':
      return 'green';
    case 'PENDING':
      return 'red';
    case 'EXEMPTED':
      return 'purple';
    default:
      return 'gray';
  }
};

type BillTimelineProps = {
  bill: MappedBill;
};

const BillTimeline: React.FC<BillTimelineProps> = ({ bill }) => {
  const { t } = useTranslation();
  const { format: formatCurrency } = useCurrencyFormatting();
  const { events, isLoading, error } = useBillTimeline(bill);

  const titleOf = (event: TimelineEvent) => {
    switch (event.kind) {
      case 'opened':
        return t('billOpened', 'Bill opened');
      case 'itemAdded':
        return event.name || t('itemAdded', 'Item added');
      case 'payment':
        return t('paymentReceived', 'Payment received');
      case 'closed':
        return t('billClosed', 'Bill closed');
    }
  };

  const detailOf = (event: TimelineEvent) => {
    if (event.kind === 'itemAdded') {
      return `${t('itemAdded', 'Item added')} · ${event.quantity} × ${formatCurrency(event.price)}`;
    }
    return event.detail;
  };

  if (isLoading) {
    return <InlineLoading description={t('loadingTimeline', 'Loading timeline...')} />;
  }

  if (error) {
    return <p className={styles.message}>{t('timelineError', 'Could not load the timeline')}</p>;
  }

  if (!events.length) {
    return <p className={styles.message}>{t('noTimelineEvents', 'Nothing has happened on this bill yet')}</p>;
  }

  return (
    <div className={styles.timeline}>
      {groupEventsByDay(events).map((group) => (
        <section key={group.day}>
          <h6 className={styles.day}>{formatDate(group.date, { time: false })}</h6>
          <ol className={styles.events}>
            {group.events.map((event) => {
              const detail = detailOf(event);
              return (
                <li key={event.id} className={`${styles.event} ${kindClass[event.kind]}`}>
                  <span className={styles.dot} />
                  <div className={styles.row}>
                    <span className={styles.title}>{titleOf(event)}</span>
                    {event.amount !== undefined && (
                      <span className={styles.amount}>{formatCurrency(event.amount)}</span>
                    )}
                  </div>
                  <div className={styles.meta}>
                    <span>{formatTime(event.date)}</span>
                    {detail && <span>· {detail}</span>}
                    {event.status && (
                      <Tag size="sm" type={paymentStatusTagType(event.status)}>
                        {event.status}
                      </Tag>
                    )}
                  </div>
                  {event.actor && (
                    <div className={styles.actor}>{t('byActor', 'by {{actor}}', { actor: event.actor })}</div>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
};

export default BillTimeline;
