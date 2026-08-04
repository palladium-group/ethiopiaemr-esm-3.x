import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { z } from 'zod';

/**
 * Strips Word-specific XML/MSO markup from pasted HTML while preserving
 * semantic formatting (bold, italic, underline, tables, lists, headings).
 */
export function cleanWordHtml(html: string): string {
  return (
    html
      // Remove XML declarations and Word conditional comments
      .replace(/<\?xml[^>]*>/gi, '')
      .replace(/<!--\[if[^\]]*\]>[\s\S]*?<!\[endif\]-->/gi, '')
      // Remove Word XML namespace elements (<o:p>, <w:...>, <m:...>)
      .replace(/<\/?(?:o|w|m):[^>]*>/gi, '')
      // Strip mso-* properties from inline styles but keep the rest
      .replace(/style="([^"]*)"/gi, (_match, style: string) => {
        const cleaned = style
          .split(';')
          .map((s) => s.trim())
          .filter((s) => Boolean(s) && !/^mso-/i.test(s))
          .join('; ');
        return cleaned ? `style="${cleaned}"` : '';
      })
      // Remove Word class names (MsoNormal, MsoHeading*, etc.)
      .replace(/\bclass="Mso[^"]*"/gi, '')
      // Collapse multiple blank lines left by removed elements
      .replace(/(<p[^>]*>\s*<\/p>\s*){2,}/gi, '<p></p>')
  );
}

export const savePreliminaryReport = (payload: Record<string, string>) => {
  const url = `${restBaseUrl}/procedure`;
  return openmrsFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
};

export const saveProcedure = (orderUuid: string, patientUuid: string) => {
  const url = `${restBaseUrl}/procedure/`;
  return openmrsFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ patientUuid, orderUuid }),
  });
};

export const approvePreliminaryReport = (procedureUuid: string, finalizedReport: string) =>
  openmrsFetch(`${restBaseUrl}/procedure/${procedureUuid}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      procedureReport: finalizedReport,
      status: 'RESULT_AVAILABLE',
      reportLockedAt: new Date().toISOString(),
    }),
  });

export const rejectPreliminaryReport = (procedureUuid: string, revisionComment: string) =>
  openmrsFetch(`${restBaseUrl}/procedure/${procedureUuid}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'REVISION_REQUESTED', revisionComment }),
  });

export const resubmitPreliminaryReport = (procedureUuid: string, findings: string, impression: string) =>
  openmrsFetch(`${restBaseUrl}/procedure/${procedureUuid}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      preliminaryReport: findings,
      impressions: impression,
      status: 'PRELIMINARY',
      revisionComment: null,
    }),
  });

export const amendAndFinalizePreliminaryReport = (procedureUuid: string, findings: string, impression: string) =>
  openmrsFetch(`${restBaseUrl}/procedure/${procedureUuid}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      preliminaryReport: findings,
      impressions: impression,
      procedureReport: findings,
      status: 'RESULT_AVAILABLE',
      reportLockedAt: new Date().toISOString(),
    }),
  });

/** Decodes HTML entities (&lt; → <, &gt; → >, etc.) without stripping tags. */
export function decodeHtmlEntities(html: string): string {
  return html
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#039;', "'")
    .replaceAll('&#39;', "'");
}

/** Strips all HTML tags and decodes common entities, returning plain text. */
export function stripHtml(html: string): string {
  return html
    .replaceAll(/<[^>]*>/g, '')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#039;', "'")
    .trim();
}

export const referOrderExternally = (orderUuid: string, referralReason: string, referralDestination: string) =>
  openmrsFetch(`${restBaseUrl}/procedure`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderUuid, status: 'REFERRED_EXTERNAL', referralReason, referralDestination }),
  });

export const preliminaryReportSchema = z.object({
  preliminaryReport: z.string().min(1, 'Preliminary report findings are required'),
  preliminaryImpression: z.string().min(1, 'Preliminary impression is required'),
});

export type PreliminaryReportPayload = z.infer<typeof preliminaryReportSchema>;
