import React, { useMemo } from 'react';
import parse, { type HTMLReactParserOptions } from 'html-react-parser';
import DOMPurify from 'dompurify';
import he from 'he';

interface ReportRendererProps {
  content: string | null | undefined;
  className?: string;
  /** Max decode iterations to prevent pathological inputs from looping. */
  maxDecodeDepth?: number;
  /** Pass-through options for html-react-parser (e.g. custom replace). */
  parserOptions?: HTMLReactParserOptions;
  /** Disable sanitization only if you fully trust the source. */
  sanitize?: boolean;
}

const decodeHtml = (str: string, maxDepth = 5): string => {
  let prev = str;
  let decoded = he.decode(prev);
  let depth = 0;
  while (decoded !== prev && depth < maxDepth) {
    prev = decoded;
    decoded = he.decode(prev);
    depth += 1;
  }
  return decoded;
};

const ReportRenderer: React.FC<ReportRendererProps> = ({
  content,
  className,
  maxDecodeDepth = 5,
  parserOptions,
  sanitize = true,
}) => {
  const parsed = useMemo(() => {
    if (!content || typeof content !== 'string') {
      return null;
    }

    const decoded = decodeHtml(content, maxDecodeDepth);
    const safe = sanitize ? DOMPurify.sanitize(decoded) : decoded;
    return parse(safe, parserOptions);
  }, [content, maxDecodeDepth, parserOptions, sanitize]);

  if (parsed === null) {
    return null;
  }

  return <div className={className}>{parsed}</div>;
};

export default ReportRenderer;
