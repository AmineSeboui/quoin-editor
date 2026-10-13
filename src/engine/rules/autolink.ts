import { autolinkHref } from '../markdown/autolink-href';
import { trimUrlEnd } from '../markdown/trim-url-end';
import { Transaction } from '../state/transaction';
import { addMarkStep } from '../transform/mark-steps';
import type { InputRule } from './input-rule';
import { regionInline } from './region-inline';
import { touchesMark } from './touches-mark';

export const autolinkRule: InputRule = {
  name: 'autolink',
  match: /(?:^|[\s(])((https?:\/\/|www\.)[^\s\uFFFC]+) $/i,
  handler(state, match, range) {
    const url = trimUrlEnd(match[1]);
    const href = url.length > match[2].length ? autolinkHref(url) : null;
    const inline = regionInline(state, range);
    const from = range.to - 1 - match[1].length;
    const to = from + url.length;
    if (href === null) return null;
    if (touchesMark(inline, from, to, 'link') || touchesMark(inline, from, to, 'code')) return null;
    const link = { type: 'link', attrs: { href } };
    return new Transaction(state).step(addMarkStep(range.block, range.region, from, to, link));
  },
};
