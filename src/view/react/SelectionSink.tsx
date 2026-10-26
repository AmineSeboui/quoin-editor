import { useCallback, useRef } from 'react';
import type { EditorState } from '../../engine';
import { focusSink, heldBySink, selectedBlockName, type BlockLabel } from '../selection/selection-sink';
import { useViewController } from './editor-context';
import { useEditorState } from './use-editor-state';
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect';
import { useReadOnly } from './use-read-only';

type SelectionSinkProps = { label?: string; blockLabel?: BlockLabel };

// Holds the focus and the text of a selection across blocks or of whole blocks. The controller fills it, never React.
// A block selected as a whole names it, is no multi-line field and asks for no virtual keyboard, which a tap on a
// picture should not raise.
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
    return sink ? controller.registerSink(sink) : undefined;
  }, [controller]);

  return (
    <div
      ref={ref}
      contentEditable={!readOnly}
      suppressContentEditableWarning
      role="textbox"
      aria-label={name || label}
      inputMode={name === null ? undefined : 'none'}
      aria-multiline={name === null ? 'true' : undefined}
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
