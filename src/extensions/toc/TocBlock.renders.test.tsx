import { paragraph } from '../../blocks/void/test-canvas';
import { heading, mountToc, tocBlock } from './toc-test-canvas';
import type { TocList as DrawnList } from './TocList';

const drawn = vi.hoisted(() => ({ lists: 0 }));

vi.mock('./TocList', async (importOriginal) => {
  const { TocList } = await importOriginal<{ TocList: typeof DrawnList }>();
  return {
    TocList: (props: Parameters<typeof DrawnList>[0]) => {
      drawn.lists += 1;
      return <TocList {...props} />;
    },
  };
});

describe('a table of contents', () => {
  it('draws again only when a heading changes, never as text elsewhere is typed or the caret moves', () => {
    const { caret, type, entry } = mountToc([tocBlock(), heading('a', 1, 'Intro'), paragraph('p', 'Text')]);
    caret('p', 4);
    drawn.lists = 0;
    type(' and more');
    caret('p', 0);
    caret('a', 2);
    expect(drawn.lists).toBe(0);
    caret('a', 5);
    type('!');
    expect(entry('Intro!')).toBeInTheDocument();
    expect(drawn.lists).toBe(1);
  });
});
