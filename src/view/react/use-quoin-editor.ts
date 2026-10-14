import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { EditorState, Extension, Pos, QuoinBlock, Transaction } from '../../engine';
import { createEditor } from '../../engine/extension/editor';
import { ViewController } from '../controller/view-controller';
import type { RenderOptions } from '../dom/render-inline';
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect';

export type UseQuoinEditorOptions = {
  blocks: QuoinBlock[];
  onChange: (blocks: QuoinBlock[]) => void;
  extensions?: readonly Extension[];
  readOnly?: boolean;
  onTransaction?: (tr: Transaction, state: EditorState) => void;
  onFiles?: (files: File[], at: Pos | null) => void;
  render?: RenderOptions;
};

type Callbacks = Pick<UseQuoinEditorOptions, 'onChange' | 'onTransaction' | 'onFiles'>;

// The editor, its extensions and its render options are read once. The callbacks are read through a ref, so a new
// function identity on every render changes nothing.
export function useQuoinEditor(options: UseQuoinEditorOptions): ViewController {
  const { blocks, readOnly = false } = options;
  const callbacks = useRef<Callbacks>(options);
  const [controller] = useState(() => {
    const editor = createEditor({
      blocks,
      extensions: options.extensions,
      onChange: (next) => callbacks.current.onChange(next),
      onTransaction: (tr, state) => callbacks.current.onTransaction?.(tr, state),
    });
    return new ViewController({
      editor,
      flush: flushSync,
      render: options.render,
      readOnly,
      onFiles: (files, at) => callbacks.current.onFiles?.(files, at),
    });
  });

  useIsomorphicLayoutEffect(() => {
    callbacks.current = options;
  });
  useIsomorphicLayoutEffect(() => {
    controller.editor.setBlocks(blocks);
  }, [controller, blocks]);
  useIsomorphicLayoutEffect(() => {
    controller.setReadOnly(readOnly);
  }, [controller, readOnly]);
  useEffect(() => () => controller.destroy(), [controller]);

  return controller;
}
