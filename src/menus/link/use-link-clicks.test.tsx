import { fireEvent } from '@testing-library/react';
import { mountCanvas, paragraph } from '../../blocks/void/test-canvas';

function mount() {
  const canvas = mountCanvas([paragraph('a', 'see [docs](https://quoin.dev/docs) here')]);
  const link = canvas.shell('a').querySelector<HTMLAnchorElement>('a[data-quoin-link]')!;
  const open = vi.spyOn(window, 'open').mockReturnValue(null);
  return { link, open };
}

afterEach(() => vi.restoreAllMocks());

describe('clicks on a link in the text', () => {
  it('never follow a plain click, which places the caret instead', () => {
    const { link, open } = mount();
    expect(fireEvent.click(link)).toBe(false);
    expect(open).not.toHaveBeenCalled();
  });

  it('open the link in a new tab on Mod+click, without access back to the editor', () => {
    const { link, open } = mount();
    expect(fireEvent.click(link, { ctrlKey: true })).toBe(false);
    expect(open).toHaveBeenCalledExactlyOnceWith('https://quoin.dev/docs', '_blank', 'noopener,noreferrer');
  });

  it('take the modifier of the platform, so Meta+click away from a Mac opens nothing', () => {
    const { link, open } = mount();
    expect(fireEvent.click(link, { metaKey: true })).toBe(false);
    expect(open).not.toHaveBeenCalled();
  });
});
