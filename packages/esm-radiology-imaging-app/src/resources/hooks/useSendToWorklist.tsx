import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useConfig, showSnackbar } from '@openmrs/esm-framework';
import { type RadiologyConfig } from '../../config-schema';
import { type RadiologyOrder } from '../../radiology-imaging/types';
import { updateOrderFulfillmentStatus } from './useOrders';
import { createPACSWorkListEntry } from '../pacs.resource';
import { ensureOrderPaymentAllowsWorklist, UnpaidOrderError } from '../cashier.resource';

export function useSendToWorklist(mutate: () => void) {
  const { t } = useTranslation();
  const config = useConfig<RadiologyConfig>();
  const [isSending, setIsSending] = useState(false);

  const sendToWorklist = useCallback(
    async (order: RadiologyOrder) => {
      setIsSending(true);

      try {
        await ensureOrderPaymentAllowsWorklist(order.uuid, config);
      } catch (error) {
        setIsSending(false);
        if (error instanceof UnpaidOrderError) {
          showSnackbar({
            title: t('paymentRequiredBeforeExam', 'Payment required before starting the exam'),
            subtitle: t(
              'paymentRequiredBeforeExamSubtitle',
              'This order cannot be added to the worklist until the bill line item is paid or exempted.',
            ),
            kind: 'error',
            isLowContrast: false,
          });
        } else {
          const errorMessage = error instanceof Error ? error.message : String(error);
          showSnackbar({
            title: t('paymentStatusCheckError', 'Failed to verify payment status'),
            subtitle: t(
              'paymentStatusCheckErrorSubtitle',
              'Could not confirm whether this order has been paid. {{errorMessage}}',
              { errorMessage },
            ),
            kind: 'error',
            isLowContrast: false,
          });
        }
        return;
      }

      const [statusResult, pacsResult] = await Promise.allSettled([
        updateOrderFulfillmentStatus(order.uuid, 'IN_PROGRESS'),
        createPACSWorkListEntry(order, { scheduledStationAETitle: config.scheduledStationAETitle }),
      ]);

      setIsSending(false);

      const statusFailed = statusResult.status === 'rejected';
      const pacsFailed = pacsResult.status === 'rejected';

      if (!statusFailed && !pacsFailed) {
        mutate();
        showSnackbar({
          title: t('transitionToWorkListSuccess', 'Order transitioned to work list'),
          subtitle: t(
            'transitionToWorkListSuccessSubtitle',
            'The order has been successfully transitioned to the work list.',
          ),
          kind: 'success',
          isLowContrast: true,
        });
        return;
      }

      if (statusFailed) {
        const errorMessage =
          statusResult.reason instanceof Error ? statusResult.reason.message : String(statusResult.reason);
        showSnackbar({
          title: t('orderStatusUpdateError', 'Failed to update order status'),
          subtitle: t(
            'orderStatusUpdateErrorSubtitle',
            'Could not mark the order as IN_PROGRESS in OpenMRS. {{errorMessage}}',
            { errorMessage },
          ),
          kind: 'error',
          isLowContrast: false,
        });
      }

      if (pacsFailed) {
        const errorMessage = pacsResult.reason instanceof Error ? pacsResult.reason.message : String(pacsResult.reason);
        showSnackbar({
          title: t('pacsWorklistEntryError', 'Failed to create PACS worklist entry'),
          subtitle: t(
            'pacsWorklistEntryErrorSubtitle',
            'The order was not added to the PACS modality worklist. {{errorMessage}}',
            { errorMessage },
          ),
          kind: 'error',
          isLowContrast: false,
        });
      }

      // Partial success: order status update succeeded but PACS entry failed.
      // Mutate so the UI reflects the status change that did persist.
      if (!statusFailed && pacsFailed) {
        mutate();
      }
    },
    [config, mutate, t],
  );

  return { sendToWorklist, isSending };
}
