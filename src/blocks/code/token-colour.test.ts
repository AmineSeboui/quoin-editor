import { tokenColour } from './token-colour';

describe('tokenColour', () => {
  it.each([
    '#0a0B0c',
    'currentColor',
    'rgb(1 2 3 / 50%)',
    'var(--shiki-token-keyword)',
    'var(--shiki-foreground, #24292e)',
    'hsl(var(--primary))',
    'color-mix(in srgb, red, blue)',
    'light-dark(#000, #fff)',
    'rgb(from red r g b)',
  ])('keeps %s', (colour) => {
    expect(tokenColour(colour)).toBe(colour);
  });

  it.each([
    'red;background-image:url(https://t.example/x)',
    'red}a{color:blue',
    'red{',
    'red\\3b background:blue',
    'red"',
    "red'",
    'red<',
    'red>',
    'red !important',
    'red/**/',
    'url(https://t.example/x)',
    'URL(https://t.example/x)',
    'image(https://t.example/x)',
    'Image-Set("x.png" 1x)',
    'image-set(x.png 1x)',
    'expression(alert(1))',
  ])('leaves out %s', (colour) => {
    expect(tokenColour(colour)).toBeUndefined();
  });

  it('leaves out no colour', () => {
    expect(tokenColour(undefined)).toBeUndefined();
  });
});
