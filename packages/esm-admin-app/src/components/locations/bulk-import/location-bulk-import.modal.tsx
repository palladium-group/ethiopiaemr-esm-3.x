import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  DataTable,
  InlineLoading,
  InlineNotification,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from '@carbon/react';
import { DocumentAttachment, Download, TrashCan, Upload } from '@carbon/react/icons';
import { showSnackbar } from '@openmrs/esm-framework';
import {
  downloadRemainingImportRows,
  excludeRowsFromImportFile,
  isAlreadyExistsError,
} from './location-bulk-import-file';
import { bulkImportLocations } from './location-bulk-import.resource';
import { type LocationBulkImportResult, type LocationBulkImportRowStatus } from './location-bulk-import.types';
import {
  downloadLocationBulkImportTemplate,
  getFileFingerprint,
  isAcceptedLocationImportFile,
  MAX_LOCATION_IMPORT_FILE_SIZE,
} from './location-bulk-import.utils';
import styles from './location-bulk-import.modal.scss';

interface LocationBulkImportModalProps {
  closeModal: () => void;
  mutateLocations?: () => void;
}

function getErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return '';
  }

  const err = error as {
    responseBody?: { error?: { message?: string }; message?: string };
    message?: string;
  };

  return err.responseBody?.error?.message || err.responseBody?.message || err.message || '';
}

const statusTagType: Record<LocationBulkImportRowStatus, 'red' | 'green' | 'blue'> = {
  ERROR: 'red',
  VALID: 'green',
  CREATED: 'blue',
};

const LocationBulkImportModal: React.FC<LocationBulkImportModalProps> = ({ closeModal, mutateLocations }) => {
  const { t } = useTranslation();
  const inputFileRef = useRef<HTMLInputElement>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExcluding, setIsExcluding] = useState(false);
  const [result, setResult] = useState<LocationBulkImportResult | null>(null);
  const [validatedFileKey, setValidatedFileKey] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  const canImport = useMemo(() => {
    if (!uploadedFile || !result || !validatedFileKey) {
      return false;
    }
    return (
      result.success && result.dryRun && result.errorRows === 0 && validatedFileKey === getFileFingerprint(uploadedFile)
    );
  }, [uploadedFile, result, validatedFileKey]);

  const alreadyExistsRowNumbers = useMemo(() => {
    if (!result?.rows) {
      return [];
    }
    return result.rows
      .filter((row) => row.status === 'ERROR' && isAlreadyExistsError(row.errors))
      .map((row) => row.rowNumber);
  }, [result]);

  const hasErrorRows = Boolean(result && result.errorRows > 0);

  const attachFiles = () => {
    inputFileRef.current?.click();
  };

  const resetValidationState = () => {
    setResult(null);
    setValidatedFileKey(null);
    setRequestError(null);
  };

  const handleFileChange = () => {
    const file = inputFileRef.current?.files?.[0];
    if (!file) {
      return;
    }

    if (!isAcceptedLocationImportFile(file)) {
      showSnackbar({
        title: t('invalidFileType', 'Invalid file type'),
        subtitle: t('locationImportFileTypeHint', 'Upload a .csv or .xlsx file.'),
        kind: 'error',
      });
      if (inputFileRef.current) {
        inputFileRef.current.value = '';
      }
      return;
    }

    if (file.size > MAX_LOCATION_IMPORT_FILE_SIZE) {
      showSnackbar({
        title: t('fileTooBig', 'File too large'),
        subtitle: t('locationImportMaxSize', 'Maximum file size is 2 MB.'),
        kind: 'error',
      });
      if (inputFileRef.current) {
        inputFileRef.current.value = '';
      }
      return;
    }

    setUploadedFile(file);
    resetValidationState();
  };

  const runBulkImport = useCallback(
    async (dryRun: boolean, fileOverride?: File) => {
      const file = fileOverride ?? uploadedFile;
      if (!file) {
        return;
      }

      setRequestError(null);
      if (dryRun) {
        setIsValidating(true);
      } else {
        setIsImporting(true);
      }

      try {
        const importResult = await bulkImportLocations(file, dryRun);
        setResult(importResult);

        if (dryRun) {
          setValidatedFileKey(getFileFingerprint(file));
          if (importResult.success) {
            showSnackbar({
              title: t('validationSucceeded', 'Validation succeeded'),
              subtitle: t(
                'locationImportReadyToImport',
                '{{validRows}} of {{totalRows}} rows are valid. You can import now.',
                { validRows: importResult.validRows, totalRows: importResult.totalRows },
              ),
              kind: 'success',
            });
          } else {
            showSnackbar({
              title: t('validationFailed', 'Validation failed'),
              subtitle: t(
                'locationImportValidationErrors',
                '{{errorRows}} of {{totalRows}} rows have errors. Nothing was created.',
                { errorRows: importResult.errorRows, totalRows: importResult.totalRows },
              ),
              kind: 'error',
            });
          }
          return;
        }

        if (importResult.success) {
          showSnackbar({
            title: t('importSucceeded', 'Import succeeded'),
            subtitle: t('locationImportCreatedCount', 'Created {{count}} location(s).', {
              count: importResult.createdCount,
            }),
            kind: 'success',
          });
          mutateLocations?.();
          closeModal();
          return;
        }

        setValidatedFileKey(null);
        showSnackbar({
          title: t('importFailed', 'Import failed'),
          subtitle: t(
            'locationImportCommitErrors',
            'The file could not be imported. Fix the row errors and validate again.',
          ),
          kind: 'error',
        });
      } catch (error) {
        const message =
          getErrorMessage(error) ||
          t(
            'locationImportRequestError',
            'The import request failed. Check that the file is not empty and includes the required columns (name, tags).',
          );
        setRequestError(message);
        setResult(null);
        setValidatedFileKey(null);
        showSnackbar({
          title: dryRun ? t('validationFailed', 'Validation failed') : t('importFailed', 'Import failed'),
          subtitle: message,
          kind: 'error',
        });
      } finally {
        setIsValidating(false);
        setIsImporting(false);
      }
    },
    [uploadedFile, t, mutateLocations, closeModal],
  );

  const excludeRowsAndRevalidate = async (rowNumbers: number[]) => {
    if (!uploadedFile || !rowNumbers.length) {
      return;
    }

    setIsExcluding(true);
    setRequestError(null);

    try {
      const nextFile = await excludeRowsFromImportFile(uploadedFile, rowNumbers);
      setUploadedFile(nextFile);
      if (inputFileRef.current) {
        inputFileRef.current.value = '';
      }
      showSnackbar({
        title: t('rowsRemoved', 'Rows removed'),
        subtitle: t('locationImportRowsRemoved', 'Removed {{count}} row(s). Re-validating the remaining file.', {
          count: rowNumbers.length,
        }),
        kind: 'success',
      });
      await runBulkImport(true, nextFile);
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      const message =
        code === 'NO_ROWS_REMAINING'
          ? t(
              'locationImportNoRowsRemaining',
              'Cannot remove those rows — no location rows would remain. Choose a different file or keep at least one row.',
            )
          : getErrorMessage(error) ||
            t(
              'locationImportExcludeError',
              'Could not update the file after removing rows. Try downloading and editing offline.',
            );
      setRequestError(message);
      showSnackbar({
        title: t('rowsRemovedFailed', 'Could not remove rows'),
        subtitle: message,
        kind: 'error',
      });
    } finally {
      setIsExcluding(false);
    }
  };

  const handleDownloadRemaining = async () => {
    if (!uploadedFile) {
      return;
    }
    try {
      await downloadRemainingImportRows(uploadedFile);
    } catch (error) {
      showSnackbar({
        title: t('downloadFailed', 'Download failed'),
        subtitle:
          getErrorMessage(error) || t('locationImportDownloadRemainingError', 'Could not download the remaining rows.'),
        kind: 'error',
      });
    }
  };

  const tableHeaders = [
    { key: 'rowNumber', header: t('rowNumber', 'Row') },
    { key: 'name', header: t('locationName', 'Location Name') },
    { key: 'status', header: t('status', 'Status') },
    { key: 'errors', header: t('errors', 'Errors') },
    { key: 'actions', header: t('actions', 'Actions') },
  ];

  const tableRows =
    result?.rows.map((row) => ({
      id: String(row.rowNumber),
      rowNumber: row.rowNumber,
      name: row.name || '—',
      status: row.status,
      errors: row.errors?.length ? row.errors : [],
      actions: row.status === 'ERROR' ? row.rowNumber : null,
    })) ?? [];

  const isBusy = isValidating || isImporting || isExcluding;

  return (
    <>
      <div className="cds--modal-header">
        <h3 className="cds--modal-header__heading">{t('importLocations', 'Import locations')}</h3>
      </div>
      <div className="cds--modal-content">
        <p className={styles.description}>
          {t(
            'locationImportDescription',
            'Bulk-import locations for new hospital or facility setup. Existing location names are rejected (exact match) and are never updated. The server validates the entire file; any row error means nothing is created.',
          )}
        </p>
        <p className={styles.columnsHelp}>
          {t(
            'locationImportColumnsHelp',
            'Required columns: name, tags. Optional: parentName or parentUuid (not both), uuid, description, and attribute.* columns (e.g. Master Facility Code). Separate tags with |, ;, or ,.',
          )}
        </p>

        <div className={styles.actionsRow}>
          <Button kind="tertiary" size="sm" renderIcon={Download} onClick={downloadLocationBulkImportTemplate}>
            {t('downloadTemplate', 'Download template')}
          </Button>
        </div>

        <input
          type="file"
          ref={inputFileRef}
          hidden
          onChange={handleFileChange}
          accept=".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
        />

        <div className={styles.uploadRow}>
          <Button kind="secondary" size="sm" renderIcon={DocumentAttachment} onClick={attachFiles} disabled={isBusy}>
            {t('chooseFile', 'Choose file')}
          </Button>
          <span className={styles.selectedFile}>
            {uploadedFile ? uploadedFile.name : t('noFileSelected', 'No file selected')}
          </span>
        </div>
        <p className={styles.fileHint}>{t('locationImportFileHint', 'Accepted formats: .csv or .xlsx, up to 2 MB.')}</p>

        {requestError ? (
          <InlineNotification
            kind="error"
            title={t('requestError', 'Request error')}
            subtitle={requestError}
            lowContrast
            onClose={() => setRequestError(null)}
          />
        ) : null}

        {result ? (
          <>
            <div className={styles.summaryRow}>
              <div className={styles.summaryTile}>
                <span className={styles.summaryLabel}>{t('totalRows', 'Total')}</span>
                <span className={styles.summaryValue}>{result.totalRows}</span>
              </div>
              <div className={styles.summaryTile}>
                <span className={styles.summaryLabel}>{t('validRows', 'Valid')}</span>
                <span className={styles.summaryValue}>{result.validRows}</span>
              </div>
              <div className={styles.summaryTile}>
                <span className={styles.summaryLabel}>{t('errorRows', 'Errors')}</span>
                <span className={styles.summaryValue}>{result.errorRows}</span>
              </div>
              {!result.dryRun ? (
                <div className={styles.summaryTile}>
                  <span className={styles.summaryLabel}>{t('createdCount', 'Created')}</span>
                  <span className={styles.summaryValue}>{result.createdCount}</span>
                </div>
              ) : null}
            </div>

            {hasErrorRows ? (
              <div className={styles.excludeActions}>
                <p className={styles.excludeHint}>
                  {t(
                    'locationImportExcludeHint',
                    'Remove errored rows from this batch, then we re-validate. Existing locations are never updated — remove those rows to import the rest.',
                  )}
                </p>
                <div className={styles.actionsRow}>
                  {alreadyExistsRowNumbers.length > 0 ? (
                    <Button
                      kind="danger--tertiary"
                      size="sm"
                      renderIcon={TrashCan}
                      disabled={isBusy}
                      onClick={() => excludeRowsAndRevalidate(alreadyExistsRowNumbers)}>
                      {t('removeAlreadyExists', 'Remove already-existing ({{count}})', {
                        count: alreadyExistsRowNumbers.length,
                      })}
                    </Button>
                  ) : null}
                  <Button
                    kind="ghost"
                    size="sm"
                    renderIcon={Download}
                    disabled={isBusy}
                    onClick={handleDownloadRemaining}>
                    {t('downloadRemainingRows', 'Download remaining rows')}
                  </Button>
                </div>
              </div>
            ) : null}

            <p className={styles.resultsHeading}>{t('rowResults', 'Row results')}</p>
            <div className={styles.resultsTable}>
              <DataTable rows={tableRows} headers={tableHeaders} size="sm" useZebraStyles>
                {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
                  <TableContainer>
                    <Table {...getTableProps()}>
                      <TableHead>
                        <TableRow>
                          {headers.map((header) => (
                            <TableHeader key={header.key} {...getHeaderProps({ header })}>
                              {header.header}
                            </TableHeader>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rows.map((row) => (
                          <TableRow key={row.id} {...getRowProps({ row })}>
                            {row.cells.map((cell) => {
                              if (cell.id.endsWith(':status')) {
                                const status = cell.value as LocationBulkImportRowStatus;
                                return (
                                  <TableCell key={cell.id}>
                                    <Tag type={statusTagType[status] ?? 'gray'} size="sm">
                                      {status}
                                    </Tag>
                                  </TableCell>
                                );
                              }
                              if (cell.id.endsWith(':errors')) {
                                const errors = cell.value as string[];
                                return (
                                  <TableCell key={cell.id}>
                                    {Array.isArray(errors) && errors.length > 0 ? (
                                      <ul className={styles.errorList}>
                                        {errors.map((error, index) => (
                                          <li key={index}>{error}</li>
                                        ))}
                                      </ul>
                                    ) : (
                                      '—'
                                    )}
                                  </TableCell>
                                );
                              }
                              if (cell.id.endsWith(':actions')) {
                                const rowNumber = cell.value as number | null;
                                return (
                                  <TableCell key={cell.id}>
                                    {rowNumber != null ? (
                                      <Button
                                        kind="ghost"
                                        size="sm"
                                        hasIconOnly
                                        iconDescription={t('removeRow', 'Remove row')}
                                        renderIcon={TrashCan}
                                        disabled={isBusy}
                                        onClick={() => excludeRowsAndRevalidate([rowNumber])}
                                      />
                                    ) : (
                                      '—'
                                    )}
                                  </TableCell>
                                );
                              }
                              return <TableCell key={cell.id}>{cell.value}</TableCell>;
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </DataTable>
            </div>
          </>
        ) : null}
      </div>
      <div className="cds--modal-footer">
        <Button kind="secondary" onClick={closeModal} disabled={isBusy}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button kind="tertiary" onClick={() => runBulkImport(true)} disabled={!uploadedFile || isBusy}>
          {isValidating || isExcluding ? (
            <span className={styles.footerLoading}>
              <InlineLoading status="active" />
              {isExcluding ? t('updatingFile', 'Updating file...') : t('validating', 'Validating...')}
            </span>
          ) : (
            t('validate', 'Validate')
          )}
        </Button>
        <Button kind="primary" renderIcon={Upload} onClick={() => runBulkImport(false)} disabled={!canImport || isBusy}>
          {isImporting ? (
            <span className={styles.footerLoading}>
              <InlineLoading status="active" />
              {t('importing', 'Importing...')}
            </span>
          ) : (
            t('import', 'Import')
          )}
        </Button>
      </div>
    </>
  );
};

export default LocationBulkImportModal;
