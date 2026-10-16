import { useRef } from 'react';
import { focusSink, heldBySink } from '../selection/selection-sink';
import { useViewController } from './editor-context';
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect';
import { useReadOnly } from './use-read-only';

// Holds the focus and the text of a selection across blocks or of whole blocks. The controller fills it, never React.
export function SelectionSink({ label = 'Selected content' }: { label?: string }) {
  const controller = useViewController();
  const ref = useRef<HTMLDivElement>(null);
  const readOnly = useReadOnly(controller);

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
      aria-label={label}
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
