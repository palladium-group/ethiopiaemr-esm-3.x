import Color from '@tiptap/extension-color';
import { Image as TiptapImage } from '@tiptap/extension-image';
import { Table as TiptapTable } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableRow } from '@tiptap/extension-table-row';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import StarterKit from '@tiptap/starter-kit';

export const tiptapExtensions = [
  StarterKit,
  Underline,
  TextStyle,
  Color,
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  TiptapImage.configure({ inline: false, allowBase64: true }),
  TiptapTable.configure({ resizable: true }),
  TableRow,
  TableHeader,
  TableCell,
];
