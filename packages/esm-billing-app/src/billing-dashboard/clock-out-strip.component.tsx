import React from 'react';
import { Button } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { IbmCloudSysdigSecure, Shuffle, Location as LocationIcon } from '@carbon/react/icons';
import { formatDate, parseDate, showModal, useLayoutType, UserHasAccess } from '@openmrs/esm-framework';

import { useClockInStatus } from '../bill-administration/payment-points/use-clock-in-status';

import ClockInButton from './clock-in-button.component';
import styles from './billing-dashboard.scss';
import { Permissions } from '../permission/permissions.constants';

export const ClockOutStrip = () => {
  const { isClockedIn, globalActiveSheet } = useClockInStatus();
  const controlSize = useLayoutType() === 'tablet' ? 'md' : 'sm';
  const { t } = useTranslation();

  if (!isClockedIn) {
    return (
      <div className={styles.clockInContainer}>
        <UserHasAccess privilege={Permissions.ClockInOut}>
          <ClockInButton />
        </UserHasAccess>
      </div>
    );
  }

  const openClockOutModal = () => {
    const dispose = showModal('clock-out-modal', {
      closeModal: () => dispose(),
    });
  };

  const openClockInModal = () => {
    const dispose = showModal('clock-in-modal', {
      closeModal: () => dispose(),
    });
  };

  return (
    <div className={styles.clockOutStrip}>
      <div className={styles.clockOutInfo}>
        <p className={styles.clockInTime}>
          {t('clockInTime', 'Clocked in on {{clockInDate}}', {
            clockInDate: formatDate(parseDate(globalActiveSheet.clockIn), { noToday: true, mode: 'wide' }),
          })}
        </p>
        <span className={styles.middot}>&middot;</span>
        <p className={styles.cashPointName}>{globalActiveSheet.cashPoint.name}</p>
      </div>
      <div>
        <UserHasAccess privilege={Permissions.SwitchPaymentPoint}>
          <Button size={controlSize} kind="ghost" renderIcon={Shuffle} onClick={openClockInModal}>
            {t('switchPaymentPoint', 'Switch Payment Point')}
          </Button>
        </UserHasAccess>
        <UserHasAccess privilege={Permissions.ClockInOut}>
          <Button
            size={controlSize}
            className={styles.clockIn}
            onClick={openClockOutModal}
            kind="danger"
            renderIcon={IbmCloudSysdigSecure}>
            {t('clockOut', 'Clock Out')}
          </Button>
        </UserHasAccess>
      </div>
    </div>
  );
};
