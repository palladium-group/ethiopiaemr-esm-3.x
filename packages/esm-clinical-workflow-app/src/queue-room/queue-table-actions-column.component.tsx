import React, { useMemo } from 'react';
import { Button, OverflowMenu, OverflowMenuItem } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { isDesktop, showModal, showSnackbar, useConfig, useLayoutType } from '@openmrs/esm-framework';
import type { QueueEntry } from '../types';
import { useMutateServiceQueueEntries } from './service-queue-entries.resource';
import { serveQueueEntry } from './service-queues-api.resource';
import QueueTableRoomActionMenu from './queue-table-room-action-menu.extension';
import styles from './queue-table-actions-column.scss';

interface ServiceQueuesActionConfig {
  concepts: {
    defaultStatusConceptUuid: string;
  };
  visitQueueNumberAttributeUuid: string;
}

type QueueEntryAction = 'move' | 'call' | 'edit' | 'transition' | 'remove' | 'delete' | 'undo';

const ACTION_BUTTONS: QueueEntryAction[] = ['call'];
const ACTION_OVERFLOW_MENU: QueueEntryAction[] = ['move', 'transition', 'edit', 'remove', 'undo'];

type ActionProps = {
  label: string;
  text: string;
  onClick: (queueEntry: QueueEntry) => void;
  showIf?: (queueEntry: QueueEntry) => boolean;
  isDelete?: boolean;
};

function useActionPropsByKey() {
  const { t } = useTranslation();
  const {
    concepts: { defaultStatusConceptUuid },
    visitQueueNumberAttributeUuid,
  } = useConfig<ServiceQueuesActionConfig>({ externalModuleName: '@openmrs/esm-service-queues-app' });
  const { mutateQueueEntries } = useMutateServiceQueueEntries();

  const actionPropsByKey: Record<QueueEntryAction, ActionProps> = useMemo(() => {
    const openModal = (modalName: string, queueEntry: QueueEntry) => {
      const dispose = showModal(modalName, {
        closeModal: () => dispose(),
        queueEntry,
        size: 'sm',
      });
    };

    return {
      call: {
        label: 'call',
        text: 'Call',
        onClick: async (queueEntry: QueueEntry) => {
          const visitQueueNumber =
            (queueEntry.visit?.attributes?.find(
              (attribute) => attribute?.attributeType?.uuid === visitQueueNumberAttributeUuid,
            )?.value as string | undefined) ?? '';
          const response = await serveQueueEntry(queueEntry.queue?.name ?? '', visitQueueNumber, 'calling');
          if (!response.ok) {
            showSnackbar({
              title: t('queueEntryUpdateFailed', 'Error updating queue entry'),
              kind: 'error',
              isLowContrast: false,
              subtitle: response.statusText,
            });
            return;
          }
          await mutateQueueEntries();
          openModal('call-queue-entry-modal', queueEntry);
        },
        showIf: (queueEntry: QueueEntry) => queueEntry.status?.uuid === defaultStatusConceptUuid,
      },
      move: {
        label: 'move',
        text: 'Move',
        onClick: (queueEntry: QueueEntry) => {
          openModal('move-queue-entry-modal', queueEntry);
        },
      },
      transition: {
        label: 'transition',
        text: 'Transition',
        onClick: (queueEntry: QueueEntry) => {
          openModal('transition-queue-entry-modal', queueEntry);
        },
      },
      edit: {
        label: 'edit',
        text: 'Edit',
        onClick: (queueEntry: QueueEntry) => {
          openModal('edit-queue-entry-modal', queueEntry);
        },
      },
      remove: {
        label: 'removePatient',
        text: 'Remove patient',
        onClick: (queueEntry: QueueEntry) => {
          openModal('remove-queue-entry-modal', queueEntry);
        },
      },
      delete: {
        label: 'deleteEntry',
        text: 'Delete entry',
        onClick: (queueEntry: QueueEntry) => {
          openModal('delete-queue-entry-modal', queueEntry);
        },
        isDelete: true,
        showIf: (queueEntry: QueueEntry) => !queueEntry.previousQueueEntry,
      },
      undo: {
        label: 'undoTransition',
        text: 'Undo transition',
        onClick: (queueEntry: QueueEntry) => {
          openModal('undo-transition-queue-entry-modal', queueEntry);
        },
        isDelete: true,
        showIf: (queueEntry: QueueEntry) => !!queueEntry.previousQueueEntry,
      },
    };
  }, [defaultStatusConceptUuid, mutateQueueEntries, t, visitQueueNumberAttributeUuid]);

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
      onClick={(event) => {
        event.stopPropagation();
        actionProps.onClick(queueEntry);
      }}
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
      onClick={(event) => {
        event.stopPropagation();
        actionProps.onClick(queueEntry);
      }}
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

  const [buttonComponents, overflowMenuComponents] = useMemo(() => {
    const declaredButtonComponents = ACTION_BUTTONS.map((actionKey) => {
      const actionProps = actionPropsByKey[actionKey];
      if (!actionProps) {
        return null;
      }
      if (actionProps.showIf && !actionProps.showIf(queueEntry)) {
        return null;
      }
      return <ActionButton key={actionKey} actionKey={actionKey} queueEntry={queueEntry} />;
    }).filter(Boolean);

    let fallbackActionComponent: React.ReactNode | null = null;
    let overflowMenuKeys: QueueEntryAction[] = [];

    if (declaredButtonComponents.length === 0) {
      const defaultAction = ACTION_OVERFLOW_MENU.find((actionKey) => {
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
        overflowMenuKeys = ACTION_OVERFLOW_MENU.filter((actionKey) => actionKey !== defaultAction);
      } else {
        overflowMenuKeys = ACTION_OVERFLOW_MENU;
      }
    } else {
      overflowMenuKeys = ACTION_OVERFLOW_MENU;
    }

    const overflowItems = overflowMenuKeys.map((actionKey) => (
      <ActionOverflowMenuItem key={actionKey} actionKey={actionKey} queueEntry={queueEntry} />
    ));

    return [[...declaredButtonComponents, fallbackActionComponent], overflowItems];
  }, [queueEntry, actionPropsByKey]);

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
