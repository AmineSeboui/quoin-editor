import { useRef } from 'react';
import { renderInline } from '../dom/render-inline';
import { useViewController } from './editor-context';
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect';
import { useReadOnly } from './use-read-only';

type EmptyDocumentHostProps = { placeholder?: string; label?: string };

export function EmptyDocumentHost({ placeholder, label = 'Paragraph' }: EmptyDocumentHostProps) {
  const controller = useViewController();
  const ref = useRef<HTMLDivElement>(null);
  const readOnly = useReadOnly(controller);

  useIsomorphicLayoutEffect(() => {
    const host = ref.current;
    if (host === null) return undefined;
    renderInline(host, [], []);
    return controller.registerEmptyHost(host);
  }, [controller]);

  return (
    <div
      ref={ref}
      contentEditable={!readOnly}
      suppressContentEditableWarning
      role="textbox"
      aria-multiline="true"
      aria-readonly={readOnly ? 'true' : undefined}
      aria-label={label}
      data-quoin-host=""
      data-quoin-empty=""
      data-placeholder={readOnly ? undefined : placeholder}
      aria-placeholder={readOnly ? undefined : placeholder}
      spellCheck
      onClick={() => ref.current?.focus()}
    />
  );
}
