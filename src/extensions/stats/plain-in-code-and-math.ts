import type { InputRule } from '../../engine';
import { opensUnclosedMath } from '../math/math-opener';

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
      const before = match.input.slice(0, match.index);
      return opensUnclosedMath(before) || opensUnclosedCode(before) ? null : rule.handler(state, match, range, context);
    },
  }));
