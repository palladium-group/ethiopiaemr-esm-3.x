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
import {
  UserHasAccess,
  formatDatetime,
  launchWorkspace,
  parseDate,
  showModal,
  showSnackbar,
  useLayoutType,
} from '@openmrs/esm-framework';
import { RADIOLOGY_PRIVILEGES } from '../../constants/radiology-privileges';
import {
  getErrorMessage,
  getRadiologyReportTemplate,
  revalidateRadiologyReportTemplates,
  unvoidRadiologyReportTemplate,
  useRadiologyReportTemplates,
} from '../api/report-template.resource';
import { RADIOLOGY_TEMPLATE_ADMIN_WORKSPACE } from '../constants';
import styles from './templates-table.scss';

function formatOptionalDate(value?: string) {
  if (!value) {
    return '—';
  }

  try {
    return formatDatetime(parseDate(value), { noToday: true });
  } catch {
    return value;
  }
}

const RadiologyTemplatesTable: React.FC = () => {
  const { t } = useTranslation();
  const layout = useLayoutType();
  const buttonSize = layout === 'tablet' ? 'md' : 'sm';
  const [includeVoided, setIncludeVoided] = useState(false);
  const { templates, isLoading, error } = useRadiologyReportTemplates(includeVoided);

  const headers = useMemo(
    () => [
      { key: 'name', header: t('templateName', 'Template name') },
      { key: 'dateCreated', header: t('dateCreated', 'Created') },
      { key: 'dateChanged', header: t('dateChanged', 'Changed') },
      { key: 'status', header: t('status', 'Status') },
      { key: 'actions', header: t('actions', 'Actions') },
    ],
    [t],
  );

  const rows = useMemo(
    () =>
      templates.map((template) => ({
        id: template.uuid,
        name: template.name,
        dateCreated: formatOptionalDate(template.dateCreated),
        dateChanged: formatOptionalDate(template.dateChanged),
        status: template.voided ? t('voided', 'Voided') : t('active', 'Active'),
        actions: template.uuid,
      })),
    [templates, t],
  );

  const openCreateWorkspace = () => {
    launchWorkspace(RADIOLOGY_TEMPLATE_ADMIN_WORKSPACE, {
      workspaceTitle: t('createReportTemplate', 'Create report template'),
    });
  };

  const openEditWorkspace = async (templateUuid: string) => {
    const existing = templates.find((item) => item.uuid === templateUuid);
    if (!existing) {
      return;
    }

    try {
      const response = await getRadiologyReportTemplate(templateUuid);
      launchWorkspace(RADIOLOGY_TEMPLATE_ADMIN_WORKSPACE, {
        workspaceTitle: t('editReportTemplate', 'Edit {{templateName}}', { templateName: existing.name }),
        template: response.data,
      });
    } catch (fetchError) {
      showSnackbar({
        title: t('error', 'Error'),
        kind: 'error',
        subtitle: getErrorMessage(fetchError, t('templateLoadFailed', 'Failed to load report template.')),
        isLowContrast: true,
      });
    }
  };

  const handleVoid = (templateUuid: string) => {
    const existing = templates.find((item) => item.uuid === templateUuid);
    if (!existing || existing.voided) {
      return;
    }

    const dispose = showModal('void-template-modal', {
      templateUuid,
      templateName: existing.name,
      closeModal: () => dispose(),
    });
  };

  const handleRestore = async (templateUuid: string) => {
    const existing = templates.find((item) => item.uuid === templateUuid);
    if (!existing || !existing.voided) {
      return;
    }

    try {
      await unvoidRadiologyReportTemplate(templateUuid);
      await revalidateRadiologyReportTemplates();
      showSnackbar({
        title: t('success', 'Success'),
        kind: 'success',
        subtitle: t('templateRestored', 'Report template restored. It is available for selection again.'),
        isLowContrast: true,
      });
    } catch (restoreError) {
      showSnackbar({
        title: t('error', 'Error'),
        kind: 'error',
        subtitle: getErrorMessage(restoreError, t('templateRestoreFailed', 'Failed to restore report template.')),
        isLowContrast: true,
      });
    }
  };

  if (isLoading) {
    return <DataTableSkeleton columnCount={headers.length} rowCount={5} />;
  }

  if (error) {
    return <p>{t('errorLoadingTemplates', 'Error loading report templates')}</p>;
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <Toggle
          id="include-voided-report-templates"
          labelText={t('includeVoided', 'Include voided')}
          size="sm"
          toggled={includeVoided}
          onToggle={(checked) => setIncludeVoided(checked)}
        />
        <UserHasAccess privilege={RADIOLOGY_PRIVILEGES.MANAGE_REPORT_TEMPLATES}>
          <Button kind="primary" renderIcon={Add} size={buttonSize} onClick={openCreateWorkspace}>
            {t('addTemplate', 'Add template')}
          </Button>
        </UserHasAccess>
      </div>

      {templates.length === 0 ? (
        <p>{t('noReportTemplates', 'No report templates found')}</p>
      ) : (
        <DataTable headers={headers} rows={rows} size={buttonSize}>
          {({ rows: tableRows, headers: tableHeaders, getTableProps, getHeaderProps, getRowProps }) => (
            <TableContainer title={t('reportTemplates', 'Report templates')} className={styles.tableContainer}>
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
                    const template = templates.find((item) => item.uuid === row.id);
                    return (
                      <TableRow {...getRowProps({ row })} key={row.id}>
                        {row.cells.map((cell) =>
                          cell.info.header === 'actions' ? (
                            <TableCell key={cell.id}>
                              <UserHasAccess privilege={RADIOLOGY_PRIVILEGES.MANAGE_REPORT_TEMPLATES}>
                                <div className={styles.actions}>
                                  <Button kind="ghost" size={buttonSize} onClick={() => openEditWorkspace(cell.value)}>
                                    {t('edit', 'Edit')}
                                  </Button>
                                  {!template?.voided ? (
                                    <Button
                                      kind="danger--ghost"
                                      size={buttonSize}
                                      onClick={() => handleVoid(cell.value)}>
                                      {t('void', 'Void')}
                                    </Button>
                                  ) : (
                                    <Button kind="ghost" size={buttonSize} onClick={() => handleRestore(cell.value)}>
                                      {t('restore', 'Restore')}
                                    </Button>
                                  )}
                                </div>
                              </UserHasAccess>
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

export default RadiologyTemplatesTable;
