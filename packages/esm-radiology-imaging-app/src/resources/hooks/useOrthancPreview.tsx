import { useEffect, useState } from 'react';

interface UseOrthancPreviewOpts {
  orthancUrl?: string;
  frame?: number;
}

export function useOrthancPreview(instanceId: string, opts: UseOrthancPreviewOpts = {}) {
  const { orthancUrl, frame } = opts;
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!instanceId || !orthancUrl) {
      return;
    }
    let revoked = false;
    let objectUrl: string | null = null;
    const ctrl = new AbortController();

    setLoading(true);
    setError(null);

    const path =
      frame == null ? `/instances/${instanceId}/preview` : `/instances/${instanceId}/frames/${frame}/preview`;

    fetch(`${orthancUrl}${path}`, {
      signal: ctrl.signal,
      headers: { Accept: 'image/png' },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`${res.status} ${res.statusText}`);
        }
        return res.blob();
      })
      .then((blob) => {
        if (revoked) {
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === 'AbortError') {
          return;
        }
        setError(err);
        setLoading(false);
      });

    return () => {
      revoked = true;
      ctrl.abort();
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [instanceId, orthancUrl, frame]);

  return { src, error, loading };
}
