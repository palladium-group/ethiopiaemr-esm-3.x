import React, { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, OverflowMenu, OverflowMenuItem } from '@carbon/react';
import {
  Image as ImageIcon,
  ListBulleted,
  ListNumbered,
  Quotes,
  Redo,
  Table as TableIcon,
  TextAlignCenter,
  TextAlignLeft,
  TextAlignRight,
  TextBold,
  TextItalic,
  TextStrikethrough,
  TextUnderline,
  Undo,
} from '@carbon/react/icons';
import type { Editor } from '@tiptap/react';
import styles from './preliminary-workspace.scss';

interface PreliminaryEditorToolbarProps {
  editor: Editor;
}

const PreliminaryEditorToolbar: React.FC<PreliminaryEditorToolbarProps> = ({ editor }) => {
  const { t } = useTranslation();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const isInTable = editor.isActive('table');

  const insertTable = useCallback(() => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  const handleImageSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          editor.chain().focus().setImage({ src: reader.result }).run();
        }
      };
      reader.readAsDataURL(file);

      // Reset so selecting the same file again still fires onChange
      event.target.value = '';
    },
    [editor],
  );

  return (
    <div className={styles.toolbar}>
      <Button
        kind="ghost"
        size="sm"
        hasIconOnly
        iconDescription={t('bold', 'Bold')}
        renderIcon={TextBold}
        isSelected={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <Button
        kind="ghost"
        size="sm"
        hasIconOnly
        iconDescription={t('italic', 'Italic')}
        renderIcon={TextItalic}
        isSelected={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <Button
        kind="ghost"
        size="sm"
        hasIconOnly
        iconDescription={t('underline', 'Underline')}
        renderIcon={TextUnderline}
        isSelected={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      />
      <Button
        kind="ghost"
        size="sm"
        hasIconOnly
        iconDescription={t('strikethrough', 'Strikethrough')}
        renderIcon={TextStrikethrough}
        isSelected={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      />
      <span className={styles.divider} />
      <Button
        kind="ghost"
        size="sm"
        hasIconOnly
        iconDescription={t('alignLeft', 'Align left')}
        renderIcon={TextAlignLeft}
        isSelected={editor.isActive({ textAlign: 'left' })}
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
      />
      <Button
        kind="ghost"
        size="sm"
        hasIconOnly
        iconDescription={t('alignCenter', 'Align center')}
        renderIcon={TextAlignCenter}
        isSelected={editor.isActive({ textAlign: 'center' })}
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
      />
      <Button
        kind="ghost"
        size="sm"
        hasIconOnly
        iconDescription={t('alignRight', 'Align right')}
        renderIcon={TextAlignRight}
        isSelected={editor.isActive({ textAlign: 'right' })}
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
      />
      <span className={styles.divider} />
      <Button
        kind="ghost"
        size="sm"
        hasIconOnly
        iconDescription={t('bulletList', 'Bullet list')}
        renderIcon={ListBulleted}
        isSelected={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <Button
        kind="ghost"
        size="sm"
        hasIconOnly
        iconDescription={t('orderedList', 'Ordered list')}
        renderIcon={ListNumbered}
        isSelected={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
      <Button
        kind="ghost"
        size="sm"
        hasIconOnly
        iconDescription={t('blockquote', 'Blockquote')}
        renderIcon={Quotes}
        isSelected={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      />
      <span className={styles.divider} />
      <Button
        kind="ghost"
        size="sm"
        hasIconOnly
        iconDescription={t('insertTable', 'Insert table')}
        renderIcon={TableIcon}
        isSelected={isInTable}
        onClick={insertTable}
      />
      <span style={isInTable ? undefined : { opacity: 0.5, pointerEvents: 'none' }}>
        <OverflowMenu
          size="sm"
          aria-label={t('tableOptions', 'Table options')}
          iconDescription={t('tableOptions', 'Table options')}
          flipped>
          <OverflowMenuItem
            itemText={t('addRowAbove', 'Add row above')}
            onClick={() => editor.chain().focus().addRowBefore().run()}
          />
          <OverflowMenuItem
            itemText={t('addRowBelow', 'Add row below')}
            onClick={() => editor.chain().focus().addRowAfter().run()}
          />
          <OverflowMenuItem
            itemText={t('addColumnLeft', 'Add column left')}
            onClick={() => editor.chain().focus().addColumnBefore().run()}
          />
          <OverflowMenuItem
            itemText={t('addColumnRight', 'Add column right')}
            onClick={() => editor.chain().focus().addColumnAfter().run()}
          />
          <OverflowMenuItem
            itemText={t('toggleHeaderRow', 'Toggle header row')}
            onClick={() => editor.chain().focus().toggleHeaderRow().run()}
          />
          <OverflowMenuItem
            hasDivider
            isDelete
            itemText={t('deleteRow', 'Delete row')}
            onClick={() => editor.chain().focus().deleteRow().run()}
          />
          <OverflowMenuItem
            isDelete
            itemText={t('deleteColumn', 'Delete column')}
            onClick={() => editor.chain().focus().deleteColumn().run()}
          />
          <OverflowMenuItem
            isDelete
            itemText={t('deleteTable', 'Delete table')}
            onClick={() => editor.chain().focus().deleteTable().run()}
          />
        </OverflowMenu>
      </span>
      <Button
        kind="ghost"
        size="sm"
        hasIconOnly
        iconDescription={t('insertImage', 'Insert image')}
        renderIcon={ImageIcon}
        onClick={() => imageInputRef.current?.click()}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className={styles.hiddenInput}
        onChange={handleImageSelect}
      />
      <span className={styles.divider} />
      <Button
        kind="ghost"
        size="sm"
        hasIconOnly
        iconDescription={t('undo', 'Undo')}
        renderIcon={Undo}
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
      />
      <Button
        kind="ghost"
        size="sm"
        hasIconOnly
        iconDescription={t('redo', 'Redo')}
        renderIcon={Redo}
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
      />
    </div>
  );
};

export default PreliminaryEditorToolbar;
