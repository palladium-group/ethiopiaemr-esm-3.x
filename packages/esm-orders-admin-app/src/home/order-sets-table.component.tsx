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
import { getOrderSetUrl, revalidateOrderSets, retireOrderSet, useOrderSets } from '../api/order-set.resource';
import { ORDER_SET_ADMIN_WORKSPACE } from '../constants';
import { getErrorMessage } from '../order-sets/order-set-form.helper';
import type { OrderSetListItem } from '../types';
import styles from './order-sets-table.scss';

const OrderSetsTable: React.FC = () => {
  const { t } = useTranslation();
  const layout = useLayoutType();
  const buttonSize = layout === 'tablet' ? 'md' : 'sm';
  const [includeRetired, setIncludeRetired] = useState(false);
  const { orderSets, isLoading, error } = useOrderSets(includeRetired);

  const headers = useMemo(
    () => [
      { key: 'name', header: t('orderSetName', 'Order set name') },
      { key: 'description', header: t('description', 'Description') },
      { key: 'members', header: t('members', 'Members') },
      { key: 'operator', header: t('operator', 'Operator') },
      { key: 'status', header: t('status', 'Status') },
      { key: 'actions', header: t('actions', 'Actions') },
    ],
    [t],
  );

  const rows = useMemo(
    () =>
      orderSets.map((orderSet) => ({
        id: orderSet.uuid,
        name: orderSet.name,
        description: orderSet.description || t('notSet', 'Not set'),
        members: String(orderSet.orderSetMembers?.filter((member) => !member.retired).length ?? 0),
        operator: orderSet.operator,
        status: orderSet.retired ? t('retired', 'Retired') : t('active', 'Active'),
        actions: orderSet.uuid,
      })),
    [orderSets, t],
  );

  const openCreateWorkspace = () => {
    launchWorkspace(ORDER_SET_ADMIN_WORKSPACE, {
      workspaceTitle: t('createOrderSet', 'Create order set'),
    });
  };

  const openEditWorkspace = async (orderSetUuid: string) => {
    const existing = orderSets.find((item) => item.uuid === orderSetUuid);
    if (!existing) {
      return;
    }

    try {
      const response = await openmrsFetch<OrderSetListItem>(getOrderSetUrl(orderSetUuid));
      launchWorkspace(ORDER_SET_ADMIN_WORKSPACE, {
        workspaceTitle: t('editOrderSet', 'Edit {{orderSetName}}', { orderSetName: existing.name }),
        orderSet: response.data,
      });
    } catch (fetchError) {
      showSnackbar({
        title: t('error', 'Error'),
        kind: 'error',
        subtitle: getErrorMessage(fetchError, t('orderSetLoadFailed', 'Failed to load order set.')),
        isLowContrast: true,
      });
    }
  };

  const handleRetire = async (orderSetUuid: string) => {
    const existing = orderSets.find((item) => item.uuid === orderSetUuid);
    if (!existing || existing.retired) {
      return;
    }

    try {
      await retireOrderSet(orderSetUuid, t('retiredFromAdmin', 'Retired from orders admin'));
      await revalidateOrderSets();
      showSnackbar({
        title: t('success', 'Success'),
        kind: 'success',
        subtitle: t('orderSetRetired', 'Order set retired.'),
        isLowContrast: true,
      });
    } catch (retireError) {
      showSnackbar({
        title: t('error', 'Error'),
        kind: 'error',
        subtitle: getErrorMessage(retireError, t('orderSetRetireFailed', 'Failed to retire order set.')),
        isLowContrast: true,
      });
    }
  };

  if (isLoading) {
    return <DataTableSkeleton columnCount={headers.length} rowCount={5} />;
  }

  if (error) {
    return <p>{t('errorLoadingOrderSets', 'Error loading order sets')}</p>;
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <Toggle
          id="include-retired-order-sets"
          labelText={t('includeRetired', 'Include retired')}
          size="sm"
          toggled={includeRetired}
          onToggle={(checked) => setIncludeRetired(checked)}
        />
        <Button kind="primary" renderIcon={Add} size={buttonSize} onClick={openCreateWorkspace}>
          {t('addOrderSet', 'Add order set')}
        </Button>
      </div>

      {orderSets.length === 0 ? (
        <p>{t('noOrderSets', 'No order sets found')}</p>
      ) : (
        <DataTable headers={headers} rows={rows} size={buttonSize}>
          {({ rows: tableRows, headers: tableHeaders, getTableProps, getHeaderProps, getRowProps }) => (
            <TableContainer title={t('orderSets', 'Order sets')} className={styles.tableContainer}>
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
                    const orderSet = orderSets.find((item) => item.uuid === row.id);
                    return (
                      <TableRow {...getRowProps({ row })} key={row.id}>
                        {row.cells.map((cell) =>
                          cell.info.header === 'actions' ? (
                            <TableCell key={cell.id}>
                              <div className={styles.actions}>
                                <Button kind="ghost" size={buttonSize} onClick={() => openEditWorkspace(cell.value)}>
                                  {t('edit', 'Edit')}
                                </Button>
                                {!orderSet?.retired ? (
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

export default OrderSetsTable;
