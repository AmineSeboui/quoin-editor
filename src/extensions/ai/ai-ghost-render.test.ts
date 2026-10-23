import { fillGhost } from './ai-ghost-render';

const drawn = (markdown: string) => {
  const ghost = document.createElement('div');
  fillGhost(ghost, markdown);
  return ghost;
};

describe('the answer drawn under its target', () => {
  it('draws each block of the markdown', () => {
    const ghost = drawn('# Title\n\nSome **bold** text\n\n- an item');
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
    const ghost = drawn('Hi <img src=x onerror="alert(1)"> <b>there</b>');
    expect(ghost.querySelector('img, b')).toBeNull();
    expect(ghost.textContent).toContain('<img src=x');
  });

  it('draws a code block as its code', () => {
    expect(drawn('```js\nconst a = 1;\n```').textContent).toBe('const a = 1;');
  });

  it('is emptied of what it drew before', () => {
    const ghost = drawn('One');
    fillGhost(ghost, '');
    expect(ghost.children).toHaveLength(0);
  });
});
