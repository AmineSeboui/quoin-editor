import { useRef } from 'react';
import { flushSync } from 'react-dom';
import { renderInline } from '../dom/render-inline';
import { useViewController } from './editor-context';
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect';
import { useReadOnly } from './use-read-only';

// The one host an empty document shows. It is no region of any block, so the first typed character is turned into a
// paragraph here and the caret moves to that paragraph's own host.
export function EmptyDocumentHost({ placeholder }: { placeholder?: string }) {
  const controller = useViewController();
  const ref = useRef<HTMLDivElement>(null);
  const readOnly = useReadOnly(controller);

  useIsomorphicLayoutEffect(() => {
    const host = ref.current;
    if (host === null) return undefined;
    renderInline(host, [], []);
    const onBeforeInput = (event: InputEvent): void => {
      if (controller.readOnly || event.inputType !== 'insertText' || event.isComposing || !event.data) return;
      event.preventDefault();
      event.stopPropagation();
      const { data } = event;
      flushSync(() => controller.editor.insertText(data));
      controller.focus();
    };
    host.addEventListener('beforeinput', onBeforeInput);
    return () => host.removeEventListener('beforeinput', onBeforeInput);
  }, [controller]);

  return (
    <div
      ref={ref}
      contentEditable={!readOnly}
      suppressContentEditableWarning
      role="textbox"
      aria-multiline="true"
      aria-label="Paragraph"
      data-quoin-host=""
      data-quoin-empty=""
      data-placeholder={readOnly ? undefined : placeholder}
      spellCheck
      onClick={() => ref.current?.focus()}
    />
  );
}
