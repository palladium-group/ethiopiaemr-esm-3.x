async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} – ${url}`);
  }
  return res.json();
}

export function capPerSeries(instances: string[], maxPerSeries?: number): string[] {
  if (!maxPerSeries || instances.length <= maxPerSeries) {
    return instances;
  }
  const step = instances.length / maxPerSeries;
  return Array.from({ length: maxPerSeries }, (_, i) => instances[Math.floor(i * step)]);
}

export async function resolveInstanceIds({
  orthancUrl,
  studyId,
  seriesId,
  maxPerSeries,
}: {
  orthancUrl: string;
  studyId?: string;
  seriesId?: string;
  maxPerSeries?: number;
}): Promise<string[]> {
  if (seriesId) {
    const series = await fetchJson(`${orthancUrl}/series/${seriesId}`);
    return capPerSeries(series.Instances, maxPerSeries);
  }

  if (studyId) {
    const study = await fetchJson(`${orthancUrl}/studies/${studyId}`);
    const out: string[] = [];
    for (const sid of study.Series) {
      const series = await fetchJson(`${orthancUrl}/series/${sid}`);
      out.push(...capPerSeries(series.Instances, maxPerSeries));
    }
    return out;
  }

  const studyIds = await fetchJson(`${orthancUrl}/studies`);
  const out: string[] = [];
  for (const sid of studyIds) {
    const study = await fetchJson(`${orthancUrl}/studies/${sid}`);
    if (!study.Series?.length) {
      continue;
    }
    const firstSeries = await fetchJson(`${orthancUrl}/series/${study.Series[0]}`);
    const mid = firstSeries.Instances[Math.floor(firstSeries.Instances.length / 2)];
    if (mid) {
      out.push(mid);
    }
  }
  return out;
}
