import { marksAt, text } from '../model/inline';
import { Transaction } from '../state/transaction';
import { replaceInlineStep } from '../transform/replace-inline-step';
import type { InputRule } from './input-rule';
import { regionInline } from './region-inline';

type Replacement = string | ((match: RegExpExecArray) => string);

const OPENING_CONTEXT = /[\s([{\u2018\u201C\u2014\u2013]/;

// Group 1, when the pattern has one, is the part to replace and the rest of the match is only context.
function replacing(name: string, match: RegExp, replacement: Replacement): InputRule {
  return {
    name,
    match,
    handler(state, found, range) {
      const value = typeof replacement === 'string' ? replacement : replacement(found);
      const from = range.to - (found[1] ?? found[0]).length;
      const node = text(value, marksAt(regionInline(state, range), range.to, () => true));
      return new Transaction(state).step(replaceInlineStep(range.block, range.region, from, range.to, [node]));
    },
  };
}

function quote(opening: string, closing: string): Replacement {
  return (match) => {
    const before = match.input[match.index - 1];
    return before === undefined || OPENING_CONTEXT.test(before) ? opening : closing;
  };
}

export function typographyRules(options: { dashes?: 'em' | 'en' | 'none' } = {}): readonly InputRule[] {
  const { dashes = 'none' } = options;
  const dash = dashes === 'em' ? '\u2014' : '\u2013';
  return [
    replacing('double-quote', /"$/, quote('\u201C', '\u201D')),
    replacing('single-quote', /'$/, quote('\u2018', '\u2019')),
    replacing('ellipsis', /\.\.\.$/, '\u2026'),
    replacing('arrow-right', /->$/, '\u2192'),
    replacing('arrow-left', /<-$/, '\u2190'),
    replacing('double-arrow', /=>$/, '\u21D2'),
    replacing('copyright', /\(c\)$/, '\u00A9'),
    replacing('registered', /\(r\)$/, '\u00AE'),
    replacing('trademark', /\(tm\)$/, '\u2122'),
    replacing('one-half', /(?:^|[^\d/])(1\/2)$/, '\u00BD'),
    replacing('one-quarter', /(?:^|[^\d/])(1\/4)$/, '\u00BC'),
    replacing('three-quarters', /(?:^|[^\d/])(3\/4)$/, '\u00BE'),
    ...(dashes === 'none' ? [] : [replacing('dash', /--$/, dash)]),
  ];
}
