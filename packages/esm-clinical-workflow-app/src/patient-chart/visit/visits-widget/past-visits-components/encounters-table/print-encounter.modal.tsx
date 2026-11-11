import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useReactToPrint } from 'react-to-print';
import { Button, ModalBody, ModalFooter, ModalHeader } from '@carbon/react';
import { Printer } from '@carbon/react/icons';
import { formatDate, formatDatetime, parseDate, usePatient, useSession } from '@openmrs/esm-framework';
import EncounterObservations from '../../encounter-observations';
import EncounterOrdersSummary from '../../encounter-observations/encounter-orders-summary.component';
import type { MappedEncounter } from './encounters-table.resource';
import styles from './print-encounter.scss';

export type PrintEncounterModalProps = {
  encounter: MappedEncounter;
  patientUuid: string;
  closeModal: () => void;
};

const PrintEncounterModal: React.FC<PrintEncounterModalProps> = ({ encounter, patientUuid, closeModal }) => {
  const { t } = useTranslation();
  const session = useSession();
  const { patient } = usePatient(patientUuid);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const onBeforeGetContentResolve = useRef<(() => void) | null>(null);

  const patientName =
    patient?.name?.[0] != null
      ? [patient.name[0].given?.join(' '), patient.name[0].family].filter(Boolean).join(' ')
      : '--';
  const gender = patient?.gender ?? '--';
  const birthDate = patient?.birthDate
    ? formatDate(new Date(patient.birthDate), { mode: 'wide', noToday: true })
    : '--';

  useEffect(() => {
    if (isPrinting && onBeforeGetContentResolve.current) {
      onBeforeGetContentResolve.current();
    }
  }, [isPrinting]);

  const handlePrint = useReactToPrint({
    content: () => contentRef.current,
    documentTitle: `${encounter.formName || encounter.encounterType} - ${patientName}`,
    onBeforeGetContent: () =>
      new Promise<void>((resolve) => {
        onBeforeGetContentResolve.current = resolve;
        setIsPrinting(true);
      }),
    onAfterPrint: () => {
      onBeforeGetContentResolve.current = null;
      setIsPrinting(false);
    },
  });

  const title = encounter.formName && encounter.formName !== '--' ? encounter.formName : encounter.encounterType;

  return (
    <>
      <ModalHeader closeModal={closeModal} title={t('printEncounter', 'Print encounter')} />
      <ModalBody>
        <div className={styles.preview} ref={contentRef}>
          <header className={styles.header}>
            <div>
              <h2 className={styles.title}>{title}</h2>
              <p className={styles.meta}>
                {t('encounterType', 'Encounter type')}: {encounter.encounterType}
              </p>
              <p className={styles.meta}>
                {t('dateAndTime', 'Date & time')}:{' '}
                {formatDatetime(parseDate(encounter.encounterDatetime), { noToday: true })}
              </p>
              <p className={styles.meta}>
                {t('provider', 'Provider')}: {encounter.provider || '--'}
              </p>
            </div>
            <div className={styles.patientBlock}>
              <p className={styles.patientName}>{patientName}</p>
              <p className={styles.meta}>
                {gender}, {birthDate}
              </p>
              <p className={styles.meta}>
                {t('printedBy', 'Printed by')} {session?.user?.display ?? '--'} {t('onDate', 'on')}{' '}
                {formatDate(new Date(), { noToday: true })}
              </p>
            </div>
          </header>

          {encounter.orders?.length ? <EncounterOrdersSummary orders={encounter.orders} /> : null}
          <EncounterObservations observations={encounter.obs} form={encounter.form} />
        </div>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeModal}>
          {t('close', 'Close')}
        </Button>
        <Button kind="primary" renderIcon={Printer} onClick={handlePrint} disabled={isPrinting}>
          {isPrinting ? t('preparingPrint', 'Preparing…') : t('print', 'Print')}
        </Button>
      </ModalFooter>
    </>
  );
};

export default PrintEncounterModal;
