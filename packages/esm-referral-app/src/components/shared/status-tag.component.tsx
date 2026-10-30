import React from 'react';
import { Tag } from '@carbon/react';
import type { ReferralPriority, ReferralStatus } from '../../api/types';
import { statusTagType } from '../../utils/format';
import { useCodeLabel } from '../../utils/labels';

export const StatusTag: React.FC<{ status: ReferralStatus | null }> = ({ status }) => {
  const label = useCodeLabel();
  return (
    <Tag type={statusTagType(status)} size="sm">
      {label('status', status)}
    </Tag>
  );
};

export const PriorityTag: React.FC<{ priority: ReferralPriority | null }> = ({ priority }) => {
  const label = useCodeLabel();
  if (priority !== 'EMERGENCY') {
    return <span>{label('priority', priority)}</span>;
  }
  return (
    <Tag type="red" size="sm">
      {label('priority', priority)}
    </Tag>
  );
};
