import type { EditorState, EngineBlock } from '../engine';
import { regionLength } from '../engine/commands/block-helpers';
import { primaryRegion } from '../engine/state/selection';
import type { QuoinLabels } from '../i18n/labels';
import { headingLevel } from '../engine/render/heading-level';

const LIST_KINDS: ReadonlySet<unknown> = new Set(['bullet', 'ordered', 'task']);

function holdsHead({ selection }: EditorState, block: EngineBlock): boolean {
  return selection?.kind === 'text' && selection.head.block === block.id;
}

function markdownPlaceholder(state: EditorState, block: EngineBlock, labels: QuoinLabels): string | undefined {
  const { kind, level } = block.attrs;
  if (kind === 'heading') return labels.placeholderHeading(headingLevel(level));
  if (LIST_KINDS.has(kind)) return labels.placeholderList;
  if (kind === 'quote') return labels.placeholderQuote;
  if (kind !== 'paragraph') return undefined;
  return holdsHead(state, block) || state.doc.blocks.length === 1 ? labels.placeholderEmpty : undefined;
}

/**
 * What an empty block shows until something is typed: the name of its kind, or for a paragraph the slash menu hint,
 * only where the caret is or when it is the only block. A block with text, or with no text to type, shows nothing.
 */
export function placeholderFor(state: EditorState, block: EngineBlock, labels: QuoinLabels): string | undefined {
  const region = primaryRegion(state.schema, block);
  if (region === null || regionLength(block, region) > 0) return undefined;
  switch (block.type) {
    case 'MARKDOWN':
      return markdownPlaceholder(state, block, labels);
    case 'CALLOUT':
      return labels.blockNames.callout;
    case 'TOGGLE':
      return labels.blockNames.toggle;
    default:
      return undefined;
  }
}
