'use client';

import { useCallback, useEffect, useRef, type KeyboardEvent, type MouseEvent } from 'react';
import { Pencil } from 'lucide-react';
import { useQuoin } from '../../context';
import { devWarn } from '../../dev-warn';
import type { AnyBlockDefinition } from '../../registry';
import type { BlockPreviewProps } from '../../types';
import { Button } from '../../ui/button';
import type { BlockRenderProps } from '../../view';
import { useReadOnly } from '../../view/react/use-read-only';
import { NATIVE_INTERACTION } from '../../view/selection/native-interaction';
import { insertAfterBlock, readBlockData, writeBlockData } from './block-data';
import { selectNode } from './select-node';
import { useEditingFocus } from './use-editing-focus';
import { useVoidEditing } from './use-void-editing';

const INTERACTIVE = 'a, button, input, textarea, select, label, iframe, [role="button"]';

const isInteractive = (event: MouseEvent) => (event.target as Element).closest(INTERACTIVE) !== null;

function useMissingPreviewWarning(readOnly: boolean, { type, preview }: AnyBlockDefinition): void {
  useEffect(() => {
    if (!readOnly || preview !== undefined) return;
    devWarn(
      `the block type "${type}" has no \`preview\`, so a read-only canvas can draw only its label. ` +
        'Give its definition a `preview` to render the block itself.',
    );
  }, [readOnly, type, preview]);
}

function VoidPreview({ definition, ...props }: BlockPreviewProps & { definition: AnyBlockDefinition }) {
  const { preview: Preview, label } = definition;
  if (Preview === undefined) return <p className="py-1 text-sm text-muted-foreground">{label}</p>;
  return <Preview {...props} />;
}

export function VoidBlock({ block, controller, definition }: BlockRenderProps & { definition: AnyBlockDefinition }) {
  const { blockTypes, labels } = useQuoin();
  const readOnly = useReadOnly(controller);
  const { editor: Editor, alwaysEditing = false, label } = definition;
  const blockId = block.id;
  const editable = Editor !== undefined && !readOnly;
  const { editing, start, stop } = useVoidEditing(controller, blockId, editable);
  const root = useRef<HTMLDivElement>(null);
  const onBlur = useEditingFocus(root, editing, stop);
  useMissingPreviewWarning(readOnly, definition);

  const select = useCallback(() => {
    selectNode(controller, blockId);
    controller.focus();
  }, [controller, blockId]);
  const leave = useCallback(() => {
    stop();
    select();
  }, [stop, select]);
  const onChange = useCallback(
    (data: Record<string, unknown>) => writeBlockData(controller, blockId, data),
    [controller, blockId],
  );
  const onInsertBlock = useCallback(
    (type: string) => {
      insertAfterBlock(controller, blockId, type, blockTypes);
      stop();
      // A block left node-selected is opening its editor, which takes focus itself.
      if (controller.editor.state.selection?.kind !== 'node') controller.focus();
    },
    [controller, blockId, blockTypes, stop],
  );

  const editorShown = editable && (alwaysEditing || editing);
  const data = readBlockData(controller, block);

  // Escape that closed a portalled overlay still bubbles here through the React tree, so only a key pressed in the
  // block's own DOM leaves the editor.
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !editorShown || !root.current?.contains(event.target as Node)) return;
    event.preventDefault();
    leave();
  };
  const onClick = (event: MouseEvent) => {
    if (!editorShown && !isInteractive(event)) select();
  };
  const onDoubleClick = (event: MouseEvent) => {
    if (editable && !editorShown && !isInteractive(event)) start();
  };

  return (
    <div
      ref={root}
      className="group/void relative"
      contentEditable={false}
      role="group"
      aria-label={label}
      tabIndex={editorShown ? -1 : undefined}
      {...{ [NATIVE_INTERACTION]: editorShown ? '' : undefined }}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      {editorShown && Editor ? (
        <Editor data={data} onChange={onChange} onInsertBlock={onInsertBlock} onDone={leave} />
      ) : (
        <VoidPreview definition={definition} data={data} blockId={blockId} />
      )}
      {editable && !editorShown && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          tabIndex={-1}
          aria-label={labels.editBlock(label)}
          onClick={() => start()}
          className="absolute right-0 top-0 bg-background/90 opacity-0 group-hover/void:opacity-100 in-data-[selected=true]:opacity-100 pointer-coarse:opacity-100 focus-visible:opacity-100"
        >
          <Pencil aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}
