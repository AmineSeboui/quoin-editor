import { describe, expect, it } from 'vitest';
import { atom, text } from '../../model/inline';
import { parseInline } from './parse-inline';
import { serializeInline } from './serialize-inline';

describe('inline math opener', () => {
  it.each([
    'Pay $5 now or 4$ later',
    'x $1,000.50 and 20$.',
    '$5 and 6$',
    'from $5 to $10',
    '$$x$$',
    'a $$b$$ c',
    '$$$x$',
  ])('keeps %s as text', (input) => {
    expect(parseInline(input)).toEqual([text(input)]);
  });

  it.each([
    ['$x$', [atom('math', { latex: 'x' })]],
    ['a $x+1$ b', [text('a '), atom('math', { latex: 'x+1' }), text(' b')]],
    ['($5$)', [text('('), atom('math', { latex: '5' }), text(')')]],
    ['$x$$y$', [atom('math', { latex: 'x' }), atom('math', { latex: 'y' })]],
  ])('still reads %j as math', (input, expected) => {
    expect(parseInline(input)).toEqual(expected);
  });

  it('writes a digit led formula after a space or at the start in a form that reads back as math', () => {
    for (const nodes of [
      [atom('math', { latex: '5' })],
      [text('a '), atom('math', { latex: '2x' })],
      [text('a\\\n'), atom('math', { latex: '2x' })],
    ]) {
      const markdown = serializeInline(nodes);
      expect(markdown).toContain('data-atom="math"');
      expect(parseInline(markdown)).toEqual(nodes);
    }
  });

  it('keeps writing a digit led formula as dollars where nothing before it is a space', () => {
    const nodes = [text('a'), atom('math', { latex: '2x' })];
    expect(serializeInline(nodes)).toBe('a$2x$');
    expect(parseInline('a$2x$')).toEqual(nodes);
  });
});
