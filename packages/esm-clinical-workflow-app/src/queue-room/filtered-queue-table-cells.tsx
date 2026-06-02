import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Tag } from '@carbon/react';
import { ConfigurableLink, ExtensionSlot, useConfig } from '@openmrs/esm-framework';
import type { QueueEntry } from '../types';

const extensionColumnIds = new Set(['serve-patient', 'transfer-status', 'room-assignment', 'actions']);

interface ServiceQueuesTableConfig {
  visitQueueNumberAttributeUuid?: string;
  customPatientChartUrl?: string;
  priorityConfigs?: Array<{ conceptUuid: string; color?: string }>;
  queueTables?: {
    columnDefinitions?: Array<{ id: string; columnType?: string; header?: string }>;
    tableDefinitions?: Array<{ columns: string[] }>;
  };
}

export function useFilteredQueueTableColumnIds() {
  const config = useConfig<ServiceQueuesTableConfig>({
    externalModuleName: '@openmrs/esm-service-queues-app',
  });

  return config.queueTables?.tableDefinitions?.[0]?.columns ?? [];
}

export function getColumnHeader(columnId: string, config: ServiceQueuesTableConfig): string {
  const columnDef = config.queueTables?.columnDefinitions?.find((column) => column.id === columnId);
  return columnDef?.header ?? columnId;
}

export function isExtensionColumn(columnId: string, config: ServiceQueuesTableConfig): boolean {
  const columnDef = config.queueTables?.columnDefinitions?.find((column) => column.id === columnId);
  return columnDef?.columnType === 'extension' || extensionColumnIds.has(columnId);
}

export function getQueueEntrySearchValue(
  queueEntry: QueueEntry,
  columnId: string,
  visitQueueNumberAttributeUuid?: string,
): string {
  switch (columnId) {
    case 'patient-name':
      return queueEntry.patient?.person?.display ?? queueEntry.patient?.display ?? '';
    case 'queue-number':
      return String(
        queueEntry.visit?.attributes?.find(
          (attribute) => attribute?.attributeType?.uuid === visitQueueNumberAttributeUuid,
        )?.value ?? '',
      );
    case 'coming-from':
      return queueEntry.queueComingFrom?.display ?? '';
    case 'priority':
      return queueEntry.priority?.display ?? '';
    case 'status':
      return queueEntry.status?.display ?? '';
    case 'queue':
      return queueEntry.queue?.display ?? '';
    default:
      return '';
  }
}

interface FilteredQueueTableCellProps {
  columnId: string;
  queueEntry: QueueEntry;
}

export const FilteredQueueTableCell: React.FC<FilteredQueueTableCellProps> = ({ columnId, queueEntry }) => {
  const config = useConfig<ServiceQueuesTableConfig>({
    externalModuleName: '@openmrs/esm-service-queues-app',
  });

  if (isExtensionColumn(columnId, config)) {
    return <ExtensionSlot name={`queue-table-${columnId}-slot`} state={{ queueEntry }} />;
  }

  switch (columnId) {
    case 'patient-name':
      return (
        <ConfigurableLink to={config.customPatientChartUrl} templateParams={{ patientUuid: queueEntry.patient.uuid }}>
          {queueEntry.patient?.person?.display ?? queueEntry.patient?.display}
        </ConfigurableLink>
      );
    case 'queue-number': {
      const queueNumber = queueEntry.visit?.attributes?.find(
        (attribute) => attribute?.attributeType?.uuid === config.visitQueueNumberAttributeUuid,
      )?.value;
      return <span>{queueNumber ?? '--'}</span>;
    }
    case 'coming-from':
      return <span>{queueEntry.queueComingFrom?.display ?? '--'}</span>;
    case 'priority': {
      const priorityConfig = config.priorityConfigs?.find(
        (priority) => priority.conceptUuid === queueEntry.priority?.uuid,
      );
      return (
        <Tag type={(priorityConfig?.color as 'red') ?? 'gray'} title={queueEntry.priorityComment ?? undefined}>
          {queueEntry.priority?.display}
        </Tag>
      );
    }
    case 'status':
      return <span>{queueEntry.status?.display ?? '--'}</span>;
    case 'queue':
      return <span>{queueEntry.queue?.display ?? '--'}</span>;
    case 'wait-time':
      return <WaitTimeCell queueEntry={queueEntry} />;
    default:
      return null;
  }
};

function WaitTimeCell({ queueEntry }: { queueEntry: QueueEntry }) {
  const startedAt = dayjs(queueEntry.startedAt).toDate();
  const endedAt = queueEntry.endedAt ? dayjs(queueEntry.endedAt).toDate() : null;
  const [currentTime, setCurrentTime] = useState(dayjs());

  useEffect(() => {
    const handle = setInterval(() => setCurrentTime(dayjs()), 60000);
    return () => clearInterval(handle);
  }, []);

  const endedTime = endedAt ? dayjs(endedAt) : currentTime;
  const totalMinutes = endedTime.diff(startedAt, 'minutes');
  const hours = Math.trunc(totalMinutes / 60);
  const minutes = Math.trunc(totalMinutes % 60);

  if (Math.abs(hours) > 0) {
    return (
      <span>
        {hours} hour(s) and {Math.abs(minutes)} minute(s)
      </span>
    );
  }

  return <span>{minutes} minute(s)</span>;
}
