import React from 'react';
import { Tag } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { LineItem } from '../types';

/** Order urgencies, most urgent first. */
const urgencyOrder = ['STAT', 'ON_SCHEDULED_DATE', 'ROUTINE'];

const urgencyTagType = (urgency: string) =>
  urgency === 'STAT' ? 'red' : urgency === 'ON_SCHEDULED_DATE' ? 'blue' : 'gray';

/** The distinct order priorities among the given line items, most urgent first. Items without an order are ignored. */
export function distinctPriorities(lineItems: Array<LineItem> = []): Array<string> {
  const distinct = Array.from(new Set(lineItems.map((lineItem) => lineItem?.orderUrgency).filter(Boolean)));
  const rank = (urgency: string) => {
    const index = urgencyOrder.indexOf(urgency);
    return index === -1 ? urgencyOrder.length : index;
  };
  return distinct.sort((a, b) => rank(a) - rank(b));
}

export function usePriorityLabel() {
  const { t } = useTranslation();
  return (urgency: string) => {
    switch (urgency) {
      case 'STAT':
        return t('priorityStat', 'Stat');
      case 'ON_SCHEDULED_DATE':
        return t('priorityScheduled', 'Scheduled');
      case 'ROUTINE':
        return t('priorityRoutine', 'Routine');
      default:
        return urgency;
    }
  };
}

/** A single order priority as a tag, or -- when the line item did not come from an order. */
export function PriorityTag({ urgency }: { urgency?: string }) {
  const priorityLabel = usePriorityLabel();
  if (!urgency) {
    return <>--</>;
  }
  return (
    <Tag size="sm" type={urgencyTagType(urgency)}>
      {priorityLabel(urgency)}
    </Tag>
  );
}

/**
 * The priority of a whole bill: the priority itself when its line items share one, or the number of distinct
 * priorities when they differ.
 */
export function BillPriority({ lineItems }: { lineItems: Array<LineItem> }) {
  const { t } = useTranslation();
  const priorityLabel = usePriorityLabel();
  const priorities = distinctPriorities(lineItems);

  if (priorities.length <= 1) {
    return <PriorityTag urgency={priorities[0]} />;
  }

  return (
    <span title={priorities.map(priorityLabel).join(', ')}>
      {t('prioritiesCount', '{{number}} priorities', { number: priorities.length })}
    </span>
  );
}
