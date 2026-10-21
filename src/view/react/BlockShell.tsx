import { memo, useRef, type CSSProperties } from 'react';
import type { EngineBlock } from '../../engine';
import { alignOrUndefined, paletteOrUndefined } from '../../engine/blocks/data-fields';
import { sameAttrs } from '../../engine/model/attrs';
import { blockDecorationAttrs } from './block-decorations';
import { useBlockDomId } from './block-dom-id';
import type { BlockRenderer } from './block-renderer-types';
import { blockStatus } from './block-status';
import { defaultRenderers, VoidBlockFallback } from './default-renderers';
import { useViewController } from './editor-context';
import { useEditorState } from './use-editor-state';
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect';
import { useReaderChoices } from './use-reader-choices';

type BlockShellProps = {
  block: EngineBlock;
  renderers: Readonly<Record<string, BlockRenderer>>;
};

function rendererFor(renderers: Readonly<Record<string, BlockRenderer>>, type: string): BlockRenderer {
  for (const table of [renderers, defaultRenderers]) if (Object.hasOwn(table, type)) return table[type];
  return VoidBlockFallback;
}

export const BlockShell = memo(function BlockShell({ block, renderers }: BlockShellProps) {
  const controller = useViewController();
  const ref = useRef<HTMLDivElement>(null);
  const domId = useBlockDomId();
  const choices = useReaderChoices(controller);
  const status = useEditorState(controller, (state) => blockStatus(state, block.id, choices));
  const decorated = useEditorState(controller, () => blockDecorationAttrs(controller.editor, block.id), sameAttrs);
  const hidden = status === 'hidden';

  useIsomorphicLayoutEffect(() => {
    const element = ref.current;
    return hidden || element === null ? undefined : controller.registerBlockElement(block.id, element);
  }, [controller, block.id, hidden]);

  if (hidden) return null;
  const Renderer = rendererFor(renderers, block.type);
  const { kind, color, background, align } = block.attrs;
  return (
    <div
      {...decorated}
      ref={ref}
      id={domId(block.id)}
      data-quoin-block=""
      data-block-id={block.id}
      data-type={block.type}
      data-kind={typeof kind === 'string' ? kind : undefined}
      data-indent={block.indent}
      data-color={paletteOrUndefined(color)}
      data-bg={paletteOrUndefined(background)}
      data-align={alignOrUndefined(align)}
      style={{ '--quoin-indent': block.indent } as CSSProperties}
      tabIndex={-1}
      data-selected={status === 'selected' ? 'true' : undefined}
    >
      <Renderer block={block} controller={controller} />
    </div>
  );
});
