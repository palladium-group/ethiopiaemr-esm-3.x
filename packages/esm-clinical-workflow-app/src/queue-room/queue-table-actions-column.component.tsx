import React, { useMemo } from 'react';
import { Button, OverflowMenu, OverflowMenuItem } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { isDesktop, showModal, useConfig, useLayoutType } from '@openmrs/esm-framework';
import { useMutateQueueEntries } from './queue-entries.resource';
import { mapVisitQueueEntryProperties, serveQueueEntry } from './service-queues-api.resource';

interface ServiceQueuesActionConfig {
  concepts: {
    defaultStatusConceptUuid: string;
  };
  visitQueueNumberAttributeUuid: string;
  queueTables?: {
    columnDefinitions?: Array<{
      id: string;
      config?: {
        actions?: {
          buttons?: string[];
          overflowMenu?: string[];
        };
      };
    }>;
  };
}
import type { QueueEntry } from '../types';
import QueueTableRoomActionMenu from './queue-table-room-action-menu.extension';
import styles from './queue-table-actions-column.scss';

type QueueEntryAction = 'move' | 'call' | 'edit' | 'transition' | 'remove' | 'delete' | 'undo';

type ActionProps = {
  label: string;
  text: string;
  onClick: (queueEntry: QueueEntry) => void;
  showIf?: (queueEntry: QueueEntry) => boolean;
  isDelete?: boolean;
};

function useActionPropsByKey() {
  const {
    concepts: { defaultStatusConceptUuid },
    visitQueueNumberAttributeUuid,
  } = useConfig<ServiceQueuesActionConfig>({ externalModuleName: '@openmrs/esm-service-queues-app' });
  const { mutateQueueEntries } = useMutateQueueEntries();

  const actionPropsByKey: Record<QueueEntryAction, ActionProps> = useMemo(() => {
    return {
      call: {
        label: 'call',
        text: 'Call',
        onClick: async (queueEntry: QueueEntry) => {
          const mappedQueueEntry = mapVisitQueueEntryProperties(
            queueEntry as Parameters<typeof mapVisitQueueEntryProperties>[0],
            visitQueueNumberAttributeUuid,
          );
          const callingQueueResponse = await serveQueueEntry(
            mappedQueueEntry.queue.name,
            mappedQueueEntry.visitQueueNumber,
            'calling',
          );
          if (callingQueueResponse.ok) {
            await mutateQueueEntries();
            const dispose = showModal('call-queue-entry-modal', {
              closeModal: () => dispose(),
              queueEntry,
              size: 'sm',
            });
          }
        },
        showIf: (queueEntry: QueueEntry) => queueEntry.status?.uuid === defaultStatusConceptUuid,
      },
      move: {
        label: 'move',
        text: 'Move',
        onClick: (queueEntry: QueueEntry) => {
          const dispose = showModal('move-queue-entry-modal', {
            closeModal: () => dispose(),
            queueEntry,
            size: 'sm',
          });
        },
      },
      transition: {
        label: 'transition',
        text: 'Transition',
        onClick: (queueEntry: QueueEntry) => {
          const dispose = showModal('transition-queue-entry-modal', {
            closeModal: () => dispose(),
            queueEntry,
            size: 'sm',
          });
        },
      },
      edit: {
        label: 'edit',
        text: 'Edit',
        onClick: (queueEntry: QueueEntry) => {
          const dispose = showModal('edit-queue-entry-modal', {
            closeModal: () => dispose(),
            queueEntry,
            size: 'sm',
          });
        },
      },
      remove: {
        label: 'removePatient',
        text: 'Remove patient',
        onClick: (queueEntry: QueueEntry) => {
          const dispose = showModal('remove-queue-entry-modal', {
            closeModal: () => dispose(),
            queueEntry,
            size: 'sm',
          });
        },
      },
      delete: {
        label: 'deleteEntry',
        text: 'Delete entry',
        onClick: (queueEntry: QueueEntry) => {
          const dispose = showModal('delete-queue-entry-modal', {
            closeModal: () => dispose(),
            queueEntry,
            size: 'sm',
          });
        },
        isDelete: true,
        showIf: (queueEntry: QueueEntry) => !queueEntry.previousQueueEntry,
      },
      undo: {
        label: 'undoTransition',
        text: 'Undo transition',
        onClick: (queueEntry: QueueEntry) => {
          const dispose = showModal('undo-transition-queue-entry-modal', {
            closeModal: () => dispose(),
            queueEntry,
            size: 'sm',
          });
        },
        isDelete: true,
        showIf: (queueEntry: QueueEntry) => !!queueEntry.previousQueueEntry,
      },
    };
  }, [defaultStatusConceptUuid, visitQueueNumberAttributeUuid, mutateQueueEntries]);

  return actionPropsByKey;
}

function ActionButton({ actionKey, queueEntry }: { actionKey: QueueEntryAction; queueEntry: QueueEntry }) {
  const { t } = useTranslation();
  const layout = useLayoutType();
  const actionPropsByKey = useActionPropsByKey();
  const actionProps = actionPropsByKey[actionKey];

  if (!actionProps || (actionProps.showIf && !actionProps.showIf(queueEntry))) {
    return null;
  }

  return (
    <Button
      kind="ghost"
      aria-label={t(actionProps.label, actionProps.text)}
      onClick={() => actionProps.onClick(queueEntry)}
      size={isDesktop(layout) ? 'sm' : 'lg'}>
      {t(actionProps.label, actionProps.text)}
    </Button>
  );
}

function ActionOverflowMenuItem({ actionKey, queueEntry }: { actionKey: QueueEntryAction; queueEntry: QueueEntry }) {
  const { t } = useTranslation();
  const actionPropsByKey = useActionPropsByKey();
  const actionProps = actionPropsByKey[actionKey];

  if (!actionProps || (actionProps.showIf && !actionProps.showIf(queueEntry))) {
    return null;
  }

  return (
    <OverflowMenuItem
      className={styles.menuItem}
      aria-label={t(actionProps.label, actionProps.text)}
      hasDivider
      isDelete={actionProps.isDelete}
      onClick={() => actionProps.onClick(queueEntry)}
      itemText={t(actionProps.label, actionProps.text)}
    />
  );
}

interface QueueTableActionsColumnProps {
  queueEntry: QueueEntry;
}

/**
 * Replaces the built-in actions column to add room assign/transfer items in the row overflow menu.
 */
const QueueTableActionsColumn: React.FC<QueueTableActionsColumnProps> = ({ queueEntry }) => {
  const layout = useLayoutType();
  const actionPropsByKey = useActionPropsByKey();
  const buttons: QueueEntryAction[] = ['call'];
  const overflowMenu: QueueEntryAction[] = ['move', 'transition', 'edit', 'remove', 'undo'];

  const [buttonComponents, overflowMenuComponents] = useMemo(() => {
    const declaredButtonComponents = buttons
      .map((actionKey) => {
        const actionProps = actionPropsByKey[actionKey];
        if (!actionProps) {
          return null;
        }
        if (actionProps.showIf && !actionProps.showIf(queueEntry)) {
          return null;
        }
        return <ActionButton key={actionKey} actionKey={actionKey} queueEntry={queueEntry} />;
      })
      .filter(Boolean);

    let fallbackActionComponent: React.ReactNode | null = null;
    let overflowMenuKeys: QueueEntryAction[] = [];

    if (declaredButtonComponents.length === 0) {
      const defaultAction = overflowMenu.find((actionKey) => {
        const showIf = actionPropsByKey[actionKey]?.showIf;
        if (!showIf) {
          return true;
        }
        return showIf(queueEntry);
      });
      if (defaultAction) {
        fallbackActionComponent = (
          <ActionButton key={defaultAction} actionKey={defaultAction} queueEntry={queueEntry} />
        );
        overflowMenuKeys = overflowMenu.filter((actionKey) => actionKey !== defaultAction);
      } else {
        overflowMenuKeys = overflowMenu;
      }
    } else {
      overflowMenuKeys = overflowMenu;
    }

    const overflowItems = overflowMenuKeys.map((actionKey) => (
      <ActionOverflowMenuItem key={actionKey} actionKey={actionKey} queueEntry={queueEntry} />
    ));

    return [[...declaredButtonComponents, fallbackActionComponent], overflowItems];
  }, [buttons, overflowMenu, queueEntry, actionPropsByKey]);

  return (
    <div className={styles.actionsCell}>
      {buttonComponents}
      <OverflowMenu aria-label="Actions menu" size={isDesktop(layout) ? 'sm' : 'lg'} align="left" flipped>
        {overflowMenuComponents}
        <QueueTableRoomActionMenu queueEntry={queueEntry} />
      </OverflowMenu>
    </div>
  );
};

export default QueueTableActionsColumn;
