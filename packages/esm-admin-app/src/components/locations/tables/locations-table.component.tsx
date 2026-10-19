import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  TableHead,
  TableHeader,
  TableRow,
  Tile,
  Tag,
} from '@carbon/react';
import { Add, Upload } from '@carbon/react/icons';
import {
  ErrorState,
  WorkspaceContainer,
  isDesktop as desktopLayout,
  launchWorkspace,
  showModal,
  useDebounce,
  useLayoutType,
  useSession,
  userHasAccess,
} from '@openmrs/esm-framework';
import styles from './locations-table.scss';
import { CardHeader } from '@openmrs/esm-patient-common-lib';
import { type LocationListItem, usePagedLocations } from './locations-table.resource';
import { useLocationTags } from '../hooks/useLocationTags';
import { AdminPermissions } from '../../../permissions.constants';

const PAGE_SIZES = [10, 20, 50, 100];
const ALL_TAGS = '';

const LocationsTable: React.FC = () => {
  const { t } = useTranslation();
  const session = useSession();
  const layout = useLayoutType();
  const isTablet = layout === 'tablet';
  const isDesktop = desktopLayout(layout);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 400);
  const [selectedTag, setSelectedTag] = useState(ALL_TAGS);

  const canBulkImport = userHasAccess(AdminPermissions.ManageLocationBulkImport, session?.user);
  const { locationTagList } = useLocationTags();
  const { locations, totalCount, isLoading, isValidating, error, mutate } = usePagedLocations({
    searchTerm: debouncedSearch,
    tag: selectedTag,
    page: currentPage,
    pageSize,
  });

  // The REST API rejects a startIndex past the last record (e.g. after locations were retired); go back to page 1.
  useEffect(() => {
    if (error && currentPage > 1) {
      setCurrentPage(1);
    }
  }, [error, currentPage]);

  const tagItems = useMemo(
    () => [
      { uuid: ALL_TAGS, display: t('allLocations', 'All locations') },
      ...locationTagList.map((tag) => ({ uuid: tag.uuid, display: tag.display || tag.name })),
    ],
    [locationTagList, t],
  );

  const handleAddLocationWorkspace = () => {
    launchWorkspace('add-location-workspace', {
      workspaceTitle: t('addLocation', 'Add Location'),
    });
  };

  const handleEditLocation = (location: LocationListItem) => {
    launchWorkspace('add-location-workspace', {
      workspaceTitle: t('editLocation', 'Edit Location'),
      location,
    });
  };

  const handleSearchLocationWorkspace = () => {
    launchWorkspace('search-location-workspace', {
      workspaceTitle: t('tagLocation', 'Tag Location'),
    });
  };

  const handleImportLocations = () => {
    const dispose = showModal('location-bulk-import-modal', {
      closeModal: () => dispose(),
      mutateLocations: () => mutate(),
    });
  };

  const tableHeaders = [
    { key: 'name', header: t('locationName', 'Location Name') },
    { key: 'description', header: t('description', 'Description') },
    { key: 'parent', header: t('parentLocation', 'Parent location') },
    { key: 'tags', header: t('tags', 'Tags') },
    { key: 'actions', header: '' },
  ];

  const rows = locations.map((location) => ({
    id: location.uuid,
    name: location.name || location.display || '--',
    description: location.description || '--',
    parent: location.parentLocation?.display || '--',
    tags: location.tags?.length ? (
      <div className={styles.tagList}>
        {location.tags.map((tag) => (
          <Tag key={tag.uuid} type="blue" size="sm">
            {tag.display || tag.name}
          </Tag>
        ))}
      </div>
    ) : (
      '--'
    ),
    actions: (
      <OverflowMenu flipped aria-label={t('locationActions', 'Location actions')} size={isTablet ? 'lg' : 'sm'}>
        <OverflowMenuItem itemText={t('edit', 'Edit')} onClick={() => handleEditLocation(location)} />
      </OverflowMenu>
    ),
  }));

  if (error) {
    return <ErrorState error={error} headerTitle={t('locations', 'Locations')} />;
  }

  const isFirstLoad = isLoading && locations.length === 0;
  const hasFilters = !!debouncedSearch.trim() || selectedTag !== ALL_TAGS;

  return (
    <>
      <div className={styles.widgetCard}>
        <CardHeader title={`${t('locations', 'Locations')} (${isFirstLoad ? '…' : totalCount})`}>
          <span className={styles.backgroundDataFetchingIndicator}>
            <span>{isValidating && !isFirstLoad ? <InlineLoading /> : null}</span>
          </span>
          <div className={styles.headerActions}>
            <Button
              kind="ghost"
              renderIcon={(props) => <Add size={16} {...props} />}
              onClick={handleAddLocationWorkspace}>
              {t('addLocation', 'Add Location')}
            </Button>
            <Button
              kind="ghost"
              renderIcon={(props) => <Add size={16} {...props} />}
              onClick={handleSearchLocationWorkspace}>
              {t('tagLocation', 'Tag Location')}
            </Button>
            {canBulkImport ? (
              <Button
                kind="ghost"
                renderIcon={(props) => <Upload size={16} {...props} />}
                onClick={handleImportLocations}>
                {t('importLocations', 'Import locations')}
              </Button>
            ) : null}
          </div>
        </CardHeader>

        <div className={styles.toolbar}>
          <div className={styles.filterContainer}>
            <Search
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={t('searchLocationByName', 'Search by location name (starts with)')}
              value={searchTerm}
              labelText={t('searchLocationByName', 'Search by location name (starts with)')}
              size={isTablet ? 'lg' : 'md'}
            />
          </div>
          <Dropdown
            id="location-tag-filter"
            className={styles.tagFilter}
            titleText=""
            hideLabel
            label={t('filterByTag', 'Filter by tag')}
            items={tagItems}
            itemToString={(item) => item?.display ?? ''}
            selectedItem={tagItems.find((item) => item.uuid === selectedTag)}
            onChange={({ selectedItem }) => {
              setSelectedTag(selectedItem?.uuid ?? ALL_TAGS);
              setCurrentPage(1);
            }}
            size={isTablet ? 'lg' : 'md'}
          />
        </div>

        {isFirstLoad ? (
          <DataTableSkeleton role="progressbar" compact={isDesktop} zebra showHeader={false} showToolbar={false} />
        ) : (
          <DataTable rows={rows} headers={tableHeaders} size={isTablet ? 'lg' : 'sm'} useZebraStyles>
            {({ rows: tableRows, headers, getTableProps }) => (
              <TableContainer>
                <Table {...getTableProps()}>
                  <TableHead>
                    <TableRow>
                      {headers.map((header) => (
                        <TableHeader key={header.key}>{header.header}</TableHeader>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tableRows.map((row) => (
                      <TableRow key={row.id}>
                        {row.cells.map((cell) => (
                          <TableCell key={cell.id} className={cell.info.header === 'actions' ? styles.actionsCell : ''}>
                            {cell.value}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {tableRows.length === 0 ? (
                  <div className={styles.tileContainer}>
                    <Tile className={styles.tile}>
                      <div className={styles.tileContent}>
                        <p className={styles.content}>
                          {hasFilters
                            ? t('noMatchingLocations', 'No locations match the current search or tag filter')
                            : t('noData', 'No data to display')}
                        </p>
                        {hasFilters ? (
                          <p className={styles.helper}>{t('tryDifferentSearch', 'Try a different search term')}</p>
                        ) : null}
                      </div>
                    </Tile>
                  </div>
                ) : null}
                <Pagination
                  backwardText={t('previousPage', 'Previous page')}
                  forwardText={t('nextPage', 'Next page')}
                  page={currentPage}
                  pageSize={pageSize}
                  pageSizes={PAGE_SIZES}
                  totalItems={totalCount}
                  onChange={({ pageSize: newPageSize, page }) => {
                    if (newPageSize !== pageSize) {
                      setPageSize(newPageSize);
                      setCurrentPage(1);
                    } else {
                      setCurrentPage(page);
                    }
                  }}
                />
              </TableContainer>
            )}
          </DataTable>
        )}
      </div>
      <WorkspaceContainer contextKey="locations" />
    </>
  );
};

export default LocationsTable;
