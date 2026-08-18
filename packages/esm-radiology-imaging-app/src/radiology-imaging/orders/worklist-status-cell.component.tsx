import React, { useState } from 'react';
import { Button, InlineLoading } from '@carbon/react';
import { Add, CheckmarkFilled } from '@carbon/react/icons';
import { useConfig, showSnackbar } from '@openmrs/esm-framework';
import { useSWRConfig } from 'swr';
import { useTranslation } from 'react-i18next';
import { useWorklistCheck, worklistCheckKey } from '../../resources/hooks/useWorklistCheck';
import { useOrderPaymentStatus } from '../../resources/hooks/useOrderPaymentStatus';
import { createPACSWorkListEntry } from '../../resources/pacs.resource';
import { ensureOrderPaymentAllowsWorklist, UnpaidOrderError } from '../../resources/cashier.resource';
import type { RadiologyOrder } from '../types';
import type { RadiologyConfig } from '../../config-schema';

type WorklistStatusCellProps = {
  order: RadiologyOrder;
};

const WorklistStatusCell: React.FC<WorklistStatusCellProps> = ({ order }) => {
  const { t } = useTranslation();
  const config = useConfig<RadiologyConfig>();
  const { mutate } = useSWRConfig();
  const [isAdding, setIsAdding] = useState(false);
  const { data, isLoading } = useWorklistCheck(order.orderNumber);
  const {
    isLoading: isPaymentLoading,
    error: paymentStatusError,
    canCreateWorklist,
    isUnpaid,
    hasPaymentStatusError,
  } = useOrderPaymentStatus(order.uuid);

  if (isLoading || isPaymentLoading) {
    return <InlineLoading />;
  }

  if (data?.exists) {
    return (
      <CheckmarkFilled
        size={20}
        style={{ fill: 'var(--cds-support-success, #24a148)' }}
        aria-label={t('worklistPresent', 'Worklist entry present')}
      />
    );
  }

  const handleAdd = async () => {
    setIsAdding(true);
    try {
      await ensureOrderPaymentAllowsWorklist(order.uuid, config);
    } catch (error) {
      setIsAdding(false);
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

    try {
      await createPACSWorkListEntry(order, config);
      await mutate(worklistCheckKey(order.orderNumber));
      showSnackbar({ title: t('worklistCreated', 'Added to worklist'), kind: 'success', isLowContrast: true });
    } catch {
      showSnackbar({
        title: t('worklistCreateFailed', 'Failed to add to worklist'),
        kind: 'error',
        isLowContrast: false,
      });
    } finally {
      setIsAdding(false);
    }
  };

  const paymentErrorMessage =
    paymentStatusError instanceof Error ? paymentStatusError.message : String(paymentStatusError ?? '');

  return (
    <Button
      size="sm"
      kind="ghost"
      renderIcon={isAdding || !canCreateWorklist ? undefined : Add}
      onClick={handleAdd}
      disabled={isAdding || !canCreateWorklist}
      title={hasPaymentStatusError ? paymentErrorMessage : undefined}>
      {isAdding ? (
        <InlineLoading description={t('adding', 'Adding...')} />
      ) : hasPaymentStatusError ? (
        t('paymentStatusUnavailable', 'Unable to verify payment')
      ) : isUnpaid ? (
        t('unpaidBill', 'Unpaid')
      ) : (
        t('addToWorklist', 'Add to worklist')
      )}
    </Button>
  );
};

export default WorklistStatusCell;
