import { useCallback, useRef } from 'react';
import type { Decoration, EditorState, Inline } from '../../engine';
import { inlineLength } from '../../engine/model/inline';
import { hostDecorations, sameDecorations } from '../controller/host-decorations';
import { regionInline } from '../controller/region-inline';
import { useViewController } from './editor-context';
import { useEditorState } from './use-editor-state';
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect';

export type EditableRegionProps = {
  block: string;
  region: string;
  label: string;
  placeholder?: string;
  className?: string;
};

type Painted = { readonly inline: Inline | undefined; readonly decorations: readonly Decoration[] };

const samePainted = (a: Painted, b: Painted): boolean =>
  a.inline === b.inline && sameDecorations(a.decorations, b.decorations);

export function EditableRegion({ block, region, label, placeholder, className }: EditableRegionProps) {
  const controller = useViewController();
  const ref = useRef<HTMLDivElement>(null);
  const select = useCallback(
    (state: EditorState): Painted => ({
      inline: regionInline(state, block, region),
      decorations: hostDecorations(controller.editor, block, region),
    }),
    [controller, block, region],
  );
  const { inline, decorations } = useEditorState(controller, select, samePainted);
  const empty = inline === undefined || inlineLength(inline) === 0;

  useIsomorphicLayoutEffect(() => {
    const host = ref.current;
    return host === null ? undefined : controller.registry.register(block, region, host);
  }, [controller, block, region]);

  useIsomorphicLayoutEffect(() => {
    controller.renderHost(block, region);
  }, [controller, block, region, inline, decorations]);

  return (
    <div
      ref={ref}
      className={className}
      contentEditable={!controller.readOnly}
      suppressContentEditableWarning
      tabIndex={-1}
      role="textbox"
      aria-multiline="true"
      aria-label={label}
      data-quoin-host=""
      data-placeholder={empty ? placeholder : undefined}
      spellCheck
    />
  );
}
