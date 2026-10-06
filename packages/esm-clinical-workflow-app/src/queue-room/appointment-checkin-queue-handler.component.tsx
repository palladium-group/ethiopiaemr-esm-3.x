import React, { useEffect } from 'react';
import { subscribeAppointmentCheckInQueueSync } from './appointment-checkin-queue-sync';

/**
 * Extension component registered to `appointments-metrics-slot`.
 * Automatically mounts when on the appointments page, ensuring that the service queue
 * selector workspace (`create-queue-entry-workspace`) is launched after appointment check-in.
 */
const AppointmentCheckInQueueHandler: React.FC = () => {
  useEffect(() => {
    const unsubscribe = subscribeAppointmentCheckInQueueSync();
    return () => {
      unsubscribe();
    };
  }, []);

  return null;
};

export default AppointmentCheckInQueueHandler;
