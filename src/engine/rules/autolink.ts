import { sanitizeHref } from '../markdown/urls';
import { Transaction } from '../state/transaction';
import { addMarkStep } from '../transform/mark-steps';
import type { InputRule } from './input-rule';
import { regionInline } from './region-inline';
import { touchesMark } from './touches-mark';

const TRAILING_PUNCTUATION = '?!.,:;*_~\'"';

function count(value: string, char: string): number {
  return value.split(char).length - 1;
}

function trimTrailing(url: string): string {
  let end = url.length;
  while (end > 0) {
    const last = url[end - 1];
    const kept = url.slice(0, end);
    const unbalanced = last === ')' && count(kept, ')') > count(kept, '(');
    if (!TRAILING_PUNCTUATION.includes(last) && !unbalanced) break;
    end -= 1;
  }
  return url.slice(0, end);
}

export const autolinkRule: InputRule = {
  name: 'autolink',
  match: /(?:^|[\s(])((https?:\/\/|www\.)[^\s\uFFFC]+) $/i,
  handler(state, match, range) {
    const url = trimTrailing(match[1]);
    const href = url.length > match[2].length ? sanitizeHref(/^www\./i.test(url) ? `https://${url}` : url) : null;
    const inline = regionInline(state, range);
    const from = range.to - 1 - match[1].length;
    const to = from + url.length;
    if (href === null) return null;
    if (touchesMark(inline, from, to, 'link') || touchesMark(inline, from, to, 'code')) return null;
    const link = { type: 'link', attrs: { href } };
    return new Transaction(state).step(addMarkStep(range.block, range.region, from, to, link));
  },
};
