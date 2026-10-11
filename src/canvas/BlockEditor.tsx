'use client';

import { useQuoin } from '../context';
import { blockByType } from '../registry';
import type { BlockEditorProps } from '../types';

export function BlockEditor({
  type,
  data,
  onChange,
  onInsertBlock,
  onDone,
}: BlockEditorProps & { type: string }) {
  const { blockTypes } = useQuoin();
  const Editor = blockByType(blockTypes, type)?.editor;
  if (!Editor) return null;
  return <Editor data={data} onChange={onChange} onInsertBlock={onInsertBlock} onDone={onDone} />;
}
