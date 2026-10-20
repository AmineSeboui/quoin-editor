import { useCallback, useRef } from 'react';
import type { EditorState, EngineBlock } from '../../engine';
import { focusSink, heldBySink, selectedBlockName } from '../selection/selection-sink';
import { useViewController } from './editor-context';
import { useEditorState } from './use-editor-state';
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect';
import { useReadOnly } from './use-read-only';

type SelectionSinkProps = { label?: string; blockLabel?: (block: EngineBlock) => string };

// Holds the focus and the text of a selection across blocks or of whole blocks. The controller fills it, never React.
// A block selected as a whole names it, and asks for no virtual keyboard, which a tap on a picture should not raise.
export function SelectionSink({ label = 'Selected content', blockLabel }: SelectionSinkProps) {
  const controller = useViewController();
  const ref = useRef<HTMLDivElement>(null);
  const readOnly = useReadOnly(controller);
  const name = useEditorState(
    controller,
    useCallback((state: EditorState) => selectedBlockName(state, blockLabel), [blockLabel]),
  );

  useIsomorphicLayoutEffect(() => {
    const sink = ref.current;
    return sink === null ? undefined : controller.registerSink(sink);
  }, [controller]);

  return (
    <div
      ref={ref}
      contentEditable={!readOnly}
      suppressContentEditableWarning
      role="textbox"
      aria-label={name || label}
      inputMode={name === null ? undefined : 'none'}
      aria-multiline="true"
      aria-readonly={readOnly ? 'true' : undefined}
      tabIndex={-1}
      spellCheck={false}
      data-quoin-sink=""
      onFocus={() => {
        if (heldBySink(controller.editor.state.selection)) focusSink(controller);
      }}
    />
  );
}
