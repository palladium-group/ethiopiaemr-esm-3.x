import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, InlineLoading, ModalBody, ModalFooter, ModalHeader } from '@carbon/react';
import { ErrorState } from '@openmrs/esm-framework';
import { usePrintPreview } from './usePrintPreview';
import styles from './print-preview.scss';

interface PrintPreviewModalProps {
  onClose: () => void;
  title?: string;
  documentUrl: string;
}

const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({ onClose, title, documentUrl }) => {
  const { t } = useTranslation();
  const { data, isLoading, error } = usePrintPreview(documentUrl);

  return (
    <>
      <ModalHeader closeModal={onClose} className={styles.title}>
        {t('printPreview', 'Print Preview - {{title}}', { title })}
      </ModalHeader>
      <ModalBody>
        {isLoading && (
          <InlineLoading
            status="active"
            iconDescription={t('loading', 'Loading')}
            description={t('loadingReport', 'Loading report...')}
          />
        )}
        {error && <ErrorState error={error} headerTitle={t('previewError', 'Preview Error')} />}
        {data && !isLoading && (
          <iframe src={data} title={t('reportPreview', 'Report Preview')} className={styles.previewFrame} />
        )}
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose} type="button" className={styles.btn}>
          {t('close', 'Close')}
        </Button>
      </ModalFooter>
    </>
  );
};

export default PrintPreviewModal;
