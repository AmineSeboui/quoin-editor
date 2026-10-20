import type { EditorState, Inline } from '../../engine';
import { inlineText, sliceInline } from '../../engine/model/inline';
import { hasMark } from '../../engine/model/marks';
import { isCollapsed } from '../../engine/state/selection';
import type { SuggestionRange } from '../../extensions/ui-types';

export type TriggerConfig = { char: string; allowSpaces?: boolean; startOfLine?: boolean; maxLength?: number };
export type ActiveTrigger = SuggestionRange & { query: string };

const DEFAULT_MAX_LENGTH = 40;
const NO_TRIGGER_TYPES = new Set(['CODE', 'TABLE']);
const WHITESPACE = /\s/;
const ATOM = '\uFFFC';

const hasCode = (inline: Inline) => inline.some((node) => hasMark(node.marks, 'code'));

function triggerOffset(text: string, start: number, config: TriggerConfig): number | null {
  const { char, allowSpaces = false, startOfLine = false } = config;
  const earliest = Math.max(0, text.length - (config.maxLength ?? DEFAULT_MAX_LENGTH) - 1);
  for (let i = text.length - 1; i >= earliest; i--) {
    const character = text[i];
    if (character === '\n' || character === ATOM) return null;
    if (character === char) {
      const atRegionStart = start + i === 0;
      if (atRegionStart || (!startOfLine && i > 0 && WHITESPACE.test(text[i - 1]))) return start + i;
    }
    if (!allowSpaces && WHITESPACE.test(character)) return null;
  }
  return null;
}

export function findTrigger(state: EditorState, config: TriggerConfig): ActiveTrigger | null {
  const { doc, selection } = state;
  if (selection?.kind !== 'text' || !isCollapsed(selection)) return null;
  const { block: blockId, region, offset: caret } = selection.head;
  const block = doc.blocks[doc.index.get(blockId) ?? -1];
  if (block === undefined || NO_TRIGGER_TYPES.has(block.type) || !Object.hasOwn(block.regions, region)) return null;
  const inline = block.regions[region];
  const start = Math.max(0, caret - (config.maxLength ?? DEFAULT_MAX_LENGTH) - 2);
  const from = triggerOffset(inlineText(sliceInline(inline, start, caret)), start, config);
  if (from === null || hasCode(sliceInline(inline, from, caret))) return null;
  const query = inlineText(sliceInline(inline, from + 1, caret));
  return { block: blockId, region, from, to: caret, query };
}
