import { memo, useRef, type CSSProperties } from 'react';
import type { EngineBlock } from '../../engine';
import type { BlockRenderer } from './block-renderer-types';
import { blockStatus } from './block-status';
import { defaultRenderers, VoidBlockFallback } from './default-renderers';
import { useViewController } from './editor-context';
import { useEditorState } from './use-editor-state';
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect';

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
  const status = useEditorState(controller, (state) => blockStatus(state, block.id));
  const hidden = status === 'hidden';

  useIsomorphicLayoutEffect(() => {
    const element = ref.current;
    return hidden || element === null ? undefined : controller.registerBlockElement(block.id, element);
  }, [controller, block.id, hidden]);

  if (hidden) return null;
  const Renderer = rendererFor(renderers, block.type);
  const { kind } = block.attrs;
  return (
    <div
      ref={ref}
      data-quoin-block=""
      data-block-id={block.id}
      data-type={block.type}
      data-kind={typeof kind === 'string' ? kind : undefined}
      data-indent={block.indent}
      style={{ '--quoin-indent': block.indent } as CSSProperties}
      tabIndex={-1}
      data-selected={status === 'selected' ? 'true' : undefined}
    >
      <Renderer block={block} controller={controller} />
    </div>
  );
});
