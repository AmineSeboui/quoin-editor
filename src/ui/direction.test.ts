import { arrowAsWritten, inlineDirection } from './direction';

describe('inlineDirection', () => {
  it('reads the way lines run from the page, whether a dir attribute or a stylesheet set it', () => {
    const [attribute, styled, plain] = ['div', 'div', 'div'].map((tag) => document.createElement(tag));
    attribute.setAttribute('dir', 'rtl');
    styled.style.direction = 'rtl';
    for (const element of [attribute, styled, plain]) document.body.append(element);
    expect(inlineDirection(attribute)).toBe('rtl');
    expect(inlineDirection(styled)).toBe('rtl');
    expect(inlineDirection(plain)).toBe('ltr');
    for (const element of [attribute, styled, plain]) element.remove();
  });
});

describe('arrowAsWritten', () => {
  it('swaps the horizontal arrows where the lines run right to left', () => {
    expect(arrowAsWritten('ArrowLeft', 'rtl')).toBe('ArrowRight');
    expect(arrowAsWritten('ArrowRight', 'rtl')).toBe('ArrowLeft');
  });

  it('leaves them alone where the lines run left to right', () => {
    expect(arrowAsWritten('ArrowLeft', 'ltr')).toBe('ArrowLeft');
    expect(arrowAsWritten('ArrowRight', 'ltr')).toBe('ArrowRight');
  });

  it('leaves a vertical arrow and any other key alone in both directions', () => {
    for (const direction of ['ltr', 'rtl'] as const) {
      for (const key of ['ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter', 'a']) {
        expect(arrowAsWritten(key, direction)).toBe(key);
      }
    }
  });
});
