import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  ComboBox,
  ComposedModal,
  DataTableSkeleton,
  InlineLoading,
  InlineNotification,
  ModalBody,
  ModalFooter,
  ModalHeader,
  OverflowMenu,
  OverflowMenuItem,
  Select,
  SelectItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  TextArea,
  TextInput,
  Tile,
  Toggle,
} from '@carbon/react';
import { Add } from '@carbon/react/icons';
import { showSnackbar, useDebounce } from '@openmrs/esm-framework';
import {
  deactivateCatchment,
  reactivateCatchment,
  saveCatchment,
  useCatchment,
  useFacilityDirectory,
} from '../../api/referral.resource';
import type { CatchmentEntry, CatchmentTier, MasterFacility } from '../../api/types';
import { extractErrorMessage } from '../../api/errors';
import { useCodeLabel } from '../../utils/labels';
import styles from './catchment.scss';

const TIERS: Array<CatchmentTier> = ['PRIMARY', 'SECONDARY', 'OUTSIDE'];

const CatchmentPage: React.FC = () => {
  const { t } = useTranslation();
  const label = useCodeLabel();
  const [includeInactive, setIncludeInactive] = useState(false);
  const { entries, error, isLoading, mutate } = useCatchment({ includeInactive });
  const [editing, setEditing] = useState<CatchmentEntry | 'new' | null>(null);
  const [deactivating, setDeactivating] = useState<CatchmentEntry | null>(null);

  const reactivate = async (entry: CatchmentEntry) => {
    try {
      await reactivateCatchment(entry.uuid);
      mutate();
    } catch (e) {
      showSnackbar({
        kind: 'error',
        title: t('reactivateFailed', 'Could not reactivate'),
        subtitle: extractErrorMessage(e) ?? '',
      });
    }
  };

  return (
    <div>
      <div className={styles.toolbar}>
        <p className={styles.intro}>
          {t(
            'catchmentIntro',
            'Facilities this facility refers to, chosen from the Master Facility Registry, and the services each provides. The liaison can only send referrals to active entries here.',
          )}
        </p>
        <div className={styles.toolbarActions}>
          <Toggle
            id="include-inactive"
            size="sm"
            labelText={t('showInactive', 'Show inactive')}
            hideLabel
            labelA={t('showInactive', 'Show inactive')}
            labelB={t('showInactive', 'Show inactive')}
            toggled={includeInactive}
            onToggle={setIncludeInactive}
          />
          <Button kind="tertiary" size="md" renderIcon={Add} onClick={() => setEditing('new')}>
            {t('addFacility', 'Add facility')}
          </Button>
        </div>
      </div>

      {isLoading && <DataTableSkeleton columnCount={4} rowCount={5} showHeader={false} showToolbar={false} />}
      {error && !isLoading && (
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          title={t('catchmentLoadError', 'Could not load the catchment.')}
          subtitle={error.message}
        />
      )}

      {!isLoading && !error && entries.length === 0 && (
        <Tile className={styles.empty}>
          <p className={styles.emptyTitle}>{t('catchmentEmpty', 'No facilities in the catchment yet.')}</p>
          <p className={styles.emptyHint}>
            {t('catchmentEmptyHint', 'Add a facility by selecting it from the Master Facility Registry.')}
          </p>
        </Tile>
      )}

      {!isLoading && !error && entries.length > 0 && (
        <TableContainer className={styles.table}>
          <Table size="md" useZebraStyles>
            <TableHead>
              <TableRow>
                <TableHeader>{t('facility', 'Facility')}</TableHeader>
                <TableHeader>{t('tier', 'Tier')}</TableHeader>
                <TableHeader>{t('services', 'Services')}</TableHeader>
                <TableHeader>{t('status', 'Status')}</TableHeader>
                <TableHeader aria-label={t('actions', 'Actions')} />
              </TableRow>
            </TableHead>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.uuid} className={entry.active ? undefined : styles.inactive}>
                  <TableCell>
                    <span className={styles.facilityName}>{entry.facilityName ?? entry.facilityCode}</span>
                    <span className={styles.code}>{entry.facilityCode}</span>
                  </TableCell>
                  <TableCell>{label('tier', entry.tier)}</TableCell>
                  <TableCell>{entry.services.length ? entry.services.join(', ') : '—'}</TableCell>
                  <TableCell>
                    {entry.active ? (
                      <Tag type="green" size="sm">
                        {t('active', 'Active')}
                      </Tag>
                    ) : (
                      <span title={entry.deactivationReason ?? ''}>
                        <Tag type="gray" size="sm">
                          {t('inactive', 'Inactive')}
                        </Tag>
                      </span>
                    )}
                  </TableCell>
                  <TableCell className={styles.menuCell}>
                    <OverflowMenu size="sm" flipped aria-label={t('actions', 'Actions')}>
                      <OverflowMenuItem itemText={t('edit', 'Edit')} onClick={() => setEditing(entry)} />
                      {entry.active ? (
                        <OverflowMenuItem
                          isDelete
                          itemText={t('deactivate', 'Deactivate')}
                          onClick={() => setDeactivating(entry)}
                        />
                      ) : (
                        <OverflowMenuItem itemText={t('reactivate', 'Reactivate')} onClick={() => reactivate(entry)} />
                      )}
                    </OverflowMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {editing && (
        <CatchmentModal
          entry={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            mutate();
          }}
        />
      )}
      {deactivating && (
        <DeactivateModal
          entry={deactivating}
          onClose={() => setDeactivating(null)}
          onDone={() => {
            setDeactivating(null);
            mutate();
          }}
        />
      )}
    </div>
  );
};

const CatchmentModal: React.FC<{ entry: CatchmentEntry | null; onClose: () => void; onSaved: () => void }> = ({
  entry,
  onClose,
  onSaved,
}) => {
  const { t } = useTranslation();
  const label = useCodeLabel();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query);
  const directory = useFacilityDirectory(entry ? null : debouncedQuery);
  const [selected, setSelected] = useState<MasterFacility | null>(
    entry ? { code: entry.facilityCode, name: entry.facilityName ?? entry.facilityCode } : null,
  );
  const [tier, setTier] = useState<string>(entry?.tier ?? 'PRIMARY');
  const [services, setServices] = useState(entry?.services.join(', ') ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!selected) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveCatchment({
        uuid: entry?.uuid,
        facilityCode: selected.code,
        facilityName: selected.name,
        tier,
        services: services
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      });
      onSaved();
    } catch (e) {
      setError(extractErrorMessage(e) ?? t('saveFailedGeneric', 'Could not save.'));
      setSaving(false);
    }
  };

  return (
    <ComposedModal open size="sm" onClose={onClose} preventCloseOnClickOutside>
      <ModalHeader title={entry ? t('editFacility', 'Edit facility') : t('addFacility', 'Add facility')} />
      <ModalBody hasForm>
        <Stack gap={5}>
          {entry ? (
            <TextInput
              id="facility"
              labelText={t('facility', 'Facility')}
              value={`${selected?.name ?? ''} (${selected?.code ?? ''})`}
              readOnly
              helperText={t('codeLocked', 'The facility cannot change once referrals name it.')}
            />
          ) : (
            <ComboBox
              id="mfr-facility"
              titleText={t('facility', 'Facility')}
              placeholder={t('searchMasterFacilityRegistry', 'Search the Master Facility Registry')}
              helperText={t(
                'searchMasterFacilityHelp',
                'Type at least two characters. The code and name come from the registry.',
              )}
              items={directory.facilities}
              itemToString={(item: MasterFacility | null) => (item ? `${item.name} (${item.code})` : '')}
              shouldFilterItem={() => true}
              onInputChange={(value) => {
                setQuery(value ?? '');
                if (selected && value !== `${selected.name} (${selected.code})`) {
                  setSelected(null);
                }
              }}
              onChange={({ selectedItem }) => setSelected(selectedItem ?? null)}
            />
          )}
          {!entry && (directory.warning || directory.error) && (
            <InlineNotification
              kind={directory.error ? 'error' : 'warning'}
              lowContrast
              hideCloseButton
              title={directory.error?.message ?? directory.warning ?? ''}
            />
          )}
          {!entry && directory.isLoading && <InlineLoading description={t('searching', 'Searching…')} />}
          <Select id="tier" labelText={t('tier', 'Tier')} value={tier} onChange={(e) => setTier(e.target.value)}>
            {TIERS.map((c) => (
              <SelectItem key={c} value={c} text={label('tier', c)} />
            ))}
          </Select>
          <TextArea
            id="services"
            labelText={t('services', 'Services')}
            helperText={t('servicesHelp', 'Comma-separated, e.g. Surgery, Obstetrics, Pediatrics')}
            rows={2}
            value={services}
            onChange={(e) => setServices(e.target.value)}
          />
          {error && <InlineNotification kind="error" lowContrast hideCloseButton title={error} />}
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose}>
          {t('close', 'Close')}
        </Button>
        <Button kind="primary" disabled={saving || !selected} onClick={submit}>
          {saving ? <InlineLoading description={t('saving', 'Saving…')} /> : t('save', 'Save')}
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
};

const DeactivateModal: React.FC<{ entry: CatchmentEntry; onClose: () => void; onDone: () => void }> = ({
  entry,
  onClose,
  onDone,
}) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true);
    try {
      await deactivateCatchment(entry.uuid, reason.trim());
      onDone();
    } catch (e) {
      setError(extractErrorMessage(e) ?? t('saveFailedGeneric', 'Could not save.'));
      setSaving(false);
    }
  };

  return (
    <ComposedModal open size="sm" danger onClose={onClose}>
      <ModalHeader
        title={t('deactivateFacility', 'Deactivate facility')}
        label={entry.facilityName ?? entry.facilityCode}
      />
      <ModalBody hasForm>
        <Stack gap={5}>
          <p>
            {t(
              'deactivateHelp',
              'It will no longer be offered as a destination. Referrals already sent there stay readable.',
            )}
          </p>
          <TextArea
            id="reason"
            labelText={t('reason', 'Reason')}
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          {error && <InlineNotification kind="error" lowContrast hideCloseButton title={error} />}
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose}>
          {t('close', 'Close')}
        </Button>
        <Button kind="danger" disabled={saving || !reason.trim()} onClick={submit}>
          {saving ? <InlineLoading description={t('saving', 'Saving…')} /> : t('deactivate', 'Deactivate')}
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
};

export default CatchmentPage;
