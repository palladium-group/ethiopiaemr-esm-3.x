import React, { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import {
  Button,
  DataTable,
  DataTableSkeleton,
  OverflowMenu,
  OverflowMenuItem,
  Search,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from '@carbon/react';
import {
  formatDate,
  launchWorkspace,
  showModal,
  showSnackbar,
  useDebounce,
  useLayoutType,
  userHasAccess,
  UserHasAccess,
  useSession,
} from '@openmrs/esm-framework';
import { CardHeader, ErrorState } from '@openmrs/esm-patient-common-lib';
import BillingHeader from '../../billing-header/billing-header.component';
import { Permissions } from '../../permission/permissions.constants';
import { type Organization } from '../../types';
import { unescapeHtml } from '../billable-exemption/exemption-rules.utils';
import {
  getErrorMessage,
  mutateCreditCompanies,
  parseContractDate,
  restoreCreditCompany,
  useCreditCompanies,
} from './credit-company.resource';
import styles from './credit-companies-dashboard.scss';

const CreditCompaniesDashboard: React.FC = () => {
  const { t } = useTranslation();
  const size = useLayoutType() === 'tablet' ? 'md' : 'sm';
  const session = useSession();
  const { creditCompanies, isLoading, error } = useCreditCompanies();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const filteredCompanies = useMemo(() => {
    const term = debouncedSearchTerm.trim().toLowerCase();
    return creditCompanies.filter((company) =>
      [company.name, company.tin, company.contractNumber].some(
        (value) => value && unescapeHtml(value).toLowerCase().includes(term),
      ),
    );
  }, [creditCompanies, debouncedSearchTerm]);

  const launchCreditCompanyWorkspace = (creditCompany?: Organization) =>
    launchWorkspace('credit-company-workspace', {
      workspaceTitle: creditCompany
        ? t('editCreditCompany', 'Edit Credit Company')
        : t('addCreditCompany', 'Add Credit Company'),
      initialCreditCompany: creditCompany,
    });

  const showRetireCreditCompanyModal = (creditCompany: Organization) => {
    const dispose = showModal('retire-credit-company-modal', {
      closeModal: () => dispose(),
      creditCompany,
    });
  };

  const handleRestore = async (creditCompany: Organization) => {
    try {
      await restoreCreditCompany(creditCompany.uuid);
      showSnackbar({
        title: t('creditCompanyRestored', 'Credit company restored'),
        subtitle: t('creditCompanyRestoredSubtitle', '{{name}} is available again at MRU', {
          name: unescapeHtml(creditCompany.name),
          interpolation: { escapeValue: false },
        }),
        kind: 'success',
        isLowContrast: true,
      });
      mutateCreditCompanies();
    } catch (error) {
      showSnackbar({
        title: t('creditCompanyRestoreFailed', 'Could not restore credit company'),
        subtitle: getErrorMessage(error),
        kind: 'error',
        isLowContrast: true,
      });
    }
  };

  if (isLoading) {
    return <DataTableSkeleton role="progressbar" />;
  }

  if (error) {
    return <ErrorState headerTitle={t('creditCompanies', 'Credit Companies')} error={error} />;
  }

  const headers = [
    { key: 'name', header: t('name', 'Name') },
    { key: 'phone', header: t('phone', 'Phone') },
    { key: 'contractNumber', header: t('contractNumber', 'Contract number') },
    { key: 'contractEnds', header: t('contractEnds', 'Contract ends') },
    { key: 'status', header: t('status', 'Status') },
  ];

  const today = dayjs().startOf('day');

  const rows = filteredCompanies.map((company) => {
    const contractEndDate = parseContractDate(company.contractEndDate);
    return {
      id: company.uuid,
      name: unescapeHtml(company.name),
      phone: company.phone ? unescapeHtml(company.phone) : '--',
      contractNumber: company.contractNumber ? unescapeHtml(company.contractNumber) : '--',
      contractEnds: contractEndDate ? (
        <span className={styles.contractEnds}>
          {formatDate(contractEndDate, { mode: 'standard', time: false, noToday: true })}
          {dayjs(contractEndDate).isBefore(today) && (
            <Tag type="red" size="sm">
              {t('expired', 'Expired')}
            </Tag>
          )}
        </span>
      ) : (
        '--'
      ),
      status: company.retired ? (
        <Tag type="gray" size="sm">
          {t('retired', 'Retired')}
        </Tag>
      ) : (
        <Tag type="green" size="sm">
          {t('active', 'Active')}
        </Tag>
      ),
    };
  });

  return (
    <div>
      <BillingHeader title={t('creditCompanies', 'Credit Companies')} />
      <CardHeader title={t('creditCompanies', 'Credit Companies')}>
        <UserHasAccess privilege={Permissions.AddPaymentMode}>
          <Button className={styles.addButton} size={size} kind="ghost" onClick={() => launchCreditCompanyWorkspace()}>
            {t('addCreditCompany', 'Add Credit Company')}
          </Button>
        </UserHasAccess>
      </CardHeader>
      {creditCompanies.length === 0 ? (
        <p className={styles.emptyState}>
          {t('noCreditCompanies', 'No credit companies yet. Add the companies this facility gives credit to.')}
        </p>
      ) : (
        <div className={styles.dataTable}>
          <Search
            size={size}
            placeholder={t('searchCreditCompanies', 'Search credit companies')}
            labelText={t('searchLabel', 'Search')}
            closeButtonLabelText={t('clearSearch', 'Clear search input')}
            id="credit-company-search"
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <DataTable useZebraStyles size={size} rows={rows} headers={headers}>
            {({ rows, headers, getHeaderProps, getRowProps, getTableProps }) => (
              <TableContainer>
                <Table {...getTableProps()} aria-label={t('creditCompanies', 'Credit Companies')}>
                  <TableHead>
                    <TableRow>
                      {headers.map((header) => (
                        <TableHeader key={header.key} {...getHeaderProps({ header })}>
                          {header.header}
                        </TableHeader>
                      ))}
                      <TableHeader aria-label={t('actions', 'Actions')} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row) => {
                      const company = filteredCompanies.find((c) => c.uuid === row.id);
                      return (
                        <TableRow key={row.id} {...getRowProps({ row })}>
                          {row.cells.map((cell) => (
                            <TableCell key={cell.id}>{cell.value}</TableCell>
                          ))}
                          <TableCell className="cds--table-column-menu">
                            <OverflowMenu size={size} iconDescription={t('actions', 'Actions')} flipped>
                              <OverflowMenuItem
                                disabled={company.retired || !userHasAccess(Permissions.EditPaymentMode, session?.user)}
                                onClick={() => launchCreditCompanyWorkspace(company)}
                                itemText={t('edit', 'Edit')}
                              />
                              {company.retired ? (
                                <OverflowMenuItem
                                  disabled={!userHasAccess(Permissions.DeletePaymentMode, session?.user)}
                                  onClick={() => handleRestore(company)}
                                  itemText={t('restore', 'Restore')}
                                />
                              ) : (
                                <OverflowMenuItem
                                  hasDivider
                                  isDelete
                                  disabled={!userHasAccess(Permissions.DeletePaymentMode, session?.user)}
                                  onClick={() => showRetireCreditCompanyModal(company)}
                                  itemText={t('retire', 'Retire')}
                                />
                              )}
                            </OverflowMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DataTable>
        </div>
      )}
    </div>
  );
};

export default CreditCompaniesDashboard;
