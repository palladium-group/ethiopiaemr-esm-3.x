import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ComposedModal, ModalBody, ModalFooter, ModalHeader, TextInput } from '@carbon/react';
import { DocumentPdf } from '@carbon/react/icons';
import { buildPdfUrl, PdfExportOptions, triggerDownload } from '../auto-claims.resource';
import styles from './claims-pdf-export-modal.scss';

interface PdfModalProps {
  open: boolean;
  fromDate: string;
  toDate: string;
  status: string;
  onClose: () => void;
}

export const ClaimsPdfExportModal: React.FC<PdfModalProps> = ({ open, fromDate, toDate, status, onClose }) => {
  const { t } = useTranslation();
  const [opts, setOpts] = useState<Partial<PdfExportOptions>>({});

  const handleExport = () => {
    const url = buildPdfUrl({ fromDate, toDate, status: status || undefined, ...opts });
    triggerDownload(url, `Form1-Claims-${fromDate}-to-${toDate}.pdf`);
    onClose();
  };

  const set = (key: keyof PdfExportOptions) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setOpts((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <ComposedModal open={open} onClose={onClose} size="sm">
      <ModalHeader title={t('exportForm1Pdf', 'Export Claims Form  PDF')} />
      <ModalBody>
        <p className={styles.modalHeader}>
          {t(
            'pdfExportHint',
            'Facility details are auto-populated from the claim records. ' +
              'Optionally override or add the fields below.',
          )}
        </p>
        <div className={styles.modalFieldGrid}>
          <TextInput
            id="pdf-facility-code"
            labelText={t('facilityCode', 'Facility Code')}
            placeholder="e.g. ETH-HF-001"
            onChange={set('facilityCode')}
          />
          <TextInput
            id="pdf-region"
            labelText={t('region', 'Region')}
            placeholder="e.g. Addis Ababa"
            onChange={set('region')}
          />
          <TextInput
            id="pdf-zone"
            labelText={t('zone', 'Zone / Sub-City')}
            placeholder="e.g. Bole"
            onChange={set('zone')}
          />
          <TextInput
            id="pdf-woreda"
            labelText={t('woreda', 'Woreda')}
            placeholder="e.g. Woreda 3"
            onChange={set('woreda')}
          />
          <TextInput
            id="pdf-town"
            labelText={t('town', 'Town')}
            placeholder="e.g. Addis Ababa"
            onChange={set('town')}
          />
          <TextInput
            id="pdf-prepared-by"
            labelText={t('preparedBy', 'Prepared By')}
            placeholder="Full name"
            onChange={set('preparedBy')}
          />
          <TextInput
            id="pdf-approved-by"
            labelText={t('approvedBy', 'Approved By')}
            placeholder="Full name"
            onChange={set('approvedBy')}
          />
        </div>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button kind="primary" renderIcon={DocumentPdf} onClick={handleExport}>
          {t('downloadPdf', 'Download PDF')}
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
};
