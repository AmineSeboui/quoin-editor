import type { Decoration } from '../../engine';
import { renderGhost } from './ai-ghost-render';

const decoration = (markdown: string, phase = 'streaming'): Extract<Decoration, { kind: 'widget' }> => ({
  kind: 'widget',
  block: 'p',
  region: 'text',
  offset: 0,
  key: 'ai-ghost',
  widget: 'ai-ghost',
  attrs: { markdown, phase },
});

describe('the answer drawn in the document', () => {
  it('draws each block of the markdown, kept from assistive technology and selection', () => {
    const ghost = renderGhost(decoration('# Title\n\nSome **bold** text\n\n- an item'), document);
    expect(ghost).toHaveClass('quoin-ai-ghost');
    expect(ghost).toHaveAttribute('aria-hidden', 'true');
    expect(ghost).toHaveAttribute('data-phase', 'streaming');
    const blocks = [...ghost.children] as HTMLElement[];
    expect(blocks.map((block) => [block.dataset.kind, block.textContent])).toEqual([
      ['heading', 'Title'],
      ['paragraph', 'Some bold text'],
      ['bullet', 'an item'],
    ]);
    expect(blocks[0].dataset.level).toBe('1');
    expect(blocks[1].querySelector('strong')?.textContent).toBe('bold');
  });

  it('draws HTML in the answer as text, never as elements', () => {
    const ghost = renderGhost(decoration('Hi <img src=x onerror="alert(1)"> <b>there</b>'), document);
    expect(ghost.querySelector('img, b')).toBeNull();
    expect(ghost.textContent).toContain('<img src=x');
  });

  it('draws a code block as its code', () => {
    const ghost = renderGhost(decoration('```js\nconst a = 1;\n```'), document);
    expect(ghost.textContent).toBe('const a = 1;');
  });

  it('is empty before anything streamed', () => {
    expect(renderGhost(decoration(''), document).children).toHaveLength(0);
  });
});
