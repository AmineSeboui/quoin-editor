import { act, fireEvent, screen } from '@testing-library/react';
import { bookmarkBlock, mountCanvas, paragraph } from '../blocks/void/test-canvas';
import { defineExtension } from '../engine';
import type { ExtensionUI } from '../extensions/ui-types';
import type { QuoinBlock } from '../types';

const image = (id: string, data: Record<string, unknown>): QuoinBlock => ({ id, type: 'IMAGE', data: { alt: '', ...data } });
const code = (id: string, language: string): QuoinBlock => ({ id, type: 'CODE', data: { language, code: 'let code = 1;' } });
const file = (id: string, data: Record<string, unknown>): QuoinBlock => ({ id, type: 'FILE', data });

describe('a block the canvas selects as a whole', () => {
  it('is named in the sink by a bounded summary of what it shows, never by its whole text', () => {
    const blocks: QuoinBlock[] = [
      paragraph('a', 'above'),
      image('i', { storageKey: 'k', alt: 'A cat' }),
      image('j', { storageKey: 'k' }),
      image('e', { storageKey: '' }),
      { id: 'd', type: 'DIVIDER', data: {} },
      code('c', 'ts'),
      code('p', ''),
      code('f', 'zig'),
      file('n1', { storageKey: 'k', filename: 'notes.pdf' }),
      file('n2', { storageKey: 'k', filename: `${'x'.repeat(90)}.pdf` }),
      file('n3', { storageKey: '', filename: '' }),
      bookmarkBlock('b', 'quoin.dev'),
      bookmarkBlock('l', `https://quoin.dev/${'x'.repeat(100)}`),
      { id: 'm', type: 'MATH', data: { latex: 'a + b\nc' } },
      { id: 'n', type: 'PINNED', data: { note: '' } },
    ];
    const { nodeSelect, sink } = mountCanvas(blocks);
    const names = blocks.slice(1).map(({ id }) => {
      nodeSelect(id);
      return sink().getAttribute('aria-label');
    });
    expect(names).toEqual([
      'A cat',
      'Image, no description',
      'No image chosen',
      'Divider',
      'Code, TypeScript',
      'Code, Plain text',
      'Code, zig',
      'File, notes.pdf',
      `File, ${'x'.repeat(79)}\u2026`,
      'File',
      'quoin.dev',
      `https://quoin.dev/${'x'.repeat(61)}\u2026`,
      'a + b',
      'Pinned note',
    ]);
  });

  it('clips its text by characters, never between the two halves of one', () => {
    const { nodeSelect, sink } = mountCanvas([bookmarkBlock('b', `${'x'.repeat(78)}\u{1F600}${'y'.repeat(10)}`)]);
    nodeSelect('b');
    expect(sink().getAttribute('aria-label')).toBe(`${'x'.repeat(78)}\u{1F600}\u2026`);
  });

  it('is named in the labels the host gave the canvas', () => {
    const blocks = [image('j', { storageKey: 'k' }), code('c', ''), file('n', { storageKey: 'k', filename: 'notes.pdf' })];
    const { nodeSelect, sink } = mountCanvas(blocks, {
      labels: {
        imageNoAlt: 'Image sans description',
        plainText: 'Texte brut',
        codeBlockName: (language) => `Code en ${language}`,
        fileBlockName: (name) => `Fichier ${name}`,
      },
    });
    nodeSelect('j');
    expect(sink()).toHaveAccessibleName('Image sans description');
    nodeSelect('c');
    expect(sink()).toHaveAccessibleName('Code en Texte brut');
    nodeSelect('n');
    expect(sink()).toHaveAccessibleName('Fichier notes.pdf');
  });

  it('keeps its name while the code of a selected code block is typed', () => {
    const { nodeSelect, sink, container } = mountCanvas([code('c', 'ts')]);
    nodeSelect('c');
    const setLabel = vi.spyOn(sink(), 'setAttribute');
    const area = container.querySelector('textarea')!;
    for (const value of ['let x', 'let xy', 'let xyz']) {
      area.value = value;
      area.dispatchEvent(new Event('input', { bubbles: true }));
    }
    expect(setLabel.mock.calls.filter(([name]) => name === 'aria-label')).toEqual([]);
    expect(sink()).toHaveAccessibleName('Code, TypeScript');
  });
});

describe('a block of a type an extension draws and names', () => {
  const widgets = defineExtension({
    name: 'widgets',
    ui: { renderers: { WIDGET: () => <p>A widget</p> }, blockNames: { WIDGET: 'Widget' } } satisfies ExtensionUI,
  });
  const widget: QuoinBlock = { id: 'w', type: 'WIDGET', data: {} };

  it('is called by that name when selected as a whole and in the title of its block menu', () => {
    const { nodeSelect, sink, handle } = mountCanvas([paragraph('a', 'above'), widget], {
      extensions: [widgets],
    });
    nodeSelect('w');
    expect(sink()).toHaveAccessibleName('Widget');
    const mod = handle().controller.isMac ? { metaKey: true } : { ctrlKey: true };
    act(() => void fireEvent.keyDown(sink(), { key: '/', ...mod }));
    expect(screen.getByRole('menu')).toHaveAccessibleName('Widget block menu');
  });

  it('is an unsupported block without the extension that names it', () => {
    const { nodeSelect, sink } = mountCanvas([paragraph('a', 'above'), widget]);
    nodeSelect('w');
    expect(sink()).toHaveAccessibleName('Unsupported block');
  });
});
