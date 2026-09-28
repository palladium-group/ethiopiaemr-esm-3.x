import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, DataTableSkeleton, Dropdown, Layer, TableToolbarSearch } from '@carbon/react';
import { isDesktop, showModal, showSnackbar, useLayoutType, useSession } from '@openmrs/esm-framework';
import type { QueueEntry } from '../types';
import { useServiceQueueEntries } from './service-queue-entries.resource';
import ServiceQueueTable, { filterServiceQueueEntriesBySearch } from './service-queue-table.component';
import { useFilteredQueueTableColumnIds } from './filtered-queue-table-cells';
import {
  ALL_ROOMS_FILTER,
  filterQueueEntriesByRoom,
  UNASSIGNED_ROOM_FILTER,
  useActiveTicketAssignments,
  useQueueRoomsAtLocation,
  useServiceQueuesConfig,
} from './queue-room.resource';
import { useQueueLocations, useQueueStatuses } from './queue-entries.resource';
import AddPatientToQueueButton from './add-patient-to-queue-button.component';
import { updateSelectedQueueStatus, useServiceQueuesFilterState } from './service-queues-store.util';
import styles from './service-queue-table-dashboard.scss';
import tableStyles from './service-queue-table.scss';

const ALL_LOCATIONS_ID = 'all';

interface LocationOption {
  id: string;
  name: string;
}

interface RoomFilterOption {
  id: string;
  name: string;
}

function ClearQueueEntriesButton({ queueEntries }: { queueEntries: QueueEntry[] }) {
  const { t } = useTranslation();
  const layout = useLayoutType();

  const launchClearAllQueueEntriesModal = useCallback(() => {
    const dispose = showModal('clear-all-queue-entries-modal', {
      closeModal: () => dispose(),
      queueEntries,
    });
  }, [queueEntries]);

  return (
    <Button
      className={tableStyles.clearQueueButton}
      size={isDesktop(layout) ? 'sm' : 'lg'}
      kind="ghost"
      onClick={launchClearAllQueueEntriesModal}
      iconDescription={t('clearQueue', 'Clear queue')}>
      {t('clearQueue', 'Clear queue')}
    </Button>
  );
}

function LocationDropdownFilter({
  locationOptions,
  selectedLocation,
  isLoadingLocations,
  onLocationChange,
}: {
  locationOptions: LocationOption[];
  selectedLocation: LocationOption;
  isLoadingLocations: boolean;
  onLocationChange: (location: LocationOption) => void;
}) {
  const { t } = useTranslation();
  const layout = useLayoutType();
  const currentItem = locationOptions.find((item) => item.id === selectedLocation.id) ?? selectedLocation;

  return (
    <div className={tableStyles.filterContainer}>
      <Dropdown
        id="service-queue-location"
        items={locationOptions}
        itemToString={(item) => (item ? item.name : '')}
        label={currentItem.name}
        selectedItem={currentItem}
        onChange={({ selectedItem }) => selectedItem && onLocationChange(selectedItem)}
        size={isDesktop(layout) ? 'sm' : 'lg'}
        titleText={t('location', 'Location')}
        type="inline"
        disabled={isLoadingLocations || locationOptions.length === 0}
      />
    </div>
  );
}

function RoomDropdownFilter({
  roomFilterOptions,
  selectedRoom,
  isLoadingRooms,
  onRoomChange,
}: {
  roomFilterOptions: RoomFilterOption[];
  selectedRoom: RoomFilterOption;
  isLoadingRooms: boolean;
  onRoomChange: (room: RoomFilterOption) => void;
}) {
  const { t } = useTranslation();
  const layout = useLayoutType();

  return (
    <div className={tableStyles.filterContainer}>
      <Dropdown
        id="service-queue-room"
        items={roomFilterOptions}
        itemToString={(item) => (item ? item.name : '')}
        label={selectedRoom.name}
        selectedItem={selectedRoom}
        onChange={({ selectedItem }) => selectedItem && onRoomChange(selectedItem)}
        size={isDesktop(layout) ? 'sm' : 'lg'}
        titleText={t('room', 'Room')}
        type="inline"
        disabled={isLoadingRooms}
      />
    </div>
  );
}

function StatusDropdownFilter() {
  const { t } = useTranslation();
  const layout = useLayoutType();
  const { statuses } = useQueueStatuses();
  const { selectedQueueStatusDisplay } = useServiceQueuesFilterState();

  const handleStatusChange = ({ selectedItem }: { selectedItem: { uuid?: string; display: string } }) => {
    updateSelectedQueueStatus(selectedItem.uuid, selectedItem.display);
  };

  return (
    <div className={tableStyles.filterContainer}>
      <Dropdown
        id="service-queue-status"
        items={[{ display: t('any', 'Any') }, ...(statuses ?? [])]}
        itemToString={(item) => (item ? item.display : '')}
        label={selectedQueueStatusDisplay ?? t('all', 'All')}
        onChange={handleStatusChange}
        size={isDesktop(layout) ? 'sm' : 'lg'}
        titleText={t('showPatientsWithStatus', 'Show patients with status:')}
        type="inline"
      />
    </div>
  );
}

function ServiceQueueTableSection() {
  const { t } = useTranslation();
  const layout = useLayoutType();
  const { sessionLocation } = useSession();
  const columnIds = useFilteredQueueTableColumnIds();
  const { visitQueueNumberAttributeUuid } = useServiceQueuesConfig();
  const { selectedServiceUuid, selectedQueueStatusUuid } = useServiceQueuesFilterState();
  const { queueLocations, isLoading: isLoadingLocations } = useQueueLocations();
  const { activeTickets } = useActiveTicketAssignments();
  const [searchTerm, setSearchTerm] = useState('');
  const [hasUserSelectedLocation, setHasUserSelectedLocation] = useState(false);

  const [selectedLocation, setSelectedLocation] = useState<LocationOption>({
    id: ALL_LOCATIONS_ID,
    name: t('all', 'All'),
  });
  const [selectedRoom, setSelectedRoom] = useState<RoomFilterOption>({
    id: ALL_ROOMS_FILTER,
    name: t('all', 'All'),
  });

  const locationOptions = useMemo<LocationOption[]>(() => {
    return [
      { id: ALL_LOCATIONS_ID, name: t('all', 'All') },
      ...queueLocations.map((location) => ({ id: location.id ?? '', name: location.name ?? '' })),
    ];
  }, [queueLocations, t]);

  useEffect(() => {
    if (hasUserSelectedLocation || isLoadingLocations) {
      return;
    }

    if (sessionLocation?.uuid) {
      const matchingQueueLocation = queueLocations.find((loc) => loc.id === sessionLocation.uuid);
      if (matchingQueueLocation) {
        setSelectedLocation({
          id: matchingQueueLocation.id ?? sessionLocation.uuid,
          name:
            matchingQueueLocation.name ??
            (sessionLocation as any).display ??
            (sessionLocation as any).name ??
            sessionLocation.uuid,
        });
        return;
      }
    }

    setSelectedLocation({
      id: ALL_LOCATIONS_ID,
      name: t('all', 'All'),
    });
  }, [hasUserSelectedLocation, isLoadingLocations, queueLocations, sessionLocation, t]);

  const locationUuidForRooms = selectedLocation.id === ALL_LOCATIONS_ID ? undefined : selectedLocation.id;
  const { queueRooms, isLoading: isLoadingRooms } = useQueueRoomsAtLocation(locationUuidForRooms);

  const roomFilterOptions = useMemo<RoomFilterOption[]>(() => {
    const roomItems =
      selectedLocation.id === ALL_LOCATIONS_ID
        ? (activeTickets ? Object.keys(activeTickets) : []).map((name) => ({ id: name, name }))
        : queueRooms.map((room) => ({ id: room.name, name: room.name }));

    return [
      { id: ALL_ROOMS_FILTER, name: t('all', 'All') },
      ...roomItems,
      { id: UNASSIGNED_ROOM_FILTER, name: t('unassigned', 'Unassigned') },
    ];
  }, [activeTickets, queueRooms, selectedLocation.id, t]);

  const handleLocationChange = useCallback(
    (location: LocationOption) => {
      setHasUserSelectedLocation(true);
      setSelectedLocation(location);
      setSelectedRoom({ id: ALL_ROOMS_FILTER, name: t('all', 'All') });
    },
    [t],
  );

  const searchCriteria = useMemo(() => {
    return {
      service: selectedServiceUuid,
      location: selectedLocation.id === ALL_LOCATIONS_ID ? undefined : selectedLocation.id,
      isEnded: false,
      status: selectedQueueStatusUuid,
    };
  }, [selectedLocation.id, selectedServiceUuid, selectedQueueStatusUuid]);

  const { queueEntries, isLoading, isValidating, error } = useServiceQueueEntries(searchCriteria);

  useEffect(() => {
    if (error?.message) {
      showSnackbar({
        title: t('errorLoadingQueueEntries', 'Error loading queue entries'),
        kind: 'error',
        subtitle: error.message,
      });
    }
  }, [error?.message, t]);

  const filteredByRoom = useMemo(() => {
    return filterQueueEntriesByRoom(queueEntries ?? [], selectedRoom.id, visitQueueNumberAttributeUuid, activeTickets);
  }, [activeTickets, queueEntries, selectedRoom.id, visitQueueNumberAttributeUuid]);

  const filteredQueueEntries = useMemo(() => {
    return filterServiceQueueEntriesBySearch(filteredByRoom, searchTerm, columnIds, visitQueueNumberAttributeUuid);
  }, [columnIds, filteredByRoom, searchTerm, visitQueueNumberAttributeUuid]);

  const paginationResetKey = useMemo(
    () =>
      JSON.stringify({
        searchCriteria,
        selectedRoomId: selectedRoom.id,
        searchTerm,
      }),
    [searchCriteria, selectedRoom.id, searchTerm],
  );

  if (isLoading || columnIds.length === 0) {
    return <DataTableSkeleton className={styles.tableSection} role="progressbar" />;
  }

  return (
    <ServiceQueueTable
      isLoading={isLoading}
      isValidating={isValidating}
      paginationResetKey={paginationResetKey}
      queueEntries={filteredQueueEntries}
      tableFilters={
        <>
          <ClearQueueEntriesButton queueEntries={filteredQueueEntries} />
          <LocationDropdownFilter
            isLoadingLocations={isLoadingLocations}
            locationOptions={locationOptions}
            onLocationChange={handleLocationChange}
            selectedLocation={selectedLocation}
          />
          <RoomDropdownFilter
            isLoadingRooms={isLoadingRooms}
            onRoomChange={setSelectedRoom}
            roomFilterOptions={roomFilterOptions}
            selectedRoom={selectedRoom}
          />
          <StatusDropdownFilter />
          <TableToolbarSearch
            className={tableStyles.search}
            onChange={(event) => setSearchTerm(typeof event === 'string' ? event : event.target.value)}
            placeholder={t('searchThisList', 'Search this list')}
            size={isDesktop(layout) ? 'sm' : 'lg'}
            persistent
          />
        </>
      }
    />
  );
}

/**
 * Drop-in replacement for the default service queue table.
 * Uses the same filters, columns, actions, and expanded rows as the upstream table.
 */
const ServiceQueueTableDashboard: React.FC = () => {
  const { t } = useTranslation();
  const layout = useLayoutType();

  return (
    <div className={styles.serviceQueueTableDashboard}>
      <Layer className={styles.tableSection}>
        <div className={styles.headerContainer}>
          <div className={!isDesktop(layout) ? styles.tabletHeading : styles.desktopHeading}>
            <h4>{t('patientsCurrentlyInQueue', 'Patients currently in queue')}</h4>
          </div>
          <div className={styles.headerButtons}>
            <AddPatientToQueueButton />
          </div>
        </div>
        <ServiceQueueTableSection />
      </Layer>
    </div>
  );
};

export default ServiceQueueTableDashboard;
