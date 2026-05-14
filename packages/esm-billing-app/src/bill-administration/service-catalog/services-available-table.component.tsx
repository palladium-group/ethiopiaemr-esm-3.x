import {
  ComboButton,
  DataTable,
  DataTableSkeleton,
  InlineLoading,
  MenuItem,
  OverflowMenu,
  OverflowMenuItem,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TableToolbar,
  TableToolbarContent,
  TableToolbarSearch,
} from '@carbon/react';
import { CategoryAdd, Download, Upload, WatsonHealthScalpelSelect } from '@carbon/react/icons';
import {
  ErrorState,
  launchWorkspace,
  showModal,
  useLayoutType,
  usePagination,
  userHasAccess,
  UserHasAccess,
  useSession,
} from '@openmrs/esm-framework';
import { EmptyState, usePaginationInfo } from '@openmrs/esm-patient-common-lib';
import React, { ChangeEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './charge-summary-table.scss';
import { type ChargeAble, useChargeSummaries } from './charge-summary.resource';
import { downloadExcelTemplateFile, searchTableData } from './form-helper';
import { useCurrencyFormatting } from '../../helpers/currency';
import { Permissions } from '../../permission/permissions.constants';
import ServiceTableFilter from './services/service-table-filter.component';
import { useServiceTableFilters } from './billable-service.resource';

const defaultPageSize = 10;

const ServicesAvailableTable: React.FC = () => {
  const { t } = useTranslation();
  const { format: formatCurrency } = useCurrencyFormatting();
  const session = useSession();
  const clinicalChargesPrivileges = [Permissions.AddChargeService, Permissions.AddChargeItem];
  const showActionButtons = clinicalChargesPrivileges.some((privilege) => userHasAccess(privilege, session?.user));

  const layout = useLayoutType();
  const size = layout === 'tablet' ? 'lg' : 'md';
  const { isLoading, isValidating, error, mutate, chargeSummaryItems } = useChargeSummaries();
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [searchString, setSearchString] = useState('');

  const { filters, setFilters, filteredRows, availableTypes } = useServiceTableFilters(chargeSummaryItems);
  const searchResults = useMemo(() => searchTableData(filteredRows, searchString), [filteredRows, searchString]);
  const { results, goTo, currentPage } = usePagination(searchResults, pageSize);
  const { pageSizes } = usePaginationInfo(defaultPageSize, searchResults.length, currentPage, results.length);

  const headers = [
    { key: 'name', header: t('name', 'Name') },
    { key: 'shortName', header: t('shortName', 'Short Name') },
    { key: 'serviceType', header: t('type', 'Type') },
    { key: 'available', header: t('available', 'Available') },
  ];

  const rows = results.map((service) => ({
    id: service.uuid,
    name: service.name,
    shortName: service.shortName,
    serviceStatus: service.serviceStatus,
    serviceType: service?.serviceType?.display ?? t('stockItem', 'Stock Item'),
    servicePrices: service.servicePrices.map((price) => `${price.name} : ${formatCurrency(price.price)}`).join(', '),
    available: service.serviceStatus === 'ENABLED' ? t('yes', 'Yes') : t('no', 'No'),
  }));

  const handleDelete = (chargeableItem: ChargeAble) => {
    const dispose = showModal('delete-billableservice-modal', {
      closeModal: () => dispose(),
      chargeableItem,
    });
  };

  const handleEdit = (service) => {
    Boolean(service?.serviceType?.display)
      ? launchWorkspace('available-service-form', {
          initialValues: service,
          workspaceTitle: t('editService', 'Edit Service'),
        })
      : launchWorkspace('add-commodity-form', {
          initialValues: service,
          workspaceTitle: t('editChargeItem', 'Edit Charge Item'),
        });
  };

  const openBulkUploadModal = () => {
    const dispose = showModal('bulk-import-billable-services-modal', {
      closeModal: () => dispose(),
    });
  };

  if (isLoading) {
    return <DataTableSkeleton headers={headers} aria-label="sample table" showHeader={false} showToolbar={false} />;
  }

  if (error) {
    return <ErrorState error={error} headerTitle={t('billableServicesError', 'Billable services error')} />;
  }

  if (!chargeSummaryItems.length) {
    return (
      <EmptyState
        headerTitle={t('chargeItems', 'Charge Items')}
        launchForm={() => launchWorkspace('available-service-form')}
        displayText={t('chargeItemsDescription', 'Charge Items')}
      />
    );
  }

  return (
    <>
      <DataTable size={layout === 'tablet' ? 'md' : 'sm'} useZebraStyles rows={rows} headers={headers}>
        {({ rows, headers, getHeaderProps, getRowProps, getTableProps, getToolbarProps, getTableContainerProps }) => (
          <TableContainer className={styles.tableContainer} {...getTableContainerProps()}>
            <TableToolbar {...getToolbarProps()} aria-label="data table toolbar">
              <TableToolbarContent>
                <TableToolbarSearch
                  placeholder={t('searchForService', 'Search for a service')}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchString(e.target.value)}
                  persistent
                  size={size}
                />
                <ServiceTableFilter filters={filters} onChange={setFilters} availableTypes={availableTypes} />
                {isValidating && (
                  <InlineLoading status="active" iconDescription="Loading" description="Loading data..." />
                )}
                {showActionButtons && (
                  <ComboButton tooltipAlignment="left" label={t('actions', 'Action')}>
                    <UserHasAccess privilege={Permissions.AddChargeService}>
                      <MenuItem
                        renderIcon={CategoryAdd}
                        onClick={() =>
                          launchWorkspace('available-service-form', {
                            workspaceTitle: t('addServiceForm', 'Add Service Form'),
                          })
                        }
                        label={t('addServiceAvailableForm', 'Add Service')}
                      />
                    </UserHasAccess>
                    <UserHasAccess privilege={Permissions.AddChargeItem}>
                      <MenuItem
                        renderIcon={WatsonHealthScalpelSelect}
                        onClick={() =>
                          launchWorkspace('add-commodity-form', {
                            workspaceTitle: t('addCommodityForm', 'Add Commodity Form'),
                          })
                        }
                        label={t('addCommodityChargeItem', 'Add charge item')}
                      />
                    </UserHasAccess>
                    <UserHasAccess privilege={Permissions.AddChargeService}>
                      <MenuItem
                        onClick={openBulkUploadModal}
                        label={t('bulkUpload', 'Bulk Upload')}
                        renderIcon={Upload}
                      />
                      <MenuItem
                        onClick={downloadExcelTemplateFile}
                        label={t('downloadTemplate', 'Download template')}
                        renderIcon={Download}
                      />
                    </UserHasAccess>
                  </ComboButton>
                )}
              </TableToolbarContent>
            </TableToolbar>
            <Table {...getTableProps()} aria-label={t('chargeItem', 'Charge items table')}>
              <TableHead>
                <TableRow>
                  {headers.map((header) => (
                    <TableHeader key={header.key} {...getHeaderProps({ header })}>
                      {header.header}
                    </TableHeader>
                  ))}
                  <TableHeader aria-label={t('overflowMenu', 'Overflow menu')} />
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row, index) => (
                  <TableRow key={row.id} {...getRowProps({ row })}>
                    {row.cells.map((cell) => (
                      <TableCell key={cell.id}>{cell.value}</TableCell>
                    ))}
                    <TableCell className="cds--table-column-menu">
                      <OverflowMenu size="sm" flipped>
                        <OverflowMenuItem
                          disabled={!userHasAccess(Permissions.EditChargeItem, session?.user)}
                          itemText={t('editService', 'Edit service')}
                          onClick={() => handleEdit(results[index])}
                        />
                        <OverflowMenuItem
                          disabled={!userHasAccess(Permissions.DeleteChargeItem, session?.user)}
                          hasDivider
                          isDelete
                          itemText={t('deleteService', 'Delete service')}
                          onClick={() => handleDelete(results[index])}
                        />
                      </OverflowMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DataTable>
      <Pagination
        backwardText={t('previousPage', 'Previous page')}
        forwardText={t('nextPage', 'Next page')}
        itemsPerPageText={t('itemsPerPage', 'Items per page')}
        onChange={({ page, pageSize }) => {
          setPageSize(pageSize);
          goTo(page);
        }}
        page={currentPage}
        pageSize={pageSize}
        pageSizes={pageSizes}
        size="sm"
        totalItems={searchResults.length}
      />
    </>
  );
};

export default ServicesAvailableTable;
