import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, SkeletonPlaceholder, Tile } from '@carbon/react';
import { ImageMedical } from '@carbon/react/icons';
import { useDicomImages } from '../../../resources/hooks/useDicomImages';
import { useOrthancPreview } from '../../../resources/hooks/useOrthancPreview';
import { openDicomViewer } from '../dicom-images/dicom-viewer.utils';
import { OhifIcon, OhifSegmentationIcon, StoneWebViewerIcon } from '../dicom-images/viewer-icons';
import { useOrthancStudySeries, ORTHANC_PROXY, type SeriesInfo } from '../../../resources/hooks/useOrthancStudySeries';
import styles from './imaging-series-panel.scss';

const SKELETON_KEYS = ['sk-0', 'sk-1', 'sk-2', 'sk-3'];

type SeriesTileProps = {
  series: SeriesInfo;
  studyInstanceUid: string;
};

const SeriesTile: React.FC<SeriesTileProps> = ({ series, studyInstanceUid }) => {
  const { t } = useTranslation();
  const { src, loading } = useOrthancPreview(series.firstInstanceId ?? '', { orthancUrl: ORTHANC_PROXY });

  const label = series.description
    ? `${t('series', 'Series')} ${series.seriesNumber}: ${series.description}`
    : `${t('series', 'Series')} ${series.seriesNumber}`;

  return (
    <Tile className={styles.tile}>
      <button
        type="button"
        className={styles.imageAreaBtn}
        onClick={() => openDicomViewer(studyInstanceUid, 'stone-webviewer')}
        aria-label={`${label} — ${t('openInStoneViewer', 'Open in Stone Web Viewer')}`}>
        {loading && series.firstInstanceId && <SkeletonPlaceholder className={styles.imageSkeleton} />}
        {src && <img src={src} alt={label} loading="lazy" className={styles.thumbnailImg} />}
        {!src && !loading && <ImageMedical size={48} className={styles.placeholderIcon} />}
      </button>

      <div className={styles.seriesInfo}>
        <p className={styles.seriesName}>{label}</p>
        <p className={styles.seriesCount}>
          {series.instanceCount} {t('images', 'images')}
        </p>
        <div className={styles.viewerActions}>
          <Button
            kind="ghost"
            size="sm"
            hasIconOnly
            iconDescription={t('stoneWebViewer', 'Stone Web Viewer')}
            renderIcon={() => <StoneWebViewerIcon size={20} />}
            onClick={() => openDicomViewer(studyInstanceUid, 'stone-webviewer')}
          />
          <Button
            kind="ghost"
            size="sm"
            hasIconOnly
            iconDescription={t('ohifViewer', 'OHIF Viewer')}
            renderIcon={() => <OhifIcon size={20} />}
            onClick={() => openDicomViewer(studyInstanceUid, 'ohif')}
          />
          <Button
            kind="ghost"
            size="sm"
            hasIconOnly
            iconDescription={t('ohifSegmentation', 'OHIF Segmentation')}
            renderIcon={() => <OhifSegmentationIcon size={20} />}
            onClick={() => openDicomViewer(studyInstanceUid, 'ohif-segmentation')}
          />
        </div>
      </div>
    </Tile>
  );
};

type ImagingSeriesPanelProps = {
  orderNumber: string;
};

const ImagingSeriesPanel: React.FC<ImagingSeriesPanelProps> = ({ orderNumber }) => {
  const { t } = useTranslation();
  const { studies, isLoading: studiesLoading } = useDicomImages(orderNumber);
  const studyId = studies[0]?.uuid ?? null;
  const studyInstanceUid = studies[0]?.mainDicomTags?.StudyInstanceUID ?? '';
  const { series, isLoading: seriesLoading } = useOrthancStudySeries(studyId);

  const isLoading = studiesLoading || seriesLoading;

  return (
    <div className={styles.container}>
      <div className={styles.title}>
        <ImageMedical />
        {t('imagingSeries', 'Imaging Series')}
      </div>

      {isLoading && (
        <div className={styles.grid}>
          {SKELETON_KEYS.map((key) => (
            <Tile key={key} className={styles.tile}>
              <div className={styles.imageArea}>
                <SkeletonPlaceholder className={styles.imageSkeleton} />
              </div>
              <div className={styles.seriesInfo}>
                <div className={styles.skeletonName} />
                <div className={styles.skeletonCount} />
              </div>
            </Tile>
          ))}
        </div>
      )}

      {!isLoading && series.length === 0 && (
        <p className={styles.empty}>{t('noSeriesFound', 'No imaging series found.')}</p>
      )}

      {!isLoading && series.length > 0 && (
        <div className={styles.grid}>
          {series.map((s) => (
            <SeriesTile key={s.seriesId} series={s} studyInstanceUid={studyInstanceUid} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ImagingSeriesPanel;
