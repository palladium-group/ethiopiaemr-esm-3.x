export interface TipTapDoc {
  type: 'doc';
  content?: unknown[];
}

export const emptyTipTapDoc: TipTapDoc = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

export function tryParseTipTapDoc(stored: string | object | null | undefined): TipTapDoc | null {
  if (stored && typeof stored === 'object' && (stored as { type?: string }).type === 'doc') {
    return stored as TipTapDoc;
  }

  if (!stored || typeof stored !== 'string') {
    return null;
  }

  const trimmed = stored.trim();
  if (!trimmed.startsWith('{')) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed) as { type?: string };
    if (parsed && parsed.type === 'doc') {
      return parsed as TipTapDoc;
    }
  } catch {
    return null;
  }

  return null;
}

export function parseReportContent(stored: string | object | null | undefined): TipTapDoc {
  return tryParseTipTapDoc(stored) ?? emptyTipTapDoc;
}

export function stringifyTipTapDoc(doc: unknown): string {
  return JSON.stringify(doc);
}

/** Iteratively unescapes entities so REST-escaped HTML (`&lt;p&gt;`) becomes real markup. */
export function unescapeReportHtml(value: string): string {
  let result = value;
  let previous: string;
  do {
    previous = result;
    result = result
      .replaceAll('&amp;', '&')
      .replaceAll('&lt;', '<')
      .replaceAll('&gt;', '>')
      .replaceAll('&quot;', '"')
      .replaceAll('&#039;', "'")
      .replaceAll('&#39;', "'")
      .replaceAll('&nbsp;', ' ');
  } while (result !== previous);
  return result;
}

/** Content TipTap `setContent` accepts: leftover JSON docs or saved HTML. */
export function toEditorContent(stored: string | object | null | undefined): TipTapDoc | string {
  const doc = tryParseTipTapDoc(stored);
  if (doc) {
    return doc;
  }
  return typeof stored === 'string' ? unescapeReportHtml(stored) : '';
}

export function isHtmlReportContent(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }
  return unescapeReportHtml(value.trim()).startsWith('<');
}

function collectText(node: unknown): string {
  if (!node || typeof node !== 'object') {
    return '';
  }

  const value = node as { text?: string; content?: unknown[] };
  const own = typeof value.text === 'string' ? value.text : '';
  const children = Array.isArray(value.content) ? value.content.map(collectText).join('') : '';
  return `${own}${children}`;
}

export function stripHtmlText(html: string): string {
  return unescapeReportHtml(html)
    .replaceAll(/<[^>]*>/g, '')
    .trim();
}

export function isNonEmptyReportContent(value: string): boolean {
  const doc = tryParseTipTapDoc(value);
  if (doc) {
    return collectText(doc).trim().length > 0;
  }

  return stripHtmlText(value).length > 0;
}
