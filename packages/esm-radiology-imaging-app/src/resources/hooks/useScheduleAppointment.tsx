import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getGlobalStore, launchWorkspace2, showSnackbar } from '@openmrs/esm-framework';
import type { RadiologyOrder } from '../../radiology-imaging/types';
import { inferModalityFromConcept } from '../pacs.resource';
import {
  isRadiologyAppointmentWorkspaceOpen,
  RADIOLOGY_APPOINTMENT_WORKSPACE,
  type Workspace2StoreState,
} from '../../radiology-imaging/workspace/appointment-workspace.utils';

export function useScheduleAppointment(onSuccess?: () => void) {
  const { t } = useTranslation();
  const [isScheduling, setIsScheduling] = useState(false);

  const scheduleAppointment = useCallback(
    async (order: RadiologyOrder) => {
      const modality = inferModalityFromConcept(order.concept.display);
      showSnackbar({
        title: t('scheduleAppointmentHint', 'Select appointment service'),
        subtitle: t('scheduleAppointmentModalityHint', 'Please select the {{modality}} service for this order.', {
          modality,
        }),
        kind: 'info',
        isLowContrast: true,
      });

      const workspace2Store = getGlobalStore<Workspace2StoreState>('workspace2');
      let unsubscribe: (() => void) | undefined;

      const stopTrackingSchedulingState = () => {
        unsubscribe?.();
        unsubscribe = undefined;
        setIsScheduling(false);
      };

      const trackSchedulingState = () => {
        unsubscribe = workspace2Store.subscribe(() => {
          if (!isRadiologyAppointmentWorkspaceOpen(workspace2Store.getState())) {
            stopTrackingSchedulingState();
          }
        });
      };

      setIsScheduling(true);

      try {
        const launched = await launchWorkspace2(RADIOLOGY_APPOINTMENT_WORKSPACE, {
          patientUuid: order.patient.uuid,
          order,
          onScheduled: onSuccess,
        });

        if (!launched) {
          stopTrackingSchedulingState();
          return;
        }

        trackSchedulingState();
      } catch {
        stopTrackingSchedulingState();
      }
    },
    [onSuccess, t],
  );

  return { scheduleAppointment, isScheduling };
}
