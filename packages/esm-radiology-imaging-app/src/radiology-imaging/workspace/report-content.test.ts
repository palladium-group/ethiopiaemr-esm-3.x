import {
  isHtmlReportContent,
  isNonEmptyReportContent,
  parseReportContent,
  stripHtmlText,
  toEditorContent,
  tryParseTipTapDoc,
  unescapeReportHtml,
} from './report-content';

const emptyDoc = { type: 'doc' as const, content: [{ type: 'paragraph' }] };
const filledDoc = {
  type: 'doc' as const,
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Findings' }] }],
};

describe('tryParseTipTapDoc', () => {
  it('parses a JSON string document', () => {
    expect(tryParseTipTapDoc(JSON.stringify(filledDoc))).toEqual(filledDoc);
  });

  it('accepts an already-parsed document', () => {
    expect(tryParseTipTapDoc(filledDoc)).toEqual(filledDoc);
  });

  it('returns null for HTML', () => {
    expect(tryParseTipTapDoc('<p>findings</p>')).toBeNull();
  });
});

describe('parseReportContent', () => {
  it('returns an empty document when the stored value is HTML', () => {
    expect(parseReportContent('<p>findings</p>')).toEqual(emptyDoc);
  });

  it('returns an empty document when nothing is stored', () => {
    expect(parseReportContent(undefined)).toEqual(emptyDoc);
  });
});

describe('toEditorContent', () => {
  it('returns a TipTap document for leftover JSON', () => {
    expect(toEditorContent(JSON.stringify(filledDoc))).toEqual(filledDoc);
  });

  it('returns HTML as-is for procedure fields', () => {
    expect(toEditorContent('<p><strong>Findings</strong></p>')).toBe('<p><strong>Findings</strong></p>');
  });

  it('unescapes REST-encoded HTML so the editor can parse tags', () => {
    expect(toEditorContent('&lt;p&gt;&lt;strong&gt;Findings&lt;/strong&gt;&lt;/p&gt;')).toBe(
      '<p><strong>Findings</strong></p>',
    );
  });

  it('returns an empty string when nothing is stored', () => {
    expect(toEditorContent(undefined)).toBe('');
  });
});

describe('isNonEmptyReportContent', () => {
  it('rejects an empty TipTap document', () => {
    expect(isNonEmptyReportContent(JSON.stringify(emptyDoc))).toBe(false);
  });

  it('accepts a TipTap document with text', () => {
    expect(isNonEmptyReportContent(JSON.stringify(filledDoc))).toBe(true);
  });

  it('accepts HTML with text', () => {
    expect(isNonEmptyReportContent('<p><strong>Hello</strong></p>')).toBe(true);
  });

  it('rejects empty HTML from an unused editor', () => {
    expect(isNonEmptyReportContent('<p></p>')).toBe(false);
  });

  it('accepts REST-escaped HTML with text', () => {
    expect(isNonEmptyReportContent('&lt;p&gt;Hello&lt;/p&gt;')).toBe(true);
  });
});

describe('unescapeReportHtml', () => {
  it('turns entity-escaped markup into HTML', () => {
    expect(unescapeReportHtml('&lt;p&gt;Lung bases&lt;/p&gt;')).toBe('<p>Lung bases</p>');
  });

  it('decodes double-escaped markup', () => {
    expect(unescapeReportHtml('&amp;lt;p&amp;gt;Lung bases&amp;lt;/p&amp;gt;')).toBe('<p>Lung bases</p>');
  });
});

describe('isHtmlReportContent', () => {
  it('detects saved and escaped HTML', () => {
    expect(isHtmlReportContent('<p>Hello</p>')).toBe(true);
    expect(isHtmlReportContent('&lt;p&gt;Hello&lt;/p&gt;')).toBe(true);
    expect(isHtmlReportContent(JSON.stringify(filledDoc))).toBe(false);
  });
});

describe('stripHtmlText', () => {
  it('returns visible text only', () => {
    expect(stripHtmlText('<p>Lung <strong>bases</strong></p>')).toBe('Lung bases');
  });
});
