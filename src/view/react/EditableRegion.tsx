import { useCallback, useContext, useRef } from 'react';
import type { Decoration, EditorState, Inline } from '../../engine';
import { inlineLength } from '../../engine/model/inline';
import { sameDecorations } from '../controller/host-decorations';
import { regionInline } from '../controller/region-inline';
import { BlockPlaceholderContext, regionPlaceholder } from './block-placeholder';
import { useViewController } from './editor-context';
import { useEditorState } from './use-editor-state';
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect';
import { useReadOnly } from './use-read-only';

export type EditableRegionProps = {
  block: string;
  region: string;
  label: string;
  /** An id for the host, for a control that the host's text names. */
  id?: string;
  placeholder?: string;
  className?: string;
};

type Painted = {
  readonly inline: Inline | undefined;
  readonly decorations: readonly Decoration[];
  readonly placeholder: string | undefined;
};

const samePainted = (a: Painted, b: Painted): boolean =>
  a.inline === b.inline && a.placeholder === b.placeholder && sameDecorations(a.decorations, b.decorations);

export function EditableRegion({ block, region, label, id, placeholder, className }: EditableRegionProps) {
  const controller = useViewController();
  const placeholderOf = useContext(BlockPlaceholderContext);
  const ref = useRef<HTMLDivElement>(null);
  const readOnly = useReadOnly(controller);
  const select = useCallback(
    (state: EditorState): Painted => {
      const inline = regionInline(state, block, region);
      const empty = inline === undefined || inlineLength(inline) === 0;
      return {
        inline,
        decorations: controller.decorationsFor(block, region),
        placeholder: empty ? (placeholder ?? regionPlaceholder(state, block, region, placeholderOf)) : undefined,
      };
    },
    [controller, block, region, placeholder, placeholderOf],
  );
  const { inline, decorations, placeholder: shown } = useEditorState(controller, select, samePainted);

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
      id={id}
      className={className}
      contentEditable={!readOnly}
      suppressContentEditableWarning
      tabIndex={-1}
      role="textbox"
      aria-multiline="true"
      aria-readonly={readOnly ? 'true' : undefined}
      aria-label={label}
      data-quoin-host=""
      data-placeholder={readOnly ? undefined : shown}
      aria-placeholder={readOnly ? undefined : shown}
      spellCheck
    />
  );
}
