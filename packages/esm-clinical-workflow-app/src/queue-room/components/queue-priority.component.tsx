import React from 'react';
import classNames from 'classnames';
import { DefinitionTooltip, Tag } from '@carbon/react';
import type { QueueEntry } from '../../types';
import styles from './queue-priority.scss';

export interface PriorityConfig {
  conceptUuid: string;
  color?: string;
  tagType?: string;
  style?: string | null;
}

interface QueuePriorityProps {
  priority: NonNullable<QueueEntry['priority']>;
  priorityComment?: string;
  priorityConfigs: PriorityConfig[];
}

type CarbonTagType =
  | 'red'
  | 'magenta'
  | 'purple'
  | 'blue'
  | 'teal'
  | 'cyan'
  | 'gray'
  | 'green'
  | 'warm-gray'
  | 'cool-gray'
  | 'high-contrast'
  | 'outline';

function getCarbonTagType(color?: string): CarbonTagType | undefined {
  if (!color || color === 'orange') {
    return undefined;
  }
  return color as CarbonTagType;
}

const QueuePriority: React.FC<QueuePriorityProps> = ({ priority, priorityComment, priorityConfigs }) => {
  const priorityConfig = priorityConfigs.find((config) => config.conceptUuid === priority.uuid);
  const tagColor = priorityConfig?.color ?? priorityConfig?.tagType;
  const isOrange = tagColor === 'orange';

  const tag = (
    <Tag
      role={priorityComment ? 'tooltip' : undefined}
      className={classNames(styles.tag, priorityConfig?.style === 'bold' && styles.bold, isOrange && styles.orange)}
      type={getCarbonTagType(tagColor)}>
      {priority.display}
    </Tag>
  );

  if (priorityComment) {
    return (
      <DefinitionTooltip className={styles.tooltip} align="bottom-left" definition={priorityComment}>
        {tag}
      </DefinitionTooltip>
    );
  }

  return tag;
};

export default QueuePriority;
