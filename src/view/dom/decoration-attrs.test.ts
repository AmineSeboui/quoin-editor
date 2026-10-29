import { describe, expect, it } from 'vitest';
import { normalizeInline, text } from '../../engine/model/inline';
import { renderInline } from './render-inline';

describe('the attributes an inline decoration writes', () => {
  it('leave out event handlers in any case and keep the rest', () => {
    const el = document.createElement('div');
    const attrs = { onclick: 'a()', OnMouseOver: 'b()', ONload: 'c()', onPointerDown: 'd()', class: 'hit', style: 'color: red', 'data-x': '1', 'aria-label': 'L' };
    renderInline(el, normalizeInline([text('ab')]), [{ kind: 'inline', block: 'p', region: 'text', from: 0, to: 1, attrs }]);
    const span = el.querySelector('[data-quoin-deco]')!;
    expect(span.getAttributeNames().sort()).toEqual(['aria-label', 'class', 'data-quoin-deco', 'data-x', 'style']);
  });
});
