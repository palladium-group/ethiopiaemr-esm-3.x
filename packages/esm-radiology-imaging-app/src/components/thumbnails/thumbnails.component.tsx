import React, { useCallback, useEffect, useState } from 'react';
import { ActionableNotification, ClickableTile, Column, Grid, SkeletonPlaceholder } from '@carbon/react';
import { useOrthancPreview } from '../../resources/hooks/useOrthancPreview';
import { resolveInstanceIds } from './orthanc.utils';
import styles from './thumbnails.scss';

const SKELETON_IDS = Array.from({ length: 8 }, (_, i) => `skeleton-${i}`);

interface OrthancThumbnailProps {
  instanceId: string;
  label?: string;
  onClick?: (instanceId: string) => void;
  opts?: { orthancUrl?: string; frame?: number };
}

export function OrthancThumbnail({ instanceId, label, onClick, opts = {} }: Readonly<OrthancThumbnailProps>) {
  const { src, error, loading } = useOrthancPreview(instanceId, opts);

  return (
    <ClickableTile
      onClick={() => onClick?.(instanceId)}
      disabled={loading || !!error}
      title={label || instanceId}
      className={styles.tile}>
      <div className={styles.imageBox}>
        {loading && <SkeletonPlaceholder className={styles.skeleton} />}

        {error && !loading && <span className={styles.error}>Failed to load</span>}

        {src && <img src={src} alt={label || instanceId} loading="lazy" className={styles.image} />}

        {label && src && <span className={styles.label}>{label}</span>}
      </div>
    </ClickableTile>
  );
}

interface OrthancThumbnailGridProps {
  orthancUrl: string;
  studyId?: string;
  seriesId?: string;
  maxPerSeries?: number;
  onSelect?: (instanceId: string) => void;
  columnSpan?: { sm?: number; md?: number; lg?: number };
}

export default function OrthancThumbnailGrid({
  orthancUrl,
  studyId,
  seriesId,
  maxPerSeries,
  onSelect,
  columnSpan = { sm: 2, md: 2, lg: 4 },
}: Readonly<OrthancThumbnailGridProps>) {
  const [instanceIds, setInstanceIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    resolveInstanceIds({ orthancUrl, studyId, seriesId, maxPerSeries })
      .then((ids) => {
        if (!cancelled) {
          setInstanceIds(ids);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [orthancUrl, studyId, seriesId, maxPerSeries]);

  useEffect(() => load(), [load]);

  if (error) {
    return (
      <ActionableNotification
        kind="error"
        lowContrast
        hideCloseButton
        title="Could not load thumbnails"
        subtitle={String(error.message || error)}
        actionButtonLabel="Retry"
        onActionButtonClick={load}
      />
    );
  }

  const colProps = { sm: columnSpan.sm, md: columnSpan.md, lg: columnSpan.lg };

  return (
    <Grid narrow condensed>
      {loading &&
        SKELETON_IDS.map((id) => (
          <Column key={id} {...colProps} className={styles.column}>
            <div className={styles.skeletonWrapper}>
              <SkeletonPlaceholder className={styles.skeletonFill} />
            </div>
          </Column>
        ))}

      {!loading &&
        instanceIds.map((id) => (
          <Column key={id} {...colProps} className={styles.column}>
            <OrthancThumbnail instanceId={id} onClick={onSelect} opts={{ orthancUrl }} />
          </Column>
        ))}

      {!loading && instanceIds.length === 0 && (
        <Column sm={4} md={8} lg={16}>
          <p className={styles.empty}>No instances found.</p>
        </Column>
      )}
    </Grid>
  );
}
