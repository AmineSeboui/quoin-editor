import { useState } from 'react';
import type { QuoinBlock } from '../../engine/model/quoin-block';
import type { ViewController } from '../controller/view-controller';
import { EditorView, type EditorViewProps } from './EditorView';
import { useQuoinEditor, type UseQuoinEditorOptions } from './use-quoin-editor';

type EditorProps = {
  options: UseQuoinEditorOptions;
  view?: Partial<EditorViewProps>;
  onController?: (controller: ViewController) => void;
};

export function Editor({ options, view, onController }: EditorProps) {
  const controller = useQuoinEditor(options);
  onController?.(controller);
  return <EditorView controller={controller} aria-label="Doc" {...view} />;
}

type StatefulProps = Omit<EditorProps, 'options'> & {
  blocks: QuoinBlock[];
  options?: Partial<UseQuoinEditorOptions>;
};

// Holds the blocks the way a host does: whatever onChange reports is what comes back in.
export function Stateful({ blocks, options, ...rest }: StatefulProps) {
  const [current, setCurrent] = useState(blocks);
  const onChange = (next: QuoinBlock[]) => {
    setCurrent(next);
    options?.onChange?.(next);
  };
  return <Editor {...rest} options={{ ...options, blocks: current, onChange }} />;
}

export const md = (id: string, markdown: string, indent?: number): QuoinBlock => ({
  id,
  type: 'MARKDOWN',
  data: { markdown },
  ...(indent === undefined ? {} : { indent }),
});

export const hostOf = (container: HTMLElement, id: string): HTMLElement => {
  const shell = container.querySelector(`[data-block-id="${id}"]`);
  const host = shell?.querySelector<HTMLElement>('[data-quoin-host]');
  if (!host) throw new Error(`no host in block ${id}`);
  return host;
};
