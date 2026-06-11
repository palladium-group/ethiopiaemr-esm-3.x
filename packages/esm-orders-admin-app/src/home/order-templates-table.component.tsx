import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  DataTable,
  DataTableSkeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Toggle,
} from '@carbon/react';
import { Add } from '@carbon/react/icons';
import { launchWorkspace, openmrsFetch, showSnackbar, useLayoutType } from '@openmrs/esm-framework';
import {
  getOrderTemplateUrl,
  revalidateOrderTemplates,
  retireOrderTemplate,
  useOrderTemplates,
} from '../api/order-template.resource';
import { ORDER_TEMPLATE_ADMIN_WORKSPACE } from '../constants';
import { getErrorMessage } from '../order-templates/order-template-form.helper';
import type { OrderTemplateListItem } from '../types';
import styles from './order-templates-table.scss';

const OrderTemplatesTable: React.FC = () => {
  const { t } = useTranslation();
  const layout = useLayoutType();
  const buttonSize = layout === 'tablet' ? 'md' : 'sm';
  const [includeRetired, setIncludeRetired] = useState(false);
  const { orderTemplates, isLoading, error } = useOrderTemplates(includeRetired);

  const headers = useMemo(
    () => [
      { key: 'name', header: t('templateName', 'Template name') },
      { key: 'drug', header: t('drug', 'Drug') },
      { key: 'description', header: t('description', 'Description') },
      { key: 'status', header: t('status', 'Status') },
      { key: 'actions', header: t('actions', 'Actions') },
    ],
    [t],
  );

  const rows = useMemo(
    () =>
      orderTemplates.map((template) => ({
        id: template.uuid,
        name: template.name,
        drug: template.drug?.display ?? template.drug?.name ?? t('notSet', 'Not set'),
        description: template.description || t('notSet', 'Not set'),
        status: template.retired ? t('retired', 'Retired') : t('active', 'Active'),
        actions: template.uuid,
      })),
    [orderTemplates, t],
  );

  const openCreateWorkspace = () => {
    launchWorkspace(ORDER_TEMPLATE_ADMIN_WORKSPACE, {
      workspaceTitle: t('createDrugOrderTemplate', 'Create drug order template'),
    });
  };

  const openEditWorkspace = async (templateUuid: string) => {
    const existing = orderTemplates.find((item) => item.uuid === templateUuid);
    if (!existing) {
      return;
    }

    try {
      const response = await openmrsFetch<OrderTemplateListItem>(getOrderTemplateUrl(templateUuid));
      launchWorkspace(ORDER_TEMPLATE_ADMIN_WORKSPACE, {
        workspaceTitle: t('editDrugOrderTemplate', 'Edit {{templateName}}', { templateName: existing.name }),
        orderTemplate: response.data,
      });
    } catch (fetchError) {
      showSnackbar({
        title: t('error', 'Error'),
        kind: 'error',
        subtitle: getErrorMessage(fetchError, t('orderTemplateLoadFailed', 'Failed to load drug order template.')),
        isLowContrast: true,
      });
    }
  };

  const handleRetire = async (templateUuid: string) => {
    const existing = orderTemplates.find((item) => item.uuid === templateUuid);
    if (!existing || existing.retired) {
      return;
    }

    try {
      await retireOrderTemplate(templateUuid, t('retiredFromAdmin', 'Retired from orders admin'));
      await revalidateOrderTemplates();
      showSnackbar({
        title: t('success', 'Success'),
        kind: 'success',
        subtitle: t('orderTemplateRetired', 'Drug order template retired.'),
        isLowContrast: true,
      });
    } catch (retireError) {
      showSnackbar({
        title: t('error', 'Error'),
        kind: 'error',
        subtitle: getErrorMessage(retireError, t('orderTemplateRetireFailed', 'Failed to retire drug order template.')),
        isLowContrast: true,
      });
    }
  };

  if (isLoading) {
    return <DataTableSkeleton columnCount={headers.length} rowCount={5} />;
  }

  if (error) {
    return <p>{t('errorLoadingOrderTemplates', 'Error loading drug order templates')}</p>;
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <Toggle
          id="include-retired-order-templates"
          labelText={t('includeRetired', 'Include retired')}
          size="sm"
          toggled={includeRetired}
          onToggle={(checked) => setIncludeRetired(checked)}
        />
        <Button kind="primary" renderIcon={Add} size={buttonSize} onClick={openCreateWorkspace}>
          {t('addTemplate', 'Add template')}
        </Button>
      </div>

      {orderTemplates.length === 0 ? (
        <p>{t('noOrderTemplates', 'No drug order templates found')}</p>
      ) : (
        <DataTable headers={headers} rows={rows} size={buttonSize}>
          {({ rows: tableRows, headers: tableHeaders, getTableProps, getHeaderProps, getRowProps }) => (
            <TableContainer title={t('drugOrderTemplates', 'Drug order templates')} className={styles.tableContainer}>
              <Table {...getTableProps()}>
                <TableHead>
                  <TableRow>
                    {tableHeaders.map((header) => (
                      <TableHeader {...getHeaderProps({ header })} key={header.key}>
                        {header.header}
                      </TableHeader>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tableRows.map((row) => {
                    const template = orderTemplates.find((item) => item.uuid === row.id);
                    return (
                      <TableRow {...getRowProps({ row })} key={row.id}>
                        {row.cells.map((cell) =>
                          cell.info.header === 'actions' ? (
                            <TableCell key={cell.id}>
                              <div className={styles.actions}>
                                <Button kind="ghost" size={buttonSize} onClick={() => openEditWorkspace(cell.value)}>
                                  {t('edit', 'Edit')}
                                </Button>
                                {!template?.retired ? (
                                  <Button
                                    kind="danger--ghost"
                                    size={buttonSize}
                                    onClick={() => handleRetire(cell.value)}>
                                    {t('retire', 'Retire')}
                                  </Button>
                                ) : null}
                              </div>
                            </TableCell>
                          ) : (
                            <TableCell key={cell.id}>{cell.value}</TableCell>
                          ),
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DataTable>
      )}
    </div>
  );
};

export default OrderTemplatesTable;
