import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  DataTable,
  DataTableSkeleton,
  DatePicker,
  DatePickerInput,
  Dropdown,
  InlineNotification,
  OverflowMenu,
  OverflowMenuItem,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableExpandedRow,
  TableExpandHeader,
  TableExpandRow,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from '@carbon/react';
import { DocumentDownload, DocumentPdf } from '@carbon/react/icons';
import { launchWorkspace, useLayoutType } from '@openmrs/esm-framework';
import { EmptyState } from '@openmrs/esm-patient-common-lib';

import { useAutoClaims, buildCsvUrl, triggerDownload, AutoClaimItem } from './auto-claims.resource';
import { ClaimsPdfExportModal } from './claims-modal/claims-pdf-export-modal.component';
import { StatusUpdateModal } from './claims-modal/claim-status-update-modal.component';
import styles from './auto-claims-table.scss';

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { id: '', label: 'All statuses' },
  { id: 'CREATED', label: 'Created' },
  { id: 'BATCHED', label: 'Batched' },
  { id: 'SUBMITTED', label: 'Submitted' },
  { id: 'APPROVED', label: 'Approved' },
  { id: 'REJECTED', label: 'Rejected' },
  { id: 'PAID', label: 'Paid' },
];

const STATUS_TAG: Record<string, 'gray' | 'blue' | 'cyan' | 'green' | 'red'> = {
  CREATED: 'gray',
  BATCHED: 'blue',
  SUBMITTED: 'cyan',
  APPROVED: 'green',
  REJECTED: 'red',
  PAID: 'green',
};

function toApiDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function displayDate(iso: string | null | undefined): string {
  if (!iso) {
    return '--';
  }
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function etb(v: number | null | undefined): string {
  if (v == null || v === 0) {
    return '--';
  }
  return `${Number(v).toFixed(2)}`;
}

function grandTotal(claims: AutoClaimItem[]): number {
  return claims.reduce((sum, c) => sum + (c.costs.total ?? 0), 0);
}

const StatusTag: React.FC<{ status: string }> = ({ status }) => (
  <Tag type={STATUS_TAG[status] ?? 'gray'} size="sm" className={styles.statusTag}>
    {status}
  </Tag>
);

const ServiceFlags: React.FC<{ claim: AutoClaimItem }> = ({ claim }) => {
  const { services } = claim;
  const flags = [
    { key: 'lab', label: 'Lab', cls: styles.serviceChipLab },
    { key: 'imaging', label: 'Img', cls: styles.serviceChipImg },
    { key: 'procedure', label: 'Proc', cls: styles.serviceChipProc },
    { key: 'medicine', label: 'Med', cls: styles.serviceChipMed },
  ] as const;

  const active = flags.filter((f) => services[f.key]);
  if (!active.length) {
    return <span>--</span>;
  }

  return (
    <>
      {active.map((f) => (
        <span key={f.key} className={`${styles.serviceChip} ${f.cls}`}>
          {f.label}
        </span>
      ))}
    </>
  );
};

const CostLine: React.FC<{ label: string; value: number | null | undefined; bold?: boolean }> = ({
  label,
  value,
  bold,
}) => (
  <div className={bold ? styles.costTotalRow : styles.costRow}>
    <span className={styles.costLabel}>{label}</span>
    <span className={styles.costValue}>{etb(value)}</span>
  </div>
);

const AdminLine: React.FC<{ label: string; value: string | null | undefined }> = ({ label, value }) =>
  value ? (
    <div className={styles.adminRow}>
      <span className={styles.adminLabel}>{label}:</span>
      <span className={styles.adminValue}>{value}</span>
    </div>
  ) : null;

const ExpandedDetail: React.FC<{ claim: AutoClaimItem }> = ({ claim }) => {
  const { t } = useTranslation();
  const { costs, services } = claim;

  return (
    <div className={styles.expandedContent}>
      <div className={styles.expandedGrid}>
        {/* Services */}
        <div className={styles.expandedSection}>
          <p className={styles.sectionTitle}>{t('servicesProvided', 'Services Provided')}</p>
          <div className={styles.serviceFlagsList}>
            {services.lab && (
              <Tag type="blue" size="sm">
                Lab: {services.lab}
              </Tag>
            )}
            {services.imaging && (
              <Tag type="teal" size="sm">
                Imaging: {services.imaging}
              </Tag>
            )}
            {services.procedure && (
              <Tag type="purple" size="sm">
                Procedure: {services.procedure}
              </Tag>
            )}
            {services.medicine && (
              <Tag type="green" size="sm">
                Medicine: {services.medicine}
              </Tag>
            )}
            {!services.lab && !services.imaging && !services.procedure && !services.medicine && (
              <span className={styles.noServiceFlags}>{t('noServicesRecorded', 'No services recorded')}</span>
            )}
          </div>
        </div>

        {/* Cost breakdown */}
        <div className={styles.expandedSection}>
          <p className={styles.sectionTitle}>{t('costBreakdownEtb', 'Cost Breakdown (ETB)')}</p>
          <CostLine label={t('consultation', 'Consultation')} value={costs.consultation} />
          <CostLine label={t('laboratory', 'Laboratory')} value={costs.lab} />
          <CostLine label={t('imaging', 'Imaging')} value={costs.imaging} />
          <CostLine label={t('surgicalProcedure', 'Surgical Procedure')} value={costs.procedure} />
          <CostLine label={t('medicine', 'Medicine')} value={costs.medicine} />
          <CostLine label={t('foodBed', 'Food / Bed')} value={costs.foodBed} />
          <CostLine label={t('others', 'Others')} value={costs.other} />
          <CostLine label={t('totalSum', 'Total Sum')} value={costs.total} bold />
        </div>

        {/* Administrative */}
        <div className={styles.expandedSection}>
          <p className={styles.sectionTitle}>{t('administrative', 'Administrative')}</p>
          <AdminLine label={t('claimRef', 'Claim Ref')} value={claim.claimReference} />
          <AdminLine label={t('woreda', 'Woreda')} value={claim.woreda} />
          <AdminLine label={t('employer', 'Employer')} value={claim.employerOrganization} />
          <AdminLine label={t('provider', 'Provider')} value={claim.providerName} />
          <AdminLine label={t('facility', 'Facility')} value={claim.facilityName} />
          <AdminLine label={t('batchRef', 'Batch Ref')} value={claim.batchReference} />
          <AdminLine label={t('dateCreated', 'Date Created')} value={displayDate(claim.dateCreated)} />
        </div>
      </div>
    </div>
  );
};

const AutoClaimsTable: React.FC = () => {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const controlSize = isTablet ? 'md' : 'sm';

  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [fromDate, setFromDate] = useState(toApiDate(firstOfMonth));
  const [toDate, setToDate] = useState(toApiDate(today));
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);

  const [showPdfModal, setShowPdfModal] = useState(false);
  const [statusEditClaim, setStatusEditClaim] = useState<AutoClaimItem | null>(null);

  const { claims, total, isLoading, error, mutate } = useAutoClaims(
    fromDate,
    toDate,
    status || undefined,
    page,
    PAGE_SIZE,
  );

  const headers = useMemo(
    () => [
      { key: 'claimReference', header: t('claimRef', 'Claim Ref') },
      { key: 'visitDate', header: t('dateOfVisit', 'Date of Visit') },
      { key: 'patientName', header: t('patient', 'Patient') },
      { key: 'cbhiShiId', header: t('cbhiShiId', 'CBHI / SHI ID') },
      { key: 'serviceType', header: t('serviceType', 'Service Type') },
      { key: 'diagnosis', header: t('diagnosis', 'Diagnosis / ICD-10') },
      { key: 'services', header: t('services', 'Services') },
      { key: 'totalCost', header: t('totalEtb', 'Total (ETB)') },
      { key: 'status', header: t('status', 'Status') },
      { key: 'actions', header: t('actions', 'Actions') },
    ],
    [t],
  );

  const tableRows = useMemo(
    () =>
      claims.map((claim) => ({
        id: claim.uuid,
        claimReference: claim.claimReference,
        visitDate: displayDate(claim.visitDate),
        patientName: claim.patientName || '--',
        cbhiShiId: claim.cbhiId || claim.shiId || '--',
        serviceType: claim.serviceType || '--',
        diagnosis: claim.diagnosisCode
          ? `${claim.diagnosisCode} – ${claim.diagnosisName ?? ''}`
          : claim.diagnosisName || '--',
        services: '',
        totalCost: etb(claim.costs.total),
        status: claim.status,
        actions: '',
      })),
    [claims],
  );

  const handleCsvExport = useCallback(() => {
    const url = buildCsvUrl(fromDate, toDate, status || undefined);
    triggerDownload(url, `Form1-Claims-${fromDate}-to-${toDate}.csv`);
  }, [fromDate, toDate, status]);

  const handleEditClaim = useCallback(
    (claim: AutoClaimItem) => {
      launchWorkspace('edit-claim-form', {
        workspaceTitle: claim.patientName
          ? `${t('editClaim', 'Edit Claim')} – ${claim.patientName}`
          : t('editClaim', 'Edit Claim'),
        claim,
      });
    },
    [t],
  );

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.toolbar}>
        <div className={styles.filtersGroup}>
          {/* Date range picker */}
          <div className={styles.datePickerWrapper}>
            <DatePicker
              datePickerType="range"
              dateFormat="Y-m-d"
              value={[fromDate, toDate]}
              onChange={(dates: Date[]) => {
                if (dates[0]) {
                  setFromDate(toApiDate(dates[0]));
                  setPage(0);
                }
                if (dates[1]) {
                  setToDate(toApiDate(dates[1]));
                  setPage(0);
                }
              }}>
              <DatePickerInput
                id="auto-claims-from"
                labelText={t('from', 'From')}
                placeholder="YYYY-MM-DD"
                size={controlSize}
              />
              <DatePickerInput
                id="auto-claims-to"
                labelText={t('to', 'To')}
                placeholder="YYYY-MM-DD"
                size={controlSize}
              />
            </DatePicker>
          </div>

          {/* Status filter */}
          <Dropdown
            id="auto-claims-status"
            className={styles.statusDropdown}
            titleText={t('status', 'Status')}
            label={t('allStatuses', 'All statuses')}
            items={STATUS_OPTIONS}
            itemToString={(item) => item?.label ?? ''}
            selectedItem={STATUS_OPTIONS.find((o) => o.id === status) ?? STATUS_OPTIONS[0]}
            onChange={({ selectedItem }) => {
              setStatus(selectedItem?.id ?? '');
              setPage(0);
            }}
            size={controlSize}
          />
        </div>

        {/* Export buttons */}
        <div className={styles.exportGroup}>
          <Button
            kind="ghost"
            size={controlSize}
            renderIcon={DocumentDownload}
            iconDescription={t('exportCsv', 'Export CSV')}
            disabled={isLoading || !claims.length}
            onClick={handleCsvExport}
            className={styles.exportCsvBtn}>
            {t('exportCsv', 'Export CSV')}
          </Button>
          <Button
            kind="secondary"
            size={controlSize}
            renderIcon={DocumentPdf}
            iconDescription={t('exportPdf', 'Export Form 1 PDF')}
            disabled={isLoading || !claims.length}
            onClick={() => setShowPdfModal(true)}
            className={styles.exportPdfBtn}>
            {t('exportPdf', 'Export Claims Form PDF')}
          </Button>
        </div>
      </div>

      {/* ── Summary bar ── */}
      {!isLoading && !error && claims.length > 0 && (
        <div className={styles.summaryBar}>
          <span>
            {t('showingClaims', 'Showing')} <strong className={styles.summaryCount}>{claims.length}</strong>{' '}
            {t('of', 'of')} <strong className={styles.summaryCount}>{total}</strong> {t('claims', 'claims')}
          </span>
          <span className={styles.summaryTotal}>
            {t('periodTotal', 'Period Total')}: <strong>ETB {grandTotal(claims).toFixed(2)}</strong>
          </span>
        </div>
      )}

      {isLoading && (
        <DataTableSkeleton
          headers={headers}
          rowCount={10}
          columnCount={headers.length}
          zebra
          showToolbar={false}
          showHeader={false}
        />
      )}

      {!isLoading && error && (
        <InlineNotification
          aria-label="closes notification"
          kind="error"
          lowContrast={true}
          statusIconDescription="notification"
          title={t('errorLoadingClaims', 'Error loading claims')}
          subtitle={error?.message ?? error?.message}
        />
      )}

      {!isLoading && !error && claims.length === 0 && (
        <EmptyState headerTitle={t('claims', 'Claims')} displayText={t('claimsDescription', 'Claims')} />
      )}

      {!isLoading && !error && claims.length > 0 && (
        <>
          <div className={styles.tableContainer}>
            <DataTable rows={tableRows} headers={headers} useZebraStyles isSortable>
              {({ rows, headers: hdrs, getHeaderProps, getRowProps, getTableProps, getExpandHeaderProps }) => (
                <TableContainer>
                  <Table {...getTableProps()} size={isTablet ? 'lg' : 'md'}>
                    <TableHead>
                      <TableRow>
                        <TableExpandHeader enableToggle {...getExpandHeaderProps()} />
                        {hdrs.map((header) => (
                          <TableHeader key={header.key} {...getHeaderProps({ header })}>
                            {header.header}
                          </TableHeader>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.map((row) => {
                        const claim = claims.find((c) => c.uuid === row.id);
                        return (
                          <React.Fragment key={row.id}>
                            <TableExpandRow {...getRowProps({ row })}>
                              {row.cells.map((cell) => {
                                // Status badge
                                if (cell.info.header === 'status') {
                                  return (
                                    <TableCell key={cell.id}>
                                      {claim ? <StatusTag status={claim.status} /> : '—'}
                                    </TableCell>
                                  );
                                }

                                // Service flags
                                if (cell.info.header === 'services') {
                                  return (
                                    <TableCell key={cell.id}>{claim ? <ServiceFlags claim={claim} /> : '—'}</TableCell>
                                  );
                                }

                                // Total cost (right-aligned)
                                if (cell.info.header === 'totalCost') {
                                  return (
                                    <TableCell key={cell.id} className={styles.costCell}>
                                      {cell.value}
                                    </TableCell>
                                  );
                                }

                                if (cell.info.header === 'actions') {
                                  return (
                                    <TableCell key={cell.id}>
                                      <OverflowMenu size={controlSize} flipped>
                                        <OverflowMenuItem
                                          itemText={t('editClaim', 'Edit Claim')}
                                          onClick={() => claim && handleEditClaim(claim)}
                                        />
                                        <OverflowMenuItem
                                          itemText={t('updateStatus', 'Update Status')}
                                          onClick={() => setStatusEditClaim(claim ?? null)}
                                        />
                                      </OverflowMenu>
                                    </TableCell>
                                  );
                                }

                                return <TableCell key={cell.id}>{cell.value}</TableCell>;
                              })}
                            </TableExpandRow>

                            {/* Expanded cost + admin detail */}
                            <TableExpandedRow colSpan={hdrs.length + 1}>
                              {claim ? <ExpandedDetail claim={claim} /> : null}
                            </TableExpandedRow>
                          </React.Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </DataTable>
          </div>

          <Pagination
            page={page + 1}
            pageSize={PAGE_SIZE}
            pageSizes={[10, 20, 50]}
            totalItems={total}
            onChange={({ page: p, pageSize }) => {
              setPage(p - 1);
              if (pageSize !== PAGE_SIZE) {
                setPage(0);
              }
            }}
          />
        </>
      )}

      <ClaimsPdfExportModal
        open={showPdfModal}
        fromDate={fromDate}
        toDate={toDate}
        status={status}
        onClose={() => setShowPdfModal(false)}
      />

      <StatusUpdateModal claim={statusEditClaim} onClose={() => setStatusEditClaim(null)} onSuccess={() => mutate()} />
    </div>
  );
};

export default AutoClaimsTable;
