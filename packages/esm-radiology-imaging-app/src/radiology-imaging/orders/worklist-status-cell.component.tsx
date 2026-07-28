import React, { useState } from 'react';
import { Button, InlineLoading } from '@carbon/react';
import { Add, CheckmarkFilled } from '@carbon/react/icons';
import { useConfig, showSnackbar } from '@openmrs/esm-framework';
import { useSWRConfig } from 'swr';
import { useTranslation } from 'react-i18next';
import { useWorklistCheck, worklistCheckKey } from '../../resources/hooks/useWorklistCheck';
import { createPACSWorkListEntry } from '../../resources/pacs.resource';
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

  if (isLoading) {
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

  return (
    <Button size="sm" kind="ghost" renderIcon={isAdding ? undefined : Add} onClick={handleAdd} disabled={isAdding}>
      {isAdding ? <InlineLoading description={t('adding', 'Adding...')} /> : t('addToWorklist', 'Add to worklist')}
    </Button>
  );
};

export default WorklistStatusCell;
