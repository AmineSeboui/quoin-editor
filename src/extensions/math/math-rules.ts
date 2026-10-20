import { atom, type InputRule } from '../../engine';
import { dollarRunEnd, findMathClose, mathLatex, opensMath } from '../../engine/markdown/inline/math-span';
import { inlineText, sliceInline } from '../../engine/model/inline';
import { regionInline } from '../../engine/rules/region-inline';
import { touchesMark } from '../../engine/rules/touches-mark';
import { textSelection } from '../../engine/state/selection';
import { Transaction } from '../../engine/state/transaction';
import { replaceInlineStep } from '../../engine/transform/replace-inline-step';

// An odd run of backslashes before a dollar escapes it, as the parser reads a backslash and the character after it.
function escaped(src: string, at: number): boolean {
  let backslashes = 0;
  while (src[at - 1 - backslashes] === '\\') backslashes++;
  return backslashes % 2 === 1;
}

/**
 * Where the dollar that opens the math span closed by the dollar at `close` stands, scanning the dollars from the start
 * as the markdown parser does, or -1 when the parser would read that dollar as no span's end.
 */
function mathOpening(src: string, close: number): number {
  let pos = 0;
  for (;;) {
    const at = src.indexOf('$', pos);
    if (at < 0 || at >= close) return -1;
    if (src[at + 1] === '$') {
      pos = dollarRunEnd(src, at);
      continue;
    }
    const end = escaped(src, at) || !opensMath(src, at) ? -1 : findMathClose(src, at + 2);
    if (end === close) return at;
    pos = end < 0 ? at + 1 : end + 1;
  }
}

/** A closing dollar typed where the markdown parser reads a `$...$` span as math turns the span into a math atom. */
export const inlineMathRule: InputRule = {
  name: 'inline-math',
  match: /\$$/,
  handler(state, _match, range) {
    const { block, region, to } = range;
    const inline = regionInline(state, range);
    const src = inlineText(inline);
    const open = mathOpening(src, to - 1);
    if (open < 0) return null;
    const span = sliceInline(inline, open, to);
    if (span.some((node) => node.kind === 'atom') || touchesMark(inline, open, to, 'code')) return null;
    const formula = atom('math', { latex: mathLatex(src, open, to - 1) }, span[0].marks);
    return new Transaction(state)
      .step(replaceInlineStep(block, region, open, to, [formula]))
      .setSelection(textSelection({ block, region, offset: open + 1 }));
  },
};
