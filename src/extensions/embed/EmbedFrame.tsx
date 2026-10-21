'use client';

import { useCallback, useMemo, useRef } from 'react';
import type { EditorState } from '../../engine';
import { EMBED_FRAME } from '../../engine/render/embed-provider';
import { focusNode } from '../../blocks/void/select-node';
import { useNodeKeys } from '../../blocks/void/use-node-keys';
import type { ViewController } from '../../view';
import { useEditorState } from '../../view/react/use-editor-state';
import type { EmbedLabels } from './embed-labels';
import { playerHeight } from './embed-player';
import type { EmbedMatch } from './providers';
import { useCoverPress } from './use-cover-press';

type EmbedFrameProps = {
  blockId: string;
  controller: ViewController;
  match: EmbedMatch;
  labels: EmbedLabels;
  readOnly: boolean;
};

/**
 * The provider's frame. On an editable canvas a cover takes the first press, which selects the block rather than
 * sending focus into a frame the editor could never take it back from. The cover lifts while the block is selected as a
 * whole, and Enter on the selected block moves focus into the frame, which is otherwise kept out of the tab order.
 */
export function EmbedFrame({ blockId, controller, match, labels, readOnly }: EmbedFrameProps) {
  const root = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const selected = useEditorState(
    controller,
    useCallback(({ selection }: EditorState) => selection?.kind === 'node' && selection.block === blockId, [blockId]),
  );
  const cover = useCoverPress(controller);
  // Firefox drops focus moved into a cross-origin frame while the key that asked for it is still being handled.
  const keys = useMemo(() => ({ enter: () => void setTimeout(() => frame.current?.focus()) }), []);
  useNodeKeys(controller, blockId, !readOnly, true, root, keys);
  const height = playerHeight(match.provider);

  return (
    <div
      ref={root}
      className="quoin-embed-frame"
      {...(height === undefined ? undefined : { 'data-player': '', style: { height } })}
    >
      <iframe
        ref={frame}
        src={match.src}
        title={labels.frameTitle(match.provider)}
        sandbox={EMBED_FRAME.sandbox}
        loading={EMBED_FRAME.loading}
        referrerPolicy={EMBED_FRAME.referrerpolicy}
        tabIndex={readOnly ? undefined : -1}
      />
      {!readOnly && (!selected || cover.pressing) && (
        <div
          aria-hidden="true"
          className="quoin-embed-cover"
          onPointerDownCapture={cover.onPress}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => focusNode(controller, blockId)}
        />
      )}
    </div>
  );
}
