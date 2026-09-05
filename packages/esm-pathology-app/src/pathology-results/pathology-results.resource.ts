import { useMemo } from 'react';
import useSWR from 'swr';
import { fhirBaseUrl, openmrsFetch } from '@openmrs/esm-framework';

export interface PathologyReport {
  id: string;
  issued: string;
  status: string;
  code: string;
  diagnosis: string;
}

/**
 * Fetches the patient's pathology DiagnosticReports (those returned from OpenELIS), filtered by the
 * configured pathology LOINC code(s), with their result Observations included so the diagnosis text can be
 * shown. The OpenMRS DiagnosticReport does not persist FHIR `conclusion`, so the diagnosis is read from the
 * referenced result Observation values (falling back to `conclusion` if present).
 */
export function usePathologyReports(patientUuid: string, loincCodes: Array<string>) {
  // FHIR treats a comma as the OR separator within a parameter value, so each token is encoded on its
  // own and the separators are left literal.
  const codes = (loincCodes ?? []).filter(Boolean).map((code) => encodeURIComponent(`http://loinc.org|${code}`));
  const url =
    `${fhirBaseUrl}/DiagnosticReport?patient=${patientUuid}` +
    (codes.length ? `&code=${codes.join(',')}` : '') +
    `&_include=DiagnosticReport:result&_count=100&_sort=-issued`;

  const { data, error, isLoading, isValidating } = useSWR<{ data: fhir.Bundle }>(
    patientUuid ? url : null,
    openmrsFetch,
  );

  const reports = useMemo(() => parseReports(data?.data), [data]);

  return { reports, error, isLoading, isValidating };
}

function parseReports(bundle?: fhir.Bundle): Array<PathologyReport> {
  if (!bundle?.entry) {
    return [];
  }

  const obsById: Record<string, fhir.Observation> = {};
  const reports: Array<fhir.DiagnosticReport> = [];
  for (const entry of bundle.entry) {
    const resource = entry.resource as fhir.Observation | fhir.DiagnosticReport;
    if (resource?.resourceType === 'Observation') {
      obsById[resource.id] = resource as fhir.Observation;
    } else if (resource?.resourceType === 'DiagnosticReport') {
      reports.push(resource as fhir.DiagnosticReport);
    }
  }

  return reports.map((report) => {
    const resultValues = (report.result ?? [])
      .map((ref) => resolveObservation(obsById, ref))
      .map((obs) => obs?.valueString || obs?.valueCodeableConcept?.text || '')
      .filter(Boolean);

    return {
      id: report.id,
      issued: report.issued || report.effectiveDateTime || '',
      status: report.status || '',
      code: report.code?.coding?.[0]?.display || report.code?.text || 'Pathology report',
      diagnosis: resultValues.length ? resultValues.join('; ') : report.conclusion || '—',
    };
  });
}

/** Resolves an included result Observation, tolerating relative, absolute and contained references. */
function resolveObservation(
  obsById: Record<string, fhir.Observation>,
  ref: fhir.Reference,
): fhir.Observation | undefined {
  const id = ref?.reference?.replace(/^#/, '').split('/').pop();
  return id ? obsById[id] : undefined;
}
