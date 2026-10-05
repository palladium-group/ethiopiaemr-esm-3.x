import { Button, Column, Grid, InlineLoading, Layer, NumberInput, Tile, Toggle } from '@carbon/react';
import { formatDate, parseDate, showSnackbar } from '@openmrs/esm-framework';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocalFacilityInfo, useShaFacilityInfo } from '../hook/useFacilityInfo';
import { useCbhiManualEntrySetting, saveCbhiManualEntrySetting } from '../hook/useCbhiManualEntrySetting';
import { useCardValiditySetting, saveCardValiditySetting } from '../hook/useCardValiditySetting';
import styles from './facility-info.scss';
import Card from './card.component';
import dayjs from 'dayjs';
import { syncPackagesAndInterventions } from './facility-setup.resource';

const FacilityInfo: React.FC = () => {
  const { t } = useTranslation();
  const [shouldSynchronize, setshouldSynchronize] = useState<boolean>(false);
  const {
    shaFacility,
    isLoading: isShaFacilityLoading,
    error: shaFacilityError,
    mutate: mutateShafacility,
  } = useShaFacilityInfo(shouldSynchronize);
  const {
    localFacility,
    isLoading: isLocalFacilityLoading,
    mutate: mutateLocalFacility,
    error: localFacilityError,
  } = useLocalFacilityInfo();

  const {
    isManualEntryEnabled,
    settingUuid,
    isLoading: isCbhiSettingLoading,
    mutate: mutateCbhiSetting,
  } = useCbhiManualEntrySetting();
  const [isCbhiSaving, setIsCbhiSaving] = useState(false);

  const {
    cardValidityDays,
    settingUuid: cardValiditySettingUuid,
    isLoading: isCardValidityLoading,
    mutate: mutateCardValiditySetting,
  } = useCardValiditySetting();
  const [cardValidityDaysInput, setCardValidityDaysInput] = useState<number>(cardValidityDays);
  const [isCardValiditySaving, setIsCardValiditySaving] = useState(false);

  useEffect(() => {
    setCardValidityDaysInput(cardValidityDays);
  }, [cardValidityDays]);

  const handleToggleCbhiManualEntry = async (checked: boolean) => {
    setIsCbhiSaving(true);
    try {
      await saveCbhiManualEntrySetting(checked, settingUuid);
      await mutateCbhiSetting();
      showSnackbar({
        title: t('cbhiSettingUpdated', 'Setting Updated'),
        subtitle: checked
          ? t('cbhiManualEntryEnabled', 'Allow CBHI Manual Entry has been enabled.')
          : t('cbhiManualEntryDisabled', 'Allow CBHI Manual Entry has been disabled.'),
        kind: 'success',
        isLowContrast: true,
      });
    } catch (error) {
      showSnackbar({
        title: t('error', 'Error'),
        subtitle: t('errorUpdatingCbhiSetting', 'Error updating CBHI manual entry setting'),
        kind: 'error',
        isLowContrast: true,
      });
    } finally {
      setIsCbhiSaving(false);
    }
  };

  const handleSaveCardValidityDays = async () => {
    if (!cardValidityDaysInput || cardValidityDaysInput < 1) {
      return;
    }
    setIsCardValiditySaving(true);
    try {
      await saveCardValiditySetting(cardValidityDaysInput, cardValiditySettingUuid);
      await mutateCardValiditySetting();
      showSnackbar({
        title: t('settingUpdated', 'Setting Updated'),
        subtitle: t('cardValidityDaysUpdated', 'Card validity period updated to {{days}} days.', {
          days: cardValidityDaysInput,
        }),
        kind: 'success',
        isLowContrast: true,
      });
    } catch (error) {
      showSnackbar({
        title: t('error', 'Error'),
        subtitle: t('errorUpdatingCardValiditySetting', 'Error updating card validity period setting'),
        kind: 'error',
        isLowContrast: true,
      });
    } finally {
      setIsCardValiditySaving(false);
    }
  };

  const mutateFacility = useCallback(async () => {
    const defaultFacility = await mutateLocalFacility();
    const shaFacility = await mutateShafacility();
    return {
      shaFacility,
      defaultFacility,
    };
  }, [mutateLocalFacility, mutateShafacility]);
  const shaStatus = useMemo(
    () =>
      shaFacility?.operationalStatus
        ? `${shaFacility.operationalStatus.at(0).toUpperCase()}${shaFacility.operationalStatus
            .slice(1)
            ?.toLocaleLowerCase()}`
        : undefined,
    [shaFacility],
  );
  const shaExpiry = useMemo(
    () =>
      shaFacility?.shaFacilityExpiryDate && dayjs(shaFacility.shaFacilityExpiryDate).isValid()
        ? formatDate(parseDate(shaFacility.shaFacilityExpiryDate))
        : undefined,
    [shaFacility],
  );

  const synchronizeFacilityData = useCallback(async () => {
    try {
      setshouldSynchronize(true);
      const { shaFacility } = await mutateFacility();
      showSnackbar({
        title: t('syncingHieSuccess', 'Synchronization Complete'),
        kind: 'success',
        isLowContrast: true,
      });
      if (shaFacility.data?.source != 'HIE') {
        showSnackbar({
          kind: 'warning',
          title: 'HIE Sync Failed. Pulling local info.',
          isLowContrast: true,
        });
      }
      // sync packages and intervensions
      await syncPackagesAndInterventions();
    } catch (error) {
      const errorMessage =
        error?.responseBody?.error?.message ??
        t('hieSynchronizationError', 'An error occurred while synchronizing with HIE');
      showSnackbar({
        title: t('syncingHieError', 'Syncing with HIE Failed'),
        subtitle: errorMessage,
        kind: 'error',
        isLowContrast: true,
      });
    }
  }, [mutateFacility, t]);

  return (
    <div className={styles.facilityInfoContainer}>
      <div>
        <Layer className={styles.btnLayer}>
          {isShaFacilityLoading || isLocalFacilityLoading ? (
            <InlineLoading
              description={t('synchronizingFacilityData', 'Please wait, Synchronizing Info.')}
              className={styles.loading}
            />
          ) : (
            <Button kind="primary" onClick={synchronizeFacilityData}>
              {t('synchronizeWithHie', 'Synchronize with HIE')}
            </Button>
          )}
        </Layer>
      </div>

      <Grid narrow>
        {/* General Info Column */}
        <Column sm={4} md={4} lg={8}>
          <Tile className={styles.card}>
            <h3 className={styles.cardTitle}>{t('generalInformation', 'General Information')}</h3>
            <hr className={styles.cardDivider} />
            <div className={styles.cardContent}>
              <Card label={t('facilityName', 'Facility Name')} value={localFacility?.display} />
              <Card label={t('facilityCode', 'Facility KMHFR Code')} value={shaFacility?.mflCode} />
              <Card label={t('kephLevel', 'Keph Level')} value={shaFacility?.kephLevel} />
              <br />
              <br />
            </div>
          </Tile>
        </Column>

        {/* SHA Info Column */}
        <Column sm={4} md={4} lg={8}>
          <Layer>
            <Tile className={styles.card}>
              <h3 className={styles.cardTitle}>{t('facilityInformation', 'Facility Information')}</h3>
              <hr className={styles.cardDivider} />
              <div className={styles.cardContent}>
                <Card
                  label={t('facilityRegistryCode', 'Facility Registry Code')}
                  value={shaFacility?.facilityRegistryCode}
                />
                <Card
                  label={t('shalicenceNumber', 'SHA License Number')}
                  value={shaFacility?.shaFacilityLicenseNumber}
                />
                <Card label={t('shaStatus', 'SHA Status')} value={shaStatus} />
                <Card label={t('shaContracted', 'SHA Contracted')} value={shaFacility?.approved} />
                <Card label={t('shaContractExpiry', 'SHA Contract Expiry Date')} value={shaExpiry} />
              </div>
            </Tile>
          </Layer>
        </Column>

        {/* Facility Configurations Column */}
        <Column sm={4} md={4} lg={8}>
          <Layer>
            <Tile className={styles.card}>
              <h3 className={styles.cardTitle}>{t('facilityConfigurations', 'Facility Configurations')}</h3>
              <hr className={styles.cardDivider} />
              <div className={styles.cardContent}>
                <div style={{ marginTop: '0.75rem', marginBottom: '0.75rem' }}>
                  <Toggle
                    id="allow-cbhi-manual-entry-toggle"
                    labelText={t('allowCbhiManualEntry', 'Allow CBHI Manual Entry')}
                    labelA={t('disabled', 'Disabled')}
                    labelB={t('enabled', 'Enabled')}
                    toggled={isManualEntryEnabled}
                    disabled={isCbhiSaving || isCbhiSettingLoading}
                    onToggle={(checked) => handleToggleCbhiManualEntry(checked)}
                  />
                  <p style={{ fontSize: '0.875rem', color: '#525252', marginTop: '0.5rem' }}>
                    {t(
                      'allowCbhiManualEntryDescription',
                      'When enabled, CBHI member details (CBHI ID and Expiry Date) are entered manually in MRU billing information instead of online search.',
                    )}
                  </p>
                </div>

                <hr className={styles.cardDivider} style={{ margin: '1.25rem 0' }} />

                <div style={{ marginTop: '0.75rem', marginBottom: '0.75rem' }}>
                  <NumberInput
                    id="card-validity-days-input"
                    label={t('cardValidityDays', 'Card Validity Period (Days)')}
                    helperText={t(
                      'cardValidityDaysDescription',
                      'Number of days consultation card remains valid after payment. Patients returning within this window will not be charged consultation fee.',
                    )}
                    min={1}
                    max={365}
                    step={1}
                    value={cardValidityDaysInput}
                    disabled={isCardValiditySaving || isCardValidityLoading}
                    onChange={(_event, { value }) => setCardValidityDaysInput(Number(value))}
                  />
                  <div style={{ marginTop: '0.75rem' }}>
                    <Button
                      size="md"
                      kind="primary"
                      disabled={
                        isCardValiditySaving ||
                        isCardValidityLoading ||
                        cardValidityDaysInput === cardValidityDays ||
                        !cardValidityDaysInput ||
                        cardValidityDaysInput < 1
                      }
                      onClick={handleSaveCardValidityDays}>
                      {isCardValiditySaving ? t('saving', 'Saving...') : t('save', 'Save')}
                    </Button>
                  </div>
                </div>
              </div>
            </Tile>
          </Layer>
        </Column>
      </Grid>
    </div>
  );
};

export default FacilityInfo;
