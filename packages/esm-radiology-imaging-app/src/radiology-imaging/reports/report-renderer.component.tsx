import React, { useEffect } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import {
  isHtmlReportContent,
  isNonEmptyReportContent,
  tryParseTipTapDoc,
  unescapeReportHtml,
} from '../workspace/report-content';
import { tiptapExtensions } from '../workspace/tiptap-extensions';

interface ReportRendererProps {
  content: string | null | undefined;
  className?: string;
}

const ReportRenderer: React.FC<ReportRendererProps> = ({ content, className }) => {
  const html = typeof content === 'string' && isHtmlReportContent(content) ? unescapeReportHtml(content.trim()) : '';
  const leftoverJson = !html && content ? tryParseTipTapDoc(content) : null;
  const editor = useEditor({
    extensions: tiptapExtensions,
    content: '',
    editable: false,
  });

  useEffect(() => {
    if (!editor || html || !content) {
      return;
    }
    const parsed = tryParseTipTapDoc(content);
    if (parsed) {
      editor.commands.setContent(parsed);
    }
  }, [content, editor, html]);

  if (!content || !isNonEmptyReportContent(content)) {
    return null;
  }

  if (html) {
    return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
  }

  if (!leftoverJson || !editor) {
    return null;
  }

  return <EditorContent editor={editor} className={className} />;
};

export default ReportRenderer;
