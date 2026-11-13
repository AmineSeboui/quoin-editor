import { act, screen } from '@testing-library/react';
import { mountCanvas, paragraph } from '../../blocks/test-support/test-canvas';
import type * as VirtualAnchorModule from '../floating/virtual-anchor';
import { virtualAnchor } from '../floating/virtual-anchor';

vi.mock('../floating/virtual-anchor', async (importOriginal) => {
  const actual = await importOriginal<typeof VirtualAnchorModule>();
  return { ...actual, virtualAnchor: vi.fn(actual.virtualAnchor) };
});

const pos = (offset: number) => ({ block: 'a', region: 'text', offset });

beforeEach(() => void vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }));
afterEach(() => void vi.useRealTimers());

describe('the anchor of the link hover card', () => {
  it('is made once for a link, not again for each change that leaves the link where it is', () => {
    const canvas = mountCanvas([paragraph('a', 'see [docs](https://quoin.dev/docs) here')]);
    const { controller } = canvas.handle();
    act(() => controller.focus(pos(5)));
    act(() => void vi.advanceTimersByTime(300));
    expect(screen.getByRole('group', { name: 'Link' })).toBeInTheDocument();
    const made = vi.mocked(virtualAnchor).mock.calls.length;
    act(() => controller.focus(pos(6)));
    act(() => controller.focus(pos(7)));
    expect(screen.getByRole('group', { name: 'Link' })).toBeInTheDocument();
    expect(vi.mocked(virtualAnchor).mock.calls.length).toBe(made);
  });
});
