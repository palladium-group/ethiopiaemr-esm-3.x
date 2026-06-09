import React, { useMemo } from 'react';
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
} from '@carbon/react';
import { launchWorkspace, useLayoutType } from '@openmrs/esm-framework';
import { useAppointmentServices } from '../api/appointment-service.resource';
import { APPOINTMENT_SERVICE_ADMIN_WORKSPACE } from '../constants';
import type { AppointmentService } from '../types';
import styles from './appointment-services-table.scss';

function getWeeklyBlockCount(service: AppointmentService): number {
  return service.weeklyAvailability?.length ?? 0;
}

const AppointmentServicesTable: React.FC = () => {
  const { t } = useTranslation();
  const layout = useLayoutType();
  const { appointmentServices, isLoading, error } = useAppointmentServices();
  const buttonSize = layout === 'tablet' ? 'md' : 'sm';

  const headers = useMemo(
    () => [
      { key: 'name', header: t('serviceName', 'Service name') },
      { key: 'maxAppointmentsLimit', header: t('maxAppointmentsLimit', 'Max appointments') },
      { key: 'weeklyBlocks', header: t('weeklyBlocks', 'Weekly blocks') },
      { key: 'actions', header: t('actions', 'Actions') },
    ],
    [t],
  );

  const rows = useMemo(
    () =>
      appointmentServices.map((service) => {
        const weeklyBlockCount = getWeeklyBlockCount(service);
        return {
          id: service.uuid,
          name: service.name,
          maxAppointmentsLimit:
            service.maxAppointmentsLimit != null ? String(service.maxAppointmentsLimit) : t('notSet', 'Not set'),
          weeklyBlocks:
            weeklyBlockCount > 0
              ? t('weeklyBlocksCount', '{{count}} block(s)', { count: weeklyBlockCount })
              : t('notConfigured', 'Not configured'),
          actions: service.uuid,
        };
      }),
    [appointmentServices, t],
  );

  const handleConfigure = (serviceUuid: string) => {
    const service = appointmentServices.find((item) => item.uuid === serviceUuid);
    if (!service) {
      return;
    }

    launchWorkspace(APPOINTMENT_SERVICE_ADMIN_WORKSPACE, {
      workspaceTitle: t('configureServiceTitle', 'Configure {{serviceName}}', { serviceName: service.name }),
      appointmentService: service,
    });
  };

  if (isLoading) {
    return <DataTableSkeleton columnCount={headers.length} rowCount={5} />;
  }

  if (error) {
    return <p>{t('errorLoadingServices', 'Error loading appointment services')}</p>;
  }

  if (appointmentServices.length === 0) {
    return <p>{t('noAppointmentServices', 'No appointment services found')}</p>;
  }

  return (
    <DataTable headers={headers} rows={rows} size={buttonSize}>
      {({ rows: tableRows, headers: tableHeaders, getTableProps, getHeaderProps, getRowProps }) => (
        <TableContainer title={t('appointmentServices', 'Appointment services')} className={styles.tableContainer}>
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
              {tableRows.map((row) => (
                <TableRow {...getRowProps({ row })} key={row.id}>
                  {row.cells.map((cell) =>
                    cell.info.header === 'actions' ? (
                      <TableCell key={cell.id}>
                        <Button
                          className={styles.configureButton}
                          kind="ghost"
                          size={buttonSize}
                          onClick={() => handleConfigure(cell.value)}>
                          {t('configure', 'Configure')}
                        </Button>
                      </TableCell>
                    ) : (
                      <TableCell key={cell.id}>{cell.value}</TableCell>
                    ),
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </DataTable>
  );
};

export default AppointmentServicesTable;
