import React, { useEffect, useState } from 'react';
import {
  Button,
  DataTable,
  DataTableSkeleton,
  Dropdown,
  InlineLoading,
  OverflowMenu,
  OverflowMenuItem,
  Pagination,
  Search,
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
} from '@carbon/react';
import { UserFollow } from '@carbon/react/icons';
import {
  ErrorState,
  useConfig,
  useLayoutType,
  launchWorkspace,
  WorkspaceContainer,
  isDesktop,
  useDebounce,
} from '@openmrs/esm-framework';
import { CardHeader } from '@openmrs/esm-patient-common-lib';
import { useTranslation } from 'react-i18next';
import EmptyState from '../../../empty-state/empty-state-log.components';
import { useSystemUserRoleConfigSetting } from '../../../hook/useSystemRoleSetting';
import { type LicenseFilter, useAdminUsers } from './user-list.resource';
import styles from './user-list.scss';
import { ConfigObject } from '../../../../config-schema';
import { formatDateTime } from '../../../../utils/utils';
import UserDetails from '../user-details/user-details.component';
import upperCase from 'lodash-es/upperCase';

type FilterType = LicenseFilter;

const getCardTitle = (filterName: FilterType): string => {
  const filterMap: Record<FilterType, string> = {
    allUsers: 'List of all users',
    activeLicensed: 'List of active licensed users',
    expiredLicensed: 'List of expired licensed users',
    licensedExpiringSoon: 'List of licensed expiring soon users',
    unlicensed: 'List of unlicensed users',
  };
  return filterMap[filterName] || 'List of users';
};

const PAGE_SIZES = [10, 20, 50, 100];

type WithAttributes = { attributes?: Array<{ attributeType?: { uuid: string }; value?: unknown }> };

const findAttributeValue = (provider: WithAttributes | undefined, typeUuid: string) =>
  provider?.attributes?.find((attr) => attr?.attributeType?.uuid === typeUuid)?.value;

const UserList: React.FC = () => {
  const { t } = useTranslation();
  const layout = useLayoutType();
  const responsiveSize = isDesktop(layout) ? 'sm' : 'lg';
  const {
    licenseNumberUuid,
    licenseExpiryDateUuid,
    providerNationalIdUuid,
    providerUniqueIdentifierAttributeTypeUuid,
  } = useConfig<ConfigObject>();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 400);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('allUsers');
  const isLicenseFilter = selectedFilter !== 'allUsers';

  const { error } = useSystemUserRoleConfigSetting();

  // One request per page: users come with their provider, and search + license filters run on the server.
  const {
    users: pageUsers,
    totalCount,
    isLoading: isLoadingUsers,
    isValidating,
    error: usersError,
  } = useAdminUsers({
    searchTerm: debouncedSearch,
    licenseStatus: selectedFilter,
    page,
    pageSize,
    licenseAttributeTypes: {
      licenseNumber: licenseNumberUuid,
      licenseExpiry: licenseExpiryDateUuid,
      nationalId: providerNationalIdUuid,
    },
  });

  const resetToFirstPage = () => setPage(1);

  // The REST API rejects a startIndex past the last record (e.g. after users were retired); go back to page 1.
  useEffect(() => {
    if (usersError && page > 1) {
      setPage(1);
    }
  }, [usersError, page]);

  if (error || usersError) {
    return <ErrorState error={error || usersError} headerTitle={t('usersManagement', 'Users management')} />;
  }

  const headerData = [
    {
      key: 'systemId',
      header: t('systemId', 'System ID'),
    },
    {
      key: 'names',
      header: t('names', 'Names'),
    },
    {
      key: 'licenseNumber',
      header: t('licenseNumber', 'License Number'),
    },
    {
      key: 'providerUniqueIdentifier',
      header: t('providerUniqueIdentifier', 'Provider Unique Identifier'),
    },
    {
      key: 'licenseExpiryDate',
      header: t('licenseExpiryDate', 'License Expiry Date'),
    },
    {
      key: 'actions',
      header: t('actions', 'Actions'),
    },
  ];

  const rowData = pageUsers.map((user) => {
    const userProvider = user.provider ?? undefined;
    const attributeValue = (attributeTypeUuid: string) => {
      const value = findAttributeValue(userProvider, attributeTypeUuid);
      return value ? String(value) : '--';
    };
    const licenseExpiryDate = attributeValue(licenseExpiryDateUuid);

    return {
      id: user.uuid,
      systemId: user.systemId,
      names: upperCase(user.person?.display),
      licenseNumber: attributeValue(licenseNumberUuid),
      licenseExpiryDate: licenseExpiryDate === '--' ? licenseExpiryDate : formatDateTime(licenseExpiryDate),
      providerUniqueIdentifier: attributeValue(providerUniqueIdentifierAttributeTypeUuid),
      userProvider,
      user,
      actions: (
        <OverflowMenu className={styles.btnSet} flipped={true} aria-label="user-management-menu">
          <OverflowMenuItem
            className={styles.btn}
            onClick={() =>
              launchWorkspace('manage-user-workspace', {
                workspaceTitle: t('editUser', 'Edit User'),
                initialUserValue: user,
                initialProvider: userProvider,
              })
            }
            itemText={t('editUser', 'Edit user')}
          />
          <OverflowMenuItem
            className={styles.btn}
            onClick={() =>
              launchWorkspace('user-login-locations-workspace', {
                workspaceTitle: t('manageLoginLocations', 'Manage login locations'),
                user,
              })
            }
            itemText={t('manageLoginLocations', 'Manage login locations')}
          />
        </OverflowMenu>
      ),
    };
  });

  const filterItems: Array<{ id: FilterType; label: string }> = [
    { id: 'allUsers', label: t('All users', 'All users') },
    { id: 'activeLicensed', label: t('Active Licensed', 'Active Licensed') },
    { id: 'expiredLicensed', label: t('Expired Licensed', 'Expired Licensed') },
    { id: 'licensedExpiringSoon', label: t('Licensed expiring soon', 'Licensed expiring soon') },
    { id: 'unlicensed', label: t('Unlicensed', 'Unlicensed') },
  ];

  const isFirstLoad = isLoadingUsers && pageUsers.length === 0;
  const isRefreshing = !isFirstLoad && isValidating;

  return (
    <>
      <div>
        <div className={styles.Container}>
          <div className={styles.buttonContainer}>
            <p className={styles.filterByText}>{t('filterBy', 'Filter by:')}</p>
            <Dropdown
              hideLabel={true}
              titleText={t('filter', 'Filter')}
              id="filter-dropdown"
              label={t('filter', 'Filter')}
              className={styles.dropDownFilter}
              items={filterItems}
              itemToString={(item) => (item ? item.label : '')}
              onChange={({ selectedItem }) => {
                setSelectedFilter(selectedItem.id as FilterType);
                resetToFirstPage();
              }}
              selectedItem={filterItems.find((item) => item.id === selectedFilter)}
              size={isDesktop(layout) ? 'lg' : 'sm'}
            />
            <Button
              onClick={() => launchWorkspace('manage-user-workspace', { workspaceTitle: t('addUser', 'Add user') })}
              className={styles.userManagementModeButton}
              renderIcon={UserFollow}
              size={isDesktop(layout) ? 'lg' : 'sm'}
              kind="primary">
              {t('addUser', 'Add User')}
            </Button>
          </div>

          <div className={styles.providerContainer}>
            <CardHeader title={`${t(getCardTitle(selectedFilter))} (${isFirstLoad ? '…' : totalCount})`}>
              {isRefreshing ? <InlineLoading description={t('loading', 'Loading...')} /> : <span />}
            </CardHeader>
            <Search
              labelText=""
              placeholder={t('searchForUsers', 'Search by name, username or system ID')}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                resetToFirstPage();
              }}
              size={isDesktop(layout) ? 'sm' : 'lg'}
              value={searchQuery}
            />

            {isFirstLoad ? (
              <DataTableSkeleton role="progressbar" showHeader={false} showToolbar={false} />
            ) : totalCount === 0 ? (
              <EmptyState
                subTitle={
                  debouncedSearch || isLicenseFilter
                    ? t('noMatchingUsers', 'No matching users found')
                    : t('noUsersAvailable', 'No users available')
                }
              />
            ) : (
              <>
                <DataTable rows={rowData} headers={headerData} size={responsiveSize} useZebraStyles>
                  {({
                    rows,
                    headers,
                    getExpandHeaderProps,
                    getTableProps,
                    getTableContainerProps,
                    getHeaderProps,
                    getRowProps,
                  }) => (
                    <TableContainer {...getTableContainerProps()}>
                      <Table className={styles.table} {...getTableProps()} aria-label="Provider list">
                        <TableHead>
                          <TableRow>
                            <TableExpandHeader enableToggle {...getExpandHeaderProps()} />
                            {headers.map((header, i) => (
                              <TableHeader key={i} {...getHeaderProps({ header })}>
                                {header.header}
                              </TableHeader>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {rows.map((row) => {
                            const source = rowData.find((item) => item.id === row.id);
                            return (
                              <React.Fragment key={row.id}>
                                <TableExpandRow {...getRowProps({ row })}>
                                  {row.cells.map((cell) => (
                                    <TableCell key={cell.id}>{cell.value}</TableCell>
                                  ))}
                                </TableExpandRow>
                                {row.isExpanded ? (
                                  <TableExpandedRow className={styles.expandedRow} colSpan={headers.length + 1}>
                                    <div className={styles.container}>
                                      <UserDetails provider={source?.userProvider} user={source?.user} />
                                    </div>
                                  </TableExpandedRow>
                                ) : (
                                  <TableExpandedRow className={styles.hiddenRow} colSpan={headers.length + 2} />
                                )}
                              </React.Fragment>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </DataTable>
                <Pagination
                  forwardText={t('nextPage', 'Next page')}
                  backwardText={t('previousPage', 'Previous page')}
                  page={page}
                  pageSize={pageSize}
                  pageSizes={PAGE_SIZES}
                  totalItems={totalCount}
                  className={styles.pagination}
                  size={responsiveSize}
                  onChange={({ page: newPage, pageSize: newPageSize }) => {
                    if (newPageSize !== pageSize) {
                      setPageSize(newPageSize);
                      setPage(1);
                    } else {
                      setPage(newPage);
                    }
                  }}
                />
              </>
            )}
          </div>
        </div>
      </div>
      <WorkspaceContainer overlay contextKey="admin" />
    </>
  );
};

export default UserList;
