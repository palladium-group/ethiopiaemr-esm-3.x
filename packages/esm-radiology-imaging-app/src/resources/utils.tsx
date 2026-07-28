import { type OrderUrgency } from '@openmrs/esm-framework';
import type { TFunction } from 'i18next';

export function getFulfillerStatusLabel(status: string | null, t: TFunction): string {
  if (status === 'EXCEPTION') {
    return t('referredExternally', 'Referred Externally');
  }
  if (status === null) {
    return t('received', 'Received');
  }
  return t(status, status.replaceAll('_', ' '));
}

export function getPriorityTagType(urgency: OrderUrgency) {
  switch (urgency) {
    case 'ROUTINE':
      return 'green';
    case 'STAT':
      return 'red';
    default:
      return 'gray';
  }
}
