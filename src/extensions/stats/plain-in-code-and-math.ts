import type { Inline, InputRule } from '../../engine';
import { sliceInline } from '../../engine/model/inline';
import { hasMark } from '../../engine/model/marks';
import { regionInline } from '../../engine/rules/region-inline';
import { opensUnclosedMath } from '../math/math-opener';

// Neither a dollar, a backtick nor a space, so it opens and closes nothing.
const OPAQUE = '￼';

// A closed code span is read whole, as the parser reads it, so a dollar or a backtick it holds opens nothing.
const scanned = (inline: Inline): string =>
  inline.map((node) => (node.kind === 'text' && !hasMark(node.marks, 'code') ? node.text : OPAQUE)).join('');

// A closing run as long as the opening one ends a code span, as the markdown parser reads backticks.
function opensUnclosedCode(src: string): boolean {
  let open = 0;
  for (const run of src.match(/`+/g) ?? []) open = open === 0 ? run.length : open === run.length ? 0 : open;
  return open > 0;
}

/**
 * The rules, each firing only outside a formula or a code span: text after a dollar that opens a formula, or a run of
 * backticks that opens a code span, with nothing typed yet to close it, is left as it is typed.
 */
export const plainInCodeAndMath = (rules: readonly InputRule[]): InputRule[] =>
  rules.map((rule) => ({
    ...rule,
    handler(state, match, range, context) {
      const before = scanned(sliceInline(regionInline(state, range), 0, range.from));
      return opensUnclosedMath(before) || opensUnclosedCode(before) ? null : rule.handler(state, match, range, context);
    },
  }));
