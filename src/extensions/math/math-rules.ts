import { atom, type Inline, type InputRule, type Mark } from '../../engine';
import { dollarRunEnd, findMathClose, mathLatex, opensMath } from '../../engine/markdown/inline/math-span';
import { sliceInline } from '../../engine/model/inline';
import { hasMark, sameMarkSet } from '../../engine/model/marks';
import { regionInline } from '../../engine/rules/region-inline';
import { textSelection } from '../../engine/state/selection';
import { Transaction } from '../../engine/state/transaction';
import { replaceInlineStep } from '../../engine/transform/replace-inline-step';
import { escaped } from './math-opener';

// Neither a dollar, a space, a digit nor a backslash, so the predicates read it as they read a markdown delimiter.
const OPAQUE = '`';

type ScannedLine = { readonly src: string; readonly offsets: readonly (number | null)[] };

/**
 * The line as the parser scans its dollars, with the offset in the line of each character it holds: code and atoms are
 * opaque, as the parser reads a code span whole, and every change of marks adds an opaque character in the place of
 * the delimiters the markdown writes there. The opaque characters have no offset, so no formula can take them in.
 */
function scannedLine(inline: Inline): ScannedLine {
  let src = '';
  const offsets: (number | null)[] = [];
  const push = (char: string, offset: number | null) => {
    src += char;
    offsets.push(offset);
  };
  let marks: readonly Mark[] = [];
  let start = 0;
  for (const node of inline) {
    if (!sameMarkSet(marks, node.marks)) push(OPAQUE, null);
    marks = node.marks;
    if (node.kind === 'atom') push(OPAQUE, null);
    else for (let i = 0; i < node.text.length; i++) push(hasMark(marks, 'code') ? OPAQUE : node.text[i], start + i);
    start += node.kind === 'atom' ? 1 : node.text.length;
  }
  if (marks.length > 0) push(OPAQUE, null);
  return { src, offsets };
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

/**
 * A closing dollar typed where the markdown parser reads a `$...$` span as math turns the span into a math atom, when
 * the span lies in text of one set of marks.
 */
export const inlineMathRule: InputRule = {
  name: 'inline-math',
  match: /\$$/,
  handler(state, _match, range) {
    const { block, region, to } = range;
    const inline = regionInline(state, range);
    const { src, offsets } = scannedLine(inline);
    const close = offsets.indexOf(to - 1);
    const open = close < 0 ? -1 : mathOpening(src, close);
    if (open < 0 || offsets.slice(open, close + 1).includes(null)) return null;
    const from = offsets[open] as number;
    const formula = atom('math', { latex: mathLatex(src, open, close) }, sliceInline(inline, from, from + 1)[0].marks);
    return new Transaction(state)
      .step(replaceInlineStep(block, region, from, to, [formula]))
      .setSelection(textSelection({ block, region, offset: from + 1 }));
  },
};
