import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Parcel from 'single-spa-react/parcel';
import { mountRootParcel, type ParcelConfig } from 'single-spa';
import { InlineLoading } from '@carbon/react';
import {
  getCoreTranslation,
  getGlobalStore,
  showSnackbar,
  type Workspace2DefinitionProps,
} from '@openmrs/esm-framework';
import { loadLifeCycles } from '@openmrs/esm-routes';
import { mutate as globalMutate } from 'swr';
import type { RadiologyOrder } from '../types';
import { fetchPatientAppointments, findAppointmentForOrder } from '../../resources/appointment-scheduling.resource';
import { reviseOrderScheduledDate } from '../../resources/order-scheduling.resource';
import { installAppointmentSaveInterceptor } from './appointment-save-interceptor';
import { isRadiologyAppointmentWorkspaceOpen, type Workspace2StoreState } from './appointment-workspace.utils';

const APPOINTMENTS_APP_MODULE = '@openmrs/esm-appointments-app';
const APPOINTMENTS_FORM_COMPONENT = 'appointmentsFormWorkspace';

interface RadiologyAppointmentWorkspaceProps {
  patientUuid: string;
  order: RadiologyOrder;
  onScheduled?: () => void;
}

/**
 * Thin wrapper around the community appointments form workspace. The form is embedded
 * via single-spa Parcel so it renders in-place (child workspaces left a blank shell).
 */
const RadiologyAppointmentWorkspace: React.FC<
  Workspace2DefinitionProps<RadiologyAppointmentWorkspaceProps, object, object>
> = (definitionProps) => {
  const { t } = useTranslation();
  const {
    workspaceProps,
    closeWorkspace,
    launchChildWorkspace,
    workspaceName,
    windowName,
    windowProps,
    groupProps,
    isRootWorkspace,
  } = definitionProps;
  const { patientUuid, order, onScheduled } = workspaceProps ?? {};
  const [lifeCycle, setLifeCycle] = useState<ParcelConfig | undefined>();
  const revisedRef = useRef(false);
  const notifiedRef = useRef(false);
  const reviseInFlightRef = useRef<Promise<void> | null>(null);
  const finalizeInFlightRef = useRef(false);
  const launchTimestampRef = useRef(Date.now());
  const appointmentsBeforeRef = useRef<Awaited<ReturnType<typeof fetchPatientAppointments>>>([]);
  const orderRef = useRef(order);
  const onScheduledRef = useRef(onScheduled);

  orderRef.current = order;
  onScheduledRef.current = onScheduled;

  const notifySyncComplete = useCallback(async () => {
    if (notifiedRef.current || !revisedRef.current) {
      return;
    }
    notifiedRef.current = true;

    await globalMutate((key) => typeof key === 'string' && key.includes('/order'));

    showSnackbar({
      title: t('appointmentScheduledSuccess', 'Appointment scheduled'),
      subtitle: t('appointmentScheduledSuccessSubtitle', 'The order scheduled date has been updated.'),
      kind: 'success',
      isLowContrast: true,
    });
    onScheduledRef.current?.();
  }, [t]);

  const performRevise = useCallback(async (startDateTime: string | number) => {
    const currentOrder = orderRef.current;
    if (revisedRef.current || !currentOrder) {
      return;
    }
    await reviseOrderScheduledDate(currentOrder, startDateTime);
    revisedRef.current = true;
  }, []);

  const handleReviseError = useCallback(
    (error: unknown) => {
      revisedRef.current = false;
      const errorMessage = error instanceof Error ? error.message : String(error);
      showSnackbar({
        title: t('appointmentScheduleError', 'Failed to sync scheduled date'),
        subtitle: t('appointmentScheduleErrorSubtitle', 'Could not update the order scheduled date. {{errorMessage}}', {
          errorMessage,
        }),
        kind: 'error',
        isLowContrast: false,
      });
    },
    [t],
  );

  const startRevise = useCallback(
    (startDateTime: string | number) => {
      if (revisedRef.current) {
        return reviseInFlightRef.current ?? Promise.resolve();
      }
      if (!reviseInFlightRef.current) {
        reviseInFlightRef.current = performRevise(startDateTime)
          .catch((error) => {
            handleReviseError(error);
            throw error;
          })
          .finally(() => {
            reviseInFlightRef.current = null;
          });
      }
      return reviseInFlightRef.current;
    },
    [handleReviseError, performRevise],
  );

  const awaitReviseCompletion = useCallback(async () => {
    if (reviseInFlightRef.current) {
      try {
        await reviseInFlightRef.current;
      } catch {
        // handleReviseError already surfaced feedback
      }
    }
  }, []);

  const fallbackSyncFromAppointmentsSearch = useCallback(async () => {
    if (revisedRef.current || !patientUuid || !orderRef.current) {
      return;
    }

    let appointmentsAfter: Awaited<ReturnType<typeof fetchPatientAppointments>> = [];
    try {
      appointmentsAfter = await fetchPatientAppointments(patientUuid, launchTimestampRef.current);
    } catch {
      return;
    }

    const matched = findAppointmentForOrder(
      appointmentsBeforeRef.current,
      appointmentsAfter,
      orderRef.current.concept.display,
    );

    if (matched?.startDateTime) {
      await startRevise(matched.startDateTime);
    }
  }, [patientUuid, startRevise]);

  const finalizeSchedulingSync = useCallback(async () => {
    if (finalizeInFlightRef.current || notifiedRef.current) {
      return;
    }
    finalizeInFlightRef.current = true;
    try {
      await awaitReviseCompletion();
      if (!revisedRef.current) {
        await fallbackSyncFromAppointmentsSearch();
      }
      await notifySyncComplete();
    } catch {
      // Errors are handled in startRevise / handleReviseError
    } finally {
      finalizeInFlightRef.current = false;
    }
  }, [awaitReviseCompletion, fallbackSyncFromAppointmentsSearch, notifySyncComplete]);

  useEffect(() => {
    loadLifeCycles(APPOINTMENTS_APP_MODULE, APPOINTMENTS_FORM_COMPONENT)
      .then(setLifeCycle)
      .catch(() => {
        showSnackbar({
          title: t('appointmentScheduleError', 'Failed to sync scheduled date'),
          subtitle: t(
            'appointmentWorkspaceLoadError',
            'The appointments module could not be loaded. Please ensure it is installed.',
          ),
          kind: 'error',
          isLowContrast: false,
        });
      });
  }, [t]);

  useEffect(() => {
    if (!patientUuid || !order) {
      return undefined;
    }

    const workspace2Store = getGlobalStore<Workspace2StoreState>('workspace2');
    let workspaceWasOpen = isRadiologyAppointmentWorkspaceOpen(workspace2Store.getState());

    const handleWorkspaceClosed = () => {
      const isOpen = isRadiologyAppointmentWorkspaceOpen(workspace2Store.getState());
      if (workspaceWasOpen && !isOpen) {
        window.setTimeout(() => {
          finalizeSchedulingSync().catch(() => undefined);
        }, 0);
      }
      workspaceWasOpen = isOpen;
    };

    const unsubscribeWorkspace = workspace2Store.subscribe(handleWorkspaceClosed);

    launchTimestampRef.current = Date.now();
    fetchPatientAppointments(patientUuid, launchTimestampRef.current)
      .then((appointments) => {
        appointmentsBeforeRef.current = appointments;
      })
      .catch(() => {
        appointmentsBeforeRef.current = [];
      });

    const removeInterceptor = installAppointmentSaveInterceptor(({ patientUuid: savedPatientUuid, startDateTime }) => {
      if (savedPatientUuid !== patientUuid) {
        return;
      }

      // Revise only — defer cache/UI updates until after the form workspace closes.
      startRevise(startDateTime).catch(() => undefined);
    });

    return () => {
      removeInterceptor();
      unsubscribeWorkspace();
    };
  }, [finalizeSchedulingSync, order, patientUuid, startRevise]);

  const wrappedCloseWorkspace = useCallback(
    async (options?: { closeWindow?: boolean; discardUnsavedChanges?: boolean }) => {
      const closed = await closeWorkspace(options);
      if (closed) {
        window.setTimeout(() => {
          finalizeSchedulingSync().catch(() => undefined);
        }, 0);
      }
      return closed;
    },
    [closeWorkspace, finalizeSchedulingSync],
  );

  const parcelProps = useMemo(
    () => ({
      workspaceProps: { patientUuid },
      closeWorkspace: wrappedCloseWorkspace,
      launchChildWorkspace,
      workspaceName,
      windowName,
      windowProps,
      groupProps,
      isRootWorkspace,
    }),
    [
      groupProps,
      isRootWorkspace,
      launchChildWorkspace,
      patientUuid,
      windowName,
      windowProps,
      workspaceName,
      wrappedCloseWorkspace,
    ],
  );

  if (!patientUuid || !order) {
    return null;
  }

  if (!lifeCycle) {
    return <InlineLoading description={`${getCoreTranslation('loading')} ...`} />;
  }

  return <Parcel config={lifeCycle} mountParcel={mountRootParcel} {...parcelProps} />;
};

export default RadiologyAppointmentWorkspace;
