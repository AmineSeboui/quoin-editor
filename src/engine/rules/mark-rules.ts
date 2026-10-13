import { sanitizeHref } from '../markdown/urls';
import { autolinkRule } from './autolink';
import type { InputRule } from './input-rule';
import { markRule } from './mark-rule';

function typed(name: string, match: RegExp, open: number, type: string, wordBounded = false): InputRule {
  return markRule({ name, match, open, wordBounded, mark: () => ({ type }) });
}

export const markInputRules: readonly InputRule[] = [
  typed('bold-asterisks', /\*\*([^\s*](?:[^*]*[^\s*])?)\*\*$/, 2, 'bold'),
  typed('bold-underscores', /(?:^|[^\p{L}\p{N}_])__([^\s_](?:[^_]*[^\s_])?)__$/u, 2, 'bold', true),
  typed('strike', /~~([^\s~](?:[^~]*[^\s~])?)~~$/, 2, 'strike'),
  typed('code', /`([^\s`](?:[^`]*[^\s`])?)`$/, 1, 'code'),
  typed('highlight', /==([^\s=](?:[^=]*[^\s=])?)==$/, 2, 'highlight'),
  markRule({
    name: 'link',
    match: /\[([^\s[\]](?:[^[\]]*[^\s[\]])?)\]\(([^\s()]+)\)$/,
    open: 1,
    close: (match) => match[2].length + 3,
    mark(match) {
      const href = sanitizeHref(match[2]);
      return href === null ? null : { type: 'link', attrs: { href } };
    },
  }),
  typed('italic-asterisk', /(?:^|[^*])\*([^\s*](?:[^*]*[^\s*])?)\*$/, 1, 'italic'),
  typed('italic-underscore', /(?:^|[^\p{L}\p{N}_])_([^\s_](?:[^_]*[^\s_])?)_$/u, 1, 'italic', true),
  autolinkRule,
];
