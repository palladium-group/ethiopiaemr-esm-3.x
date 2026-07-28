import { useEffect, useState } from 'react';
import { restBaseUrl } from '@openmrs/esm-framework';

export type SeriesInfo = {
  seriesId: string;
  seriesNumber: string;
  description: string;
  instanceCount: number;
  firstInstanceId: string | null;
};

export const ORTHANC_PROXY = `/openmrs${restBaseUrl}/orthanc`;

export function useOrthancStudySeries(studyId: string | null) {
  const [series, setSeries] = useState<SeriesInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!studyId) {
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetch(`${ORTHANC_PROXY}/studies/${studyId}`)
      .then((r) => {
        if (!r.ok) {
          throw new Error(`${r.status} ${r.statusText}`);
        }
        return r.json();
      })
      .then(async (study) => {
        const seriesData = await Promise.all(
          (study.Series ?? []).map(async (sid: string) => {
            const r = await fetch(`${ORTHANC_PROXY}/series/${sid}`);
            const s = await r.json();
            const tags = s.MainDicomTags ?? {};
            return {
              seriesId: sid,
              seriesNumber: tags.SeriesNumber ?? '',
              description: tags.SeriesDescription ?? '',
              instanceCount: (s.Instances ?? []).length,
              firstInstanceId: s.Instances?.[0] ?? null,
            };
          }),
        );
        if (!cancelled) {
          setSeries(seriesData.sort((a, b) => Number(a.seriesNumber) - Number(b.seriesNumber)));
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [studyId]);

  return { series, isLoading, error };
}
