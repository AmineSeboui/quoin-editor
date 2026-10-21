import type { Command } from '../commands/command';
import { blockById } from '../model/doc';
import { sliceInline, text } from '../model/inline';
import { comparePos } from '../model/position';
import type { EngineDoc, Inline } from '../model/types';
import { Transaction } from '../state/transaction';
import { replaceInlineStep } from '../transform/replace-inline-step';
import { findPattern } from './find-pattern';
import type { FindMatch, FindQuery } from './find-types';
import { runHolding, type TextRun } from './text-runs';

type Replacement = { readonly match: FindMatch; readonly slice: Inline };

function expand(run: TextRun, sticky: RegExp, from: number, to: number, replacement: string): string {
  sticky.lastIndex = from;
  const replaced = run.text.replace(sticky, replacement);
  return replaced.slice(from, replaced.length - (run.text.length - to));
}

// The search runs again at the match's own offset in its run, so a match the document no longer holds is left alone, and
// lookarounds and groups read the same text they read when it was found.
function replacementFor(
  doc: EngineDoc,
  pattern: RegExp,
  search: FindQuery,
  match: FindMatch,
  replacement: string,
): Replacement | null {
  const inline = blockById(doc, match.block)?.regions[match.region];
  const run = inline && runHolding(inline, match.from, match.to);
  if (inline === undefined || run === undefined) return null;
  const from = match.from - run.start;
  const to = match.to - run.start;
  const sticky = new RegExp(pattern.source, pattern.flags.replace('g', 'y'));
  sticky.lastIndex = from;
  const found = sticky.exec(run.text);
  if (found === null || sticky.lastIndex !== to) return null;
  const replaced = search.regex ? expand(run, sticky, from, to, replacement) : replacement;
  if (replaced === found[0]) return null;
  const marks = sliceInline(inline, match.from, match.from + 1)[0]?.marks ?? [];
  return { match, slice: replaced === '' ? [] : [text(replaced, marks)] };
}

const startOf = ({ block, region, from }: FindMatch) => ({ block, region, offset: from });
const endOf = ({ block, region, to }: FindMatch) => ({ block, region, offset: to });

// From the last match to the first, so that each replacement leaves the offsets of those still to come as they were.
// A match that overlaps the one after it is dropped.
function lastFirst(doc: EngineDoc, replacements: readonly Replacement[]): Replacement[] {
  const sorted = [...replacements].sort((a, b) => comparePos(doc, startOf(b.match), startOf(a.match)));
  return sorted.filter((item, i) => i === 0 || comparePos(doc, endOf(item.match), startOf(sorted[i - 1].match)) <= 0);
}

/**
 * Replaces each of `matches` that the document still holds with `replacement`, in one transaction and so one step of
 * history. The text takes the marks at the start of the match it replaces. In regex mode `$&` and `$1` to `$9` read the
 * match and its groups as `String.prototype.replace` reads them; otherwise the replacement is literal. Returns false
 * when nothing would change.
 */
export function replaceMatches(search: FindQuery, matches: readonly FindMatch[], replacement: string): Command {
  return (state, dispatch) => {
    const pattern = findPattern(search);
    if (!(pattern instanceof RegExp) || search.query === '') return false;
    const replacements = lastFirst(
      state.doc,
      matches
        .map((match) => replacementFor(state.doc, pattern, search, match, replacement))
        .filter((found): found is Replacement => found !== null),
    );
    if (replacements.length === 0) return false;
    if (dispatch) {
      const tr = new Transaction(state);
      for (const { match, slice } of replacements) {
        tr.step(replaceInlineStep(match.block, match.region, match.from, match.to, slice));
      }
      dispatch(tr);
    }
    return true;
  };
}
