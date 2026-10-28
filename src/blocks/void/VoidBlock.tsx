'use client';

import { useCallback, useContext, useEffect, useMemo, useRef, type KeyboardEvent, type MouseEvent } from 'react';
import { Pencil } from 'lucide-react';
import { useQuoin } from '../../context';
import { devWarn } from '../../dev-warn';
import { blockTypeLabel } from '../../gutter/block-type-label';
import { parsedData, type AnyBlockDefinition } from '../../registry';
import type { BlockPreviewProps } from '../../types';
import { Button } from '../../ui/button';
import type { BlockRenderProps } from '../../view';
import { BlockErrorContext } from '../../view/react/block-error-context';
import { useReadOnly } from '../../view/react/use-read-only';
import { NATIVE_INTERACTION } from '../../view/selection/native-interaction';
import { insertAfterBlock, readBlockData, writeBlockData } from './block-data';
import { isInteractive } from './interactive-target';
import { deleteBlock } from './node-toolbar-items';
import { focusNode, selectNode } from './select-node';
import { useBlockIndex } from './use-block-index';
import { useEditingFocus } from './use-editing-focus';
import { useVoidEditing } from './use-void-editing';


function useMissingPreviewWarning(readOnly: boolean, { type, preview }: AnyBlockDefinition): void {
  useEffect(() => {
    if (!readOnly || preview !== undefined) return;
    devWarn(
      `the block type "${type}" has no \`preview\`, so a read-only canvas can draw only its label. ` +
        'Give its definition a `preview` to render the block itself.',
    );
  }, [readOnly, type, preview]);
}

type VoidPreviewProps = BlockPreviewProps & { definition: AnyBlockDefinition; name: string };

function VoidPreview({ definition: { preview: Preview }, name, ...props }: VoidPreviewProps) {
  if (Preview === undefined) return <p className="py-1 text-sm text-muted-foreground">{name}</p>;
  return <Preview {...props} />;
}

export function VoidBlock({ block, controller, definition }: BlockRenderProps & { definition: AnyBlockDefinition }) {
  const { blockTypes, labels } = useQuoin();
  const { report } = useContext(BlockErrorContext);
  const readOnly = useReadOnly(controller);
  const { editor: Editor, alwaysEditing = false } = definition;
  const name = blockTypeLabel(labels, block, blockTypes);
  const blockId = block.id;
  const editable = Editor !== undefined && !readOnly;
  const { editing, start, stop } = useVoidEditing(controller, blockId, editable);
  const index = useBlockIndex(controller, blockId);
  const root = useRef<HTMLDivElement>(null);
  const focusHandlers = useEditingFocus(root, editing, stop);
  useMissingPreviewWarning(readOnly, definition);

  const select = useCallback(() => focusNode(controller, blockId), [controller, blockId]);
  const leave = useCallback(() => {
    stop();
    select();
  }, [stop, select]);
  const onChange = useCallback(
    (data: Record<string, unknown>) => writeBlockData(controller, blockId, data),
    [controller, blockId],
  );
  // WebKit does not focus a clicked checkbox, which leaves focus on the block's shell, and the write would then hand it
  // to the last caret. A write made while focus is elsewhere, as after an await, leaves the selection alone.
  const onPreviewChange = useCallback(
    (data: Record<string, unknown>) => {
      writeBlockData(controller, blockId, data);
      const shell = root.current?.closest('[data-block-id]');
      const focused = root.current?.ownerDocument.activeElement ?? null;
      if (!shell?.contains(focused)) return;
      if (root.current?.contains(focused)) selectNode(controller, blockId);
      else select();
    },
    [controller, blockId, select],
  );
  const onRemove = useCallback(() => deleteBlock(controller, blockId), [controller, blockId]);
  const onInsertBlock = useCallback(
    (type: string) => {
      if (!insertAfterBlock(controller, blockId, type, blockTypes, report)) return;
      stop();
      // A block left node-selected is opening its editor, which takes focus itself.
      if (controller.editor.state.selection?.kind !== 'node') controller.focus();
    },
    [controller, blockId, blockTypes, report, stop],
  );

  const editorShown = editable && (alwaysEditing || editing);
  const data = useMemo(() => parsedData(definition, readBlockData(controller, block)), [definition, controller, block]);

  // Escape that closed a portalled overlay still bubbles here through the React tree, so only a key pressed in the
  // block's own DOM leaves the editor.
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !editorShown || !root.current?.contains(event.target as Node)) return;
    event.preventDefault();
    leave();
  };
  const onClick = (event: MouseEvent) => {
    if (!editorShown && !isInteractive(root.current, event)) select();
  };
  const onDoubleClick = (event: MouseEvent) => {
    if (editable && !editorShown && !isInteractive(root.current, event)) start();
  };

  return (
    <div
      ref={root}
      className="group/void relative"
      contentEditable={false}
      role="group"
      aria-label={name}
      tabIndex={editorShown ? -1 : undefined}
      {...{ [NATIVE_INTERACTION]: editorShown ? '' : undefined }}
      onKeyDown={onKeyDown}
      {...focusHandlers}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      {editorShown && Editor ? (
        <Editor
          data={data}
          onChange={onChange}
          blockId={blockId}
          index={index}
          onRemove={onRemove}
          onInsertBlock={onInsertBlock}
          onDone={leave}
        />
      ) : (
        <VoidPreview
          definition={definition}
          name={name}
          data={data}
          blockId={blockId}
          {...(readOnly ? {} : { onChange: onPreviewChange })}
        />
      )}
      {editable && !editorShown && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          tabIndex={-1}
          aria-label={labels.editBlock(name)}
          onClick={() => start()}
          className="absolute right-0 top-0 bg-background/90 opacity-0 group-hover/void:opacity-100 in-data-[selected=true]:opacity-100 pointer-coarse:opacity-100 focus-visible:opacity-100"
        >
          <Pencil aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}
