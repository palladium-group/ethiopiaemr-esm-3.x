import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, InlineLoading, InlineNotification, Search, Tag, Tile } from '@carbon/react';
import { Search as SearchIcon, Undo, CheckmarkFilled, Identification } from '@carbon/react/icons';
import { fetchPatientByHealthId, type HealthIdPatient } from './health-id.resource';
import { HealthIdDiffModal } from './health-id-diff-modal.component';
import { type FormValues } from '../patient-registration.types';
import styles from './health-id.scss';

export interface HealthIdSearchProps {
  lookupUrl: string;
  currentFormValues: FormValues;
  isHealthIdOverwritten: boolean;
  linkedHealthId?: string | null;
  phoneAttributeTypeUuid?: string;
  emailAttributeTypeUuid?: string;
  onOverwriteConfirm: (patient: HealthIdPatient) => Promise<void> | void;
  onUndoOverwrite?: () => void;
}

export const HealthIdSearch: React.FC<HealthIdSearchProps> = ({
  lookupUrl,
  currentFormValues,
  isHealthIdOverwritten,
  linkedHealthId,
  phoneAttributeTypeUuid,
  emailAttributeTypeUuid,
  onOverwriteConfirm,
  onUndoOverwrite,
}) => {
  const { t } = useTranslation();
  const [healthIdInput, setHealthIdInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [notFoundId, setNotFoundId] = useState<string | null>(null);

  const [foundPatient, setFoundPatient] = useState<HealthIdPatient | null>(null);
  const [searchedIdForModal, setSearchedIdForModal] = useState('');
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);

  const handleSearch = useCallback(async () => {
    const trimmed = healthIdInput.trim();
    if (!trimmed || isSearching) {
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setNotFoundId(null);

    try {
      const result = await fetchPatientByHealthId(trimmed, lookupUrl);
      if (result && result.success && result.fhir?.person) {
        setFoundPatient(result);
        setSearchedIdForModal(trimmed);
        setIsDiffModalOpen(true);
      } else {
        setNotFoundId(trimmed);
      }
    } catch (err: any) {
      setSearchError(
        err?.message || t('healthIdLookupFailed', 'Failed to communicate with the Health ID lookup service.'),
      );
    } finally {
      setIsSearching(false);
    }
  }, [healthIdInput, isSearching, lookupUrl, t]);

  const handleClear = () => {
    setHealthIdInput('');
    setSearchError(null);
    setNotFoundId(null);
  };

  const handleCloseModal = () => {
    setIsDiffModalOpen(false);
  };

  const handleConfirmOverwrite = async (patient: HealthIdPatient) => {
    await onOverwriteConfirm(patient);
    setIsDiffModalOpen(false);
    setNotFoundId(null);
    setSearchError(null);
  };

  if (isHealthIdOverwritten && linkedHealthId) {
    return (
      <div className={styles.linkedCard}>
        <div className={styles.linkedHeader}>
          <div className={styles.linkedTitle}>
            <CheckmarkFilled size={20} />
            <span>{t('healthIdLinkedHeading', 'Health ID Linked')}</span>
            <Tag type="green" size="md">
              {linkedHealthId}
            </Tag>
          </div>
          {onUndoOverwrite && (
            <Button kind="ghost" size="sm" renderIcon={Undo} onClick={onUndoOverwrite}>
              {t('undoOverwrite', 'Undo overwrite')}
            </Button>
          )}
        </div>
        <div className={styles.linkedBody}>
          <p>
            {t(
              'healthIdLinkedDescription',
              'Patient demographic details have been overwritten with official data from the Health ID registry and locked against manual changes. Click "Update patient" below to save these changes.',
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.healthIdCard}>
      <div className={styles.searchHeader}>
        <div className={styles.searchTitle}>
          <Identification size={20} />
          <span>{t('searchHealthIdTitle', 'Health ID Search')}</span>
        </div>
        <Tag type="blue" size="sm">
          {t('mpiRegistry', 'MPI Registry')}
        </Tag>
      </div>

      <p className={styles.searchDescription}>
        {t(
          'searchHealthIdHelper',
          'Search the National Health ID registry to retrieve verified demographics, review differences in a diff modal, and link the Health ID to this patient record.',
        )}
      </p>

      <div className={styles.searchControls}>
        <Search
          id="health-id-search-input"
          labelText={t('searchByHealthId', 'Search by Health ID')}
          placeholder={t('enterHealthIdPlaceholder', 'Enter Health ID (e.g. HID-12345)')}
          value={healthIdInput}
          onChange={(e) => {
            setHealthIdInput(e.target.value);
            if (!e.target.value) {
              handleClear();
            }
          }}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSearch();
            }
          }}
          onClear={handleClear}
          disabled={isSearching}
          size="md"
        />
        <Button
          kind="primary"
          size="md"
          renderIcon={isSearching ? InlineLoading : SearchIcon}
          onClick={handleSearch}
          disabled={!healthIdInput.trim() || isSearching}>
          {isSearching ? t('searching', 'Searching...') : t('search', 'Search')}
        </Button>
      </div>

      {notFoundId && (
        <div className={styles.notificationWrapper}>
          <InlineNotification
            kind="info"
            title={t('patientNotFoundTitle', 'Patient not found')}
            subtitle={t(
              'patientNotFoundSubtitle',
              'No patient record was found in the Health ID registry for Health ID "{{healthId}}". Please check the number and try again.',
              { healthId: notFoundId },
            )}
            lowContrast
            onCloseButtonClick={() => setNotFoundId(null)}
          />
        </div>
      )}

      {searchError && (
        <div className={styles.notificationWrapper}>
          <InlineNotification
            kind="error"
            title={t('searchErrorTitle', 'Lookup Error')}
            subtitle={searchError}
            lowContrast
            onCloseButtonClick={() => setSearchError(null)}
          />
        </div>
      )}

      {foundPatient && (
        <HealthIdDiffModal
          open={isDiffModalOpen}
          onClose={handleCloseModal}
          onConfirmOverwrite={handleConfirmOverwrite}
          searchedHealthId={searchedIdForModal}
          healthIdPatient={foundPatient}
          currentFormValues={currentFormValues}
          phoneAttributeTypeUuid={phoneAttributeTypeUuid}
          emailAttributeTypeUuid={emailAttributeTypeUuid}
        />
      )}
    </div>
  );
};
