import { describe, expect, it } from 'vitest';
import { PALETTE } from '../markdown/palette';
import { PALETTE_RGB, type PaletteKind } from '../markdown/palette-rgb';
import { fromHTML } from './from-html';
import { nearestPaletteColor } from './html-styles';

const markdownOf = (html: string) => fromHTML(html, { newId: () => 'x' }).map((block) => block.data.markdown);
const rgb = ([r, g, b]: readonly number[]) => `rgb(${r}, ${g}, ${b})`;

describe('nearestPaletteColor', () => {
  it.each([
    ['rgb(246, 248, 250)', 'GitHub code background'],
    ['rgb(248, 248, 248)', 'Slack message background'],
    ['rgb(245, 245, 245)', 'light grey surface'],
    ['rgb(13, 17, 23)', 'GitHub dark background'],
    ['rgb(30, 30, 30)', 'VS Code background'],
    ['rgb(0, 0, 0)', 'black'],
  ])('reads the background %s (%s) as no background', (css) => {
    expect(nearestPaletteColor(css, 'background')).toBeNull();
  });

  it.each([['rgb(230, 237, 243)'], ['rgb(255, 255, 255)'], ['rgb(212, 212, 212)']])(
    'reads the light text %s as no colour',
    (css) => expect(nearestPaletteColor(css, 'text')).toBeNull(),
  );

  it.each([
    ['rgb(255, 0, 0)', 'text', 'red'],
    ['#d44c47', 'text', 'red'],
    ['rgb(0, 0, 255)', 'text', 'blue'],
    ['rgb(120, 119, 116)', 'text', 'gray'],
    ['rgb(255, 255, 0)', 'background', 'yellow'],
    ['rgb(255, 242, 204)', 'background', 'yellow'],
    ['rgb(255, 0, 0)', 'background', 'red'],
    ['rgb(0, 255, 0)', 'background', 'green'],
    ['rgb(0, 0, 255)', 'background', 'blue'],
    ['rgb(255, 165, 0)', 'background', 'orange'],
  ] as const)('maps the clear colour %s as %s to %s', (css, kind, name) => {
    expect(nearestPaletteColor(css, kind)).toBe(name);
  });

  it('ignores colours that are not near any palette entry', () => {
    expect(nearestPaletteColor('rgb(0, 0, 128)', 'background')).toBeNull();
    expect(nearestPaletteColor('rgb(128, 0, 0)', 'background')).toBeNull();
    expect(nearestPaletteColor('rgb(0, 43, 54)', 'background')).toBeNull();
  });

  it.each<PaletteKind>(['text', 'background'])('maps every %s palette value to its own name', (kind) => {
    for (const name of PALETTE) {
      for (const value of PALETTE_RGB[kind][name]) {
        const mapped = nearestPaletteColor(rgb(value), kind);
        expect(mapped, `${kind} ${name} ${rgb(value)}`).toBe(name === 'default' ? null : name);
      }
    }
  });
});

describe('fromHTML colours', () => {
  const span = (style: string) => `<p><span style="${style}">x</span></p>`;

  it('imports no colour from the surfaces of a dark or light page', () => {
    expect(markdownOf(span('background-color: rgb(13, 17, 23)'))).toEqual(['x']);
    expect(markdownOf(span('color: rgb(230, 237, 243); background-color: rgb(30, 30, 30)'))).toEqual(['x']);
    expect(markdownOf(span('background-color: rgb(246, 248, 250)'))).toEqual(['x']);
  });

  it('keeps a clearly red text and a clearly yellow highlight', () => {
    expect(markdownOf(span('color: rgb(255, 0, 0)'))).toEqual(['<span data-color="red">x</span>']);
    expect(markdownOf(span('background-color: rgb(255, 255, 0)'))).toEqual(['<span data-bg="yellow">x</span>']);
  });

  it('ignores the colours Chrome writes on the wrapper of a fragment', () => {
    const style = 'color: rgb(102, 102, 102); background-color: rgb(255, 242, 204);';
    expect(markdownOf(`<meta charset="utf-8"><span style="${style}">x</span>`)).toEqual(['x']);
    expect(markdownOf(`<div style="${style}"><p>x</p></div>`)).toEqual(['x']);
    expect(markdownOf(`<p style="${style}">x</p><p style="${style}">y</p>`)).toEqual(['x', 'y']);
  });

  it('keeps the colours of elements inside the wrapper', () => {
    const html = '<div style="color: #d44c47"><p>a <span style="color: #d44c47">b</span></p></div>';
    expect(markdownOf(html)).toEqual(['a <span data-color="red">b</span>']);
  });
});
