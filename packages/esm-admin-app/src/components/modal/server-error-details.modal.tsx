import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, CodeSnippet, InlineNotification, ModalBody, ModalFooter, ModalHeader, Tag } from '@carbon/react';
import { type ParsedServerError } from '../../utils/server-error';
import styles from './server-error-details.modal.scss';

interface ServerErrorDetailsModalProps {
  closeModal: () => void;
  title: string;
  description?: string;
  error: ParsedServerError;
}

const ServerErrorDetailsModal: React.FC<ServerErrorDetailsModalProps> = ({ closeModal, title, description, error }) => {
  const { t } = useTranslation();
  const [showRaw, setShowRaw] = useState(false);

  const rawJson = useMemo(() => {
    try {
      return JSON.stringify(
        { status: error.status, statusText: error.statusText, url: error.url, response: error.raw },
        null,
        2,
      );
    } catch {
      return String(error.raw);
    }
  }, [error]);

  const hasValidationErrors = error.globalErrors.length > 0 || error.fieldErrors.length > 0;

  return (
    <>
      <ModalHeader closeModal={closeModal} title={title} />
      <ModalBody className={styles.body}>
        {description ? <p className={styles.description}>{description}</p> : null}

        <InlineNotification
          className={styles.notification}
          kind="error"
          lowContrast
          hideCloseButton
          title={
            error.status ? `${error.status}${error.statusText ? ` ${error.statusText}` : ''}` : t('error', 'Error')
          }
          subtitle={error.message}
        />

        {hasValidationErrors ? (
          <div className={styles.section}>
            <h5 className={styles.sectionTitle}>{t('validationErrors', 'Validation errors')}</h5>
            <ul className={styles.errorList}>
              {error.globalErrors.map((message, index) => (
                <li key={`global-${index}`}>{message}</li>
              ))}
              {error.fieldErrors.map(({ field, message }, index) => (
                <li key={`field-${index}`}>
                  <Tag type="red" size="sm">
                    {field}
                  </Tag>
                  <span>{message}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className={styles.section}>
          <Button kind="ghost" size="sm" onClick={() => setShowRaw((value) => !value)}>
            {showRaw
              ? t('hideTechnicalDetails', 'Hide technical details')
              : t('showTechnicalDetails', 'Show technical details')}
          </Button>
          {showRaw ? (
            <CodeSnippet
              type="multi"
              className={styles.snippet}
              feedback={t('copied', 'Copied!')}
              maxCollapsedNumberOfRows={20}
              wrapText>
              {rawJson}
            </CodeSnippet>
          ) : null}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button kind="primary" onClick={closeModal}>
          {t('close', 'Close')}
        </Button>
      </ModalFooter>
    </>
  );
};

export default ServerErrorDetailsModal;
