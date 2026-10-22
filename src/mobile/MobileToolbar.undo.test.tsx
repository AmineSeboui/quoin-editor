import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as Y from 'yjs';
import { mountCanvas, paragraph } from '../blocks/void/test-canvas';
import { collaborationExtension } from '../engine/collab/collaboration-extension';
import { yjsCollaboration } from '../yjs/index';

const control = (name: string) =>
  within(screen.getByRole('toolbar', { name: 'Editing tools' })).getByRole('button', { name });

beforeEach(() =>
  vi.stubGlobal('matchMedia', (media: string) => ({
    media,
    matches: media === '(pointer: coarse)',
    addEventListener: () => {},
    removeEventListener: () => {},
  })),
);
afterEach(() => vi.restoreAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe('Undo on the mobile toolbar', () => {
  it.each([
    ['its own history', () => undefined],
    ['a collaboration', () => [collaborationExtension(yjsCollaboration({ doc: new Y.Doc(), user: { name: 'Ada' } }))]],
  ])('takes focus to the block it changed, scrolling it into view, with %s', async (_, extensions) => {
    const user = userEvent.setup();
    const canvas = mountCanvas([paragraph('a', 'one'), paragraph('b', 'two')], { extensions: extensions() });
    act(() => canvas.handle().focus({ block: 'b', region: 'text', offset: 0 }));
    await user.click(control('Indent'));
    act(() => canvas.handle().focus({ block: 'a', region: 'text', offset: 0 }));
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    await user.click(control('Undo'));
    expect(canvas.last()[1].indent ?? 0).toBe(0);
    const host = canvas.shell('b').querySelector('[data-quoin-host]');
    expect(document.activeElement).toBe(host);
    const toHost = focus.mock.contexts.flatMap((element, i) => (element === host ? [focus.mock.calls[i][0]] : []));
    expect(toHost.length).toBeGreaterThan(0);
    expect(toHost).not.toContainEqual({ preventScroll: true });
  });
});
