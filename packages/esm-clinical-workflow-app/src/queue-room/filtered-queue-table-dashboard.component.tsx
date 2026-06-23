import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DataTableSkeleton, Dropdown, Layer, Search } from '@carbon/react';
import { isDesktop, showSnackbar, useLayoutType, useSession } from '@openmrs/esm-framework';
import {
  ALL_ROOMS_FILTER,
  filterQueueEntriesByRoom,
  UNASSIGNED_ROOM_FILTER,
  useActiveTicketAssignments,
  useQueueRoomsAtLocation,
  useServiceQueuesConfig,
} from './queue-room.resource';
import {
  getSelectedServiceUuidFromSession,
  useQueueEntries,
  useQueueLocations,
  useQueueStatuses,
} from './queue-entries.resource';
import FilteredQueueTable, { filterQueueEntriesBySearch } from './filtered-queue-table.component';
import { useFilteredQueueTableColumnIds } from './filtered-queue-table-cells';
import { useAppendExtensionToSlotEnd } from './use-append-extension-to-slot-end';
import styles from './filtered-queue-table-dashboard.scss';

interface LocationOption {
  id: string;
  name: string;
}

interface RoomFilterOption {
  id: string;
  name: string;
}

/**
 * Duplicate of the default service queue table with independent location and room filters.
 * Rendered in service-queues-dashboard-slot below the original table.
 */
const FilteredQueueTableDashboard: React.FC = () => {
  const { t } = useTranslation();
  const layout = useLayoutType();
  const slotEndRef = useAppendExtensionToSlotEnd();

  return (
    <div ref={slotEndRef} className={styles.filteredQueueTableDashboard}>
      <Layer className={styles.tableSection}>
        <div className={styles.headerContainer}>
          <div className={!isDesktop(layout) ? styles.tabletHeading : styles.desktopHeading}>
            <h4>{t('filteredQueueTableTitle', 'Queue by location and room')}</h4>
          </div>
        </div>
        <FilteredQueueTableSection />
      </Layer>
    </div>
  );
};

function FilteredQueueTableSection() {
  const { t } = useTranslation();
  const layout = useLayoutType();
  const userSession = useSession();
  const columnIds = useFilteredQueueTableColumnIds();
  const { visitQueueNumberAttributeUuid } = useServiceQueuesConfig();
  const { queueLocations, isLoading: isLoadingLocations } = useQueueLocations();
  const { activeTickets } = useActiveTicketAssignments();

  const [selectedLocation, setSelectedLocation] = useState<LocationOption | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<RoomFilterOption | null>(null);
  const [selectedStatusUuid, setSelectedStatusUuid] = useState<string | undefined>(undefined);
  const [selectedStatusDisplay, setSelectedStatusDisplay] = useState<string | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');

  const locationOptions = useMemo<LocationOption[]>(() => {
    return queueLocations.map((location) => ({ id: location.id, name: location.name }));
  }, [queueLocations]);

  const { queueRooms, isLoading: isLoadingRooms } = useQueueRoomsAtLocation(selectedLocation?.id);

  const roomFilterOptions = useMemo<RoomFilterOption[]>(() => {
    const roomItems = queueRooms.map((room) => ({ id: room.name, name: room.name }));
    return [
      { id: ALL_ROOMS_FILTER, name: t('all', 'All') },
      ...roomItems,
      { id: UNASSIGNED_ROOM_FILTER, name: t('unassigned', 'Unassigned') },
    ];
  }, [queueRooms, t]);

  useEffect(() => {
    if (isLoadingLocations || selectedLocation || locationOptions.length === 0) {
      return;
    }

    const sessionLocationUuid = userSession?.sessionLocation?.uuid;
    const sessionLocation = locationOptions.find((location) => location.id === sessionLocationUuid);
    setSelectedLocation(sessionLocation ?? locationOptions[0]);
  }, [isLoadingLocations, locationOptions, selectedLocation, userSession?.sessionLocation?.uuid]);

  useEffect(() => {
    setSelectedRoom({ id: ALL_ROOMS_FILTER, name: t('all', 'All') });
  }, [selectedLocation?.id, t]);

  const searchCriteria = useMemo(() => {
    return {
      service: getSelectedServiceUuidFromSession(),
      location: selectedLocation?.id,
      isEnded: false,
      status: selectedStatusUuid,
    };
  }, [selectedLocation?.id, selectedStatusUuid]);

  const { queueEntries, isLoading, error, isValidating } = useQueueEntries(
    selectedLocation ? searchCriteria : undefined,
  );

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('queue-entry-updated'));
  }, []);

  useEffect(() => {
    if (error?.message) {
      showSnackbar({
        title: t('errorLoadingQueueEntries', 'Error loading queue entries'),
        kind: 'error',
        subtitle: error?.message,
      });
    }
  }, [error?.message, t]);

  const filteredByRoom = useMemo(() => {
    return filterQueueEntriesByRoom(queueEntries ?? [], selectedRoom?.id, visitQueueNumberAttributeUuid, activeTickets);
  }, [activeTickets, queueEntries, selectedRoom?.id, visitQueueNumberAttributeUuid]);

  const filteredQueueEntries = useMemo(() => {
    return filterQueueEntriesBySearch(filteredByRoom, searchTerm, columnIds, visitQueueNumberAttributeUuid);
  }, [columnIds, filteredByRoom, searchTerm, visitQueueNumberAttributeUuid]);

  const paginationResetKey = useMemo(
    () =>
      JSON.stringify({
        searchCriteria,
        selectedRoomId: selectedRoom?.id,
        searchTerm,
      }),
    [searchCriteria, selectedRoom?.id, searchTerm],
  );

  const handleLocationChange = useCallback(({ selectedItem }: { selectedItem: LocationOption }) => {
    setSelectedLocation(selectedItem);
  }, []);

  const handleRoomChange = useCallback(({ selectedItem }: { selectedItem: RoomFilterOption }) => {
    setSelectedRoom(selectedItem);
  }, []);

  if (!selectedLocation || isLoading || columnIds.length === 0) {
    return <DataTableSkeleton className={styles.loadingSkeleton} role="progressbar" />;
  }

  return (
    <>
      <div className={styles.filtersRow}>
        <div className={styles.filterContainer}>
          <Dropdown
            id="filtered-queue-location"
            items={locationOptions}
            itemToString={(item) => (item ? item.name : '')}
            label={selectedLocation?.name ?? t('selectLocation', 'Select location')}
            onChange={handleLocationChange}
            selectedItem={selectedLocation}
            size={isDesktop(layout) ? 'sm' : 'lg'}
            titleText={t('location', 'Location')}
            type="inline"
            disabled={isLoadingLocations || locationOptions.length === 0}
          />
        </div>
        <div className={styles.filterContainer}>
          <Dropdown
            id="filtered-queue-room"
            items={roomFilterOptions}
            itemToString={(item) => (item ? item.name : '')}
            label={selectedRoom?.name ?? t('all', 'All')}
            onChange={handleRoomChange}
            selectedItem={selectedRoom}
            size={isDesktop(layout) ? 'sm' : 'lg'}
            titleText={t('room', 'Room')}
            type="inline"
            disabled={!selectedLocation || isLoadingRooms}
          />
        </div>
        <StatusDropdownFilter
          selectedStatusDisplay={selectedStatusDisplay}
          onStatusChange={(statusUuid, statusDisplay) => {
            setSelectedStatusUuid(statusUuid);
            setSelectedStatusDisplay(statusDisplay);
          }}
        />
        <Search
          className={styles.search}
          closeButtonLabelText={t('clearSearch', 'Clear search input')}
          labelText={t('searchThisList', 'Search this list')}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder={t('searchThisList', 'Search this list')}
          size={isDesktop(layout) ? 'sm' : 'lg'}
        />
      </div>
      <FilteredQueueTable
        isLoading={isLoading}
        isValidating={isValidating}
        paginationResetKey={paginationResetKey}
        queueEntries={filteredQueueEntries}
      />
    </>
  );
}

interface StatusDropdownFilterProps {
  selectedStatusDisplay?: string;
  onStatusChange: (statusUuid: string | undefined, statusDisplay: string | undefined) => void;
}

function StatusDropdownFilter({ selectedStatusDisplay, onStatusChange }: StatusDropdownFilterProps) {
  const { t } = useTranslation();
  const layout = useLayoutType();
  const { statuses } = useQueueStatuses();

  const handleStatusChange = ({ selectedItem }: { selectedItem: { uuid?: string; display: string } }) => {
    onStatusChange(selectedItem.uuid, selectedItem.display);
  };

  return (
    <div className={styles.filterContainer}>
      <Dropdown
        id="filtered-queue-status"
        items={[{ display: t('any', 'Any') }, ...(statuses ?? [])]}
        itemToString={(item) => (item ? item.display : '')}
        label={selectedStatusDisplay ?? t('all', 'All')}
        onChange={handleStatusChange}
        size={isDesktop(layout) ? 'sm' : 'lg'}
        titleText={t('showPatientsWithStatus', 'Show patients with status:')}
        type="inline"
      />
    </div>
  );
}

export default FilteredQueueTableDashboard;
