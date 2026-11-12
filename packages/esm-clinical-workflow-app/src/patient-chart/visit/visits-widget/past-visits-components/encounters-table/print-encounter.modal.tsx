import React, { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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

function printNode(node: HTMLElement, documentTitle: string) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', documentTitle);
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const frameDoc = iframe.contentDocument;
  const frameWindow = iframe.contentWindow;
  if (!frameDoc || !frameWindow) {
    document.body.removeChild(iframe);
    return;
  }

  frameDoc.open();
  frameDoc.write('<!DOCTYPE html><html><head></head><body></body></html>');
  frameDoc.close();
  frameDoc.title = documentTitle;

  Array.from(document.styleSheets).forEach((sheet) => {
    try {
      if (sheet.href) {
        const link = frameDoc.createElement('link');
        link.rel = 'stylesheet';
        link.href = sheet.href;
        frameDoc.head.appendChild(link);
        return;
      }

      const cssText = Array.from(sheet.cssRules)
        .map((rule) => rule.cssText)
        .join('\n');
      if (!cssText) {
        return;
      }
      const style = frameDoc.createElement('style');
      style.appendChild(frameDoc.createTextNode(cssText));
      frameDoc.head.appendChild(style);
    } catch {
      // Cross-origin stylesheets can't be read; skip them.
    }
  });

  const style = frameDoc.createElement('style');
  style.appendChild(
    frameDoc.createTextNode(`
      @page { size: auto; margin: 1.5cm; }
      body { margin: 0; background: #fff; color: #161616; font-family: inherit; }
    `),
  );
  frameDoc.head.appendChild(style);
  frameDoc.body.appendChild(node.cloneNode(true));

  const cleanup = () => {
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  };

  const triggerPrint = () => {
    frameWindow.focus();
    frameWindow.print();
    cleanup();
  };

  // Wait a tick so cloned content + styles are ready.
  setTimeout(triggerPrint, 250);
}

const PrintEncounterModal: React.FC<PrintEncounterModalProps> = ({ encounter, patientUuid, closeModal }) => {
  const { t } = useTranslation();
  const session = useSession();
  const { patient } = usePatient(patientUuid);
  const contentRef = useRef<HTMLDivElement>(null);

  const patientName =
    patient?.name?.[0] != null
      ? [patient.name[0].given?.join(' '), patient.name[0].family].filter(Boolean).join(' ')
      : '--';
  const gender = patient?.gender ?? '--';
  const birthDate = patient?.birthDate
    ? formatDate(new Date(patient.birthDate), { mode: 'wide', noToday: true })
    : '--';

  const title = encounter.formName && encounter.formName !== '--' ? encounter.formName : encounter.encounterType;
  const documentTitle = `${title} - ${patientName}`;

  const handlePrint = useCallback(() => {
    if (contentRef.current) {
      printNode(contentRef.current, documentTitle);
    }
  }, [documentTitle]);

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
        <Button kind="primary" renderIcon={Printer} onClick={handlePrint}>
          {t('print', 'Print')}
        </Button>
      </ModalFooter>
    </>
  );
};

export default PrintEncounterModal;
