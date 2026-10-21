import { StrictMode, createRef, useState } from 'react';
import { act, render, screen, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { BlockCanvas } from '../../canvas/BlockCanvas';
import type { QuoinEditorHandle } from '../../canvas/canvas-props';
import { coreBlocks } from '../../blocks/core';
import { removeBlocksStep, setAttrsStep, type QuoinBlock } from '../../engine';
import { embedExtension, type UnfurledLink } from './embed-extension';
import { mountEmbeds } from './embed-test-canvas';

const URL = 'https://www.quoin.dev/docs';
const bookmark = (data: Record<string, unknown> = {}): QuoinBlock => ({ id: 'b', type: 'BOOKMARK', data: { url: URL, ...data } });
const card = () => screen.getByRole('group', { name: 'Bookmark' });
const settle = () => act(async () => {});

function deferred() {
  let resolve: (value: UnfurledLink | null) => void = () => {};
  const promise = new Promise<UnfurledLink | null>((done) => (resolve = done));
  return { promise, resolve };
}

describe('a bookmark', () => {
  it('without a title is a card linking to its address, with its domain', () => {
    mountEmbeds([bookmark()]);
    const link = within(card()).getByRole('link', { name: URL });
    expect(link).toHaveAttribute('href', URL);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(card()).toHaveTextContent('quoin.dev');
    expect(card().querySelector('img')).toBeNull();
  });

  it('with a title links it, under it its description, beside it its picture', () => {
    const image = 'https://cdn.quoin.dev/cover.png';
    mountEmbeds([bookmark({ title: 'Quoin docs', description: 'How to use it', image })]);
    expect(within(card()).getByRole('link', { name: 'Quoin docs' })).toHaveAttribute('href', URL);
    expect(card()).toHaveTextContent('How to use it');
    expect(card().querySelector('img')).toHaveAttribute('src', image);
    expect(card().querySelector('img')).toHaveAttribute('alt', '');
  });

  it.each(['data:image/png;base64,AAAA', 'javascript:alert(1)', 'blob:https://quoin.dev/1', '/cover.png', 'cover.png'])(
    'draws no picture from %s',
    (image) => {
      mountEmbeds([bookmark({ title: 'Docs', image })]);
      expect(card().querySelector('img')).toBeNull();
    },
  );

  it('shows every string it holds as text', () => {
    const markup = '<b>bold</b><img src=x onerror="alert(1)">';
    mountEmbeds([bookmark({ title: markup, description: markup })]);
    expect(within(card()).getByRole('link')).toHaveTextContent(markup);
    expect(card().querySelector('b, img')).toBeNull();
  });

  it('is called by its label when selected as a whole with no address, and in the title of its block menu', () => {
    const labels = { bookmark: 'Saved link' };
    const { nodeSelect, sink, openBlockMenu } = mountEmbeds([bookmark({ url: '' })], { labels });
    nodeSelect('b');
    expect(sink()).toHaveAccessibleName('Saved link');
    expect(openBlockMenu()).toHaveAccessibleName('Saved link block menu');
  });

  it('has no accessibility violations, editable or read-only', async () => {
    const full = bookmark({ title: 'Docs', description: 'Read me', image: 'https://cdn.quoin.dev/a.png' });
    const editable = mountEmbeds([full]);
    expect(await axe(editable.container)).toHaveNoViolations();
    const readOnly = mountEmbeds([bookmark()], {}, { readOnly: true });
    expect(await axe(readOnly.container)).toHaveNoViolations();
  });
});

describe('the host unfurl of a bookmark', () => {
  it('runs once for a bookmark with no title, and writes what it found in one step kept out of the undo history', async () => {
    const found = { title: 'Docs', description: 'Read me', image: 'https://cdn.quoin.dev/a.png' };
    const unfurl = vi.fn(async () => found);
    const { changes, last, handle } = mountEmbeds([bookmark()], { unfurl });
    await settle();
    expect(unfurl).toHaveBeenCalledTimes(1);
    expect(unfurl).toHaveBeenCalledWith(URL);
    expect(changes).toHaveLength(1);
    expect(last()[1].data).toEqual({ url: URL, ...found });
    expect(within(card()).getByRole('link', { name: 'Docs' })).toBeInTheDocument();
    let undone = true;
    act(() => void (undone = handle().editor.commands.undo()));
    expect(undone).toBe(false);
    await settle();
    expect(unfurl).toHaveBeenCalledTimes(1);
  });

  it('writes only the strings it found, and only a picture from an http or https address', async () => {
    const unfurl = async () => ({ title: 'Docs', description: 42, image: 'javascript:alert(1)' }) as unknown as UnfurledLink;
    const { last } = mountEmbeds([bookmark()], { unfurl });
    await settle();
    expect(last()[1].data).toEqual({ url: URL, title: 'Docs' });
  });

  it('is not asked for a bookmark that has a title, or on a read-only canvas', async () => {
    const unfurl = vi.fn(async () => ({ title: 'Docs' }));
    mountEmbeds([bookmark({ title: 'Mine' })], { unfurl });
    mountEmbeds([bookmark()], { unfurl }, { readOnly: true });
    await settle();
    expect(unfurl).not.toHaveBeenCalled();
  });

  const failing: [string, () => Promise<unknown>][] = [
    ['rejects', () => Promise.reject(new Error('offline'))],
    [
      'throws',
      () => {
        throw new Error('broken');
      },
    ],
    ['finds nothing', async () => null],
    ['finds no title', async () => ({ description: 'Read me' })],
    ['finds an empty title', async () => ({ title: '  ' })],
    ['finds something that is no link', async () => 42],
  ];
  it.each(failing)('leaves the address and its domain when it %s, and is not asked again', async (_case, result) => {
    const unfurl = vi.fn(result) as unknown as () => Promise<UnfurledLink>;
    const { changes, caret, handle } = mountEmbeds([bookmark()], { unfurl });
    await settle();
    caret('q', 0);
    act(() => void handle().editor.insertText('!'));
    await settle();
    expect(unfurl).toHaveBeenCalledTimes(1);
    expect(changes.at(-1)?.[1]).toEqual(bookmark());
    expect(within(card()).getByRole('link', { name: URL })).toBeInTheDocument();
  });

  it.each<[string, () => Promise<UnfurledLink>, string]>([
    ['rejects', () => Promise.reject(new Error('offline')), 'offline'],
    [
      'throws',
      () => {
        throw new Error('broken');
      },
      'broken',
    ],
    ['rejects with what is no error', () => Promise.reject('down'), 'down'],
  ])('reports to onError when it %s, once', async (_case, result, message) => {
    const onError = vi.fn();
    mountEmbeds([bookmark()], { unfurl: vi.fn(result) }, { onError });
    await settle();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(new Error(message));
  });

  it('reports nothing when it finds nothing, or once the bookmark is gone', async () => {
    const onError = vi.fn();
    mountEmbeds([bookmark()], { unfurl: async () => null }, { onError });
    await settle();
    let fail: (cause: Error) => void = () => {};
    const late = new Promise<UnfurledLink>((_, reject) => (fail = reject));
    const { handle } = mountEmbeds([bookmark({ url: 'https://a.io' })], { unfurl: () => late }, { onError });
    act(() => void handle().editor.setBlocks([]));
    fail(new Error('late'));
    await settle();
    expect(onError).not.toHaveBeenCalled();
  });

  it('writes nothing once the bookmark holds another address, which it is asked for in turn', async () => {
    const answers = [deferred(), deferred()];
    const unfurl = vi.fn(() => answers[unfurl.mock.calls.length - 1].promise);
    const { handle, last } = mountEmbeds([bookmark()], { unfurl });
    act(() => handle().controller.dispatch(handle().editor.createTransaction().step(setAttrsStep('b', { url: 'https://other.test/' }))));
    await settle();
    expect(unfurl.mock.calls).toEqual([[URL], ['https://other.test/']]);
    await act(async () => answers[0].resolve({ title: 'Docs' }));
    expect(last()[1].data).toEqual({ url: 'https://other.test/' });
    await act(async () => answers[1].resolve({ title: 'Other' }));
    expect(last()[1].data).toEqual({ url: 'https://other.test/', title: 'Other' });
  });

  it('writes nothing once the canvas is read-only or the block is gone', async () => {
    const first = deferred();
    const read = mountEmbeds([bookmark()], { unfurl: () => first.promise });
    act(() => read.handle().controller.setReadOnly(true));
    await act(async () => first.resolve({ title: 'Docs' }));
    expect(read.changes).toEqual([]);

    const second = deferred();
    const gone = mountEmbeds([bookmark()], { unfurl: () => second.promise });
    act(() => gone.handle().controller.dispatch(gone.handle().editor.createTransaction().step(removeBlocksStep(1, 1))));
    await act(async () => second.resolve({ title: 'Docs' }));
    expect(gone.last().map((block) => block.type)).toEqual(['MARKDOWN', 'MARKDOWN']);
  });

  it('is asked again for a bookmark its answer missed while it was gone, once undo brings it back', async () => {
    const answers = [deferred(), deferred()];
    const unfurl = vi.fn(() => answers[unfurl.mock.calls.length - 1].promise);
    const { handle, last } = mountEmbeds([bookmark()], { unfurl });
    act(() => handle().controller.dispatch(handle().editor.createTransaction().step(removeBlocksStep(1, 1))));
    await act(async () => answers[0].resolve({ title: 'Docs' }));
    expect(unfurl).toHaveBeenCalledTimes(1);
    act(() => void handle().editor.commands.undo());
    await settle();
    expect(unfurl).toHaveBeenCalledTimes(2);
    await act(async () => answers[1].resolve({ title: 'Docs' }));
    expect(last()[1].data).toEqual({ url: URL, title: 'Docs' });
  });

  it('writes an answer that comes back once undo has brought its bookmark back, without asking again', async () => {
    const answer = deferred();
    const unfurl = vi.fn(() => answer.promise);
    const { handle, last } = mountEmbeds([bookmark()], { unfurl });
    act(() => handle().controller.dispatch(handle().editor.createTransaction().step(removeBlocksStep(1, 1))));
    act(() => void handle().editor.commands.undo());
    await act(async () => answer.resolve({ title: 'Docs' }));
    expect(unfurl).toHaveBeenCalledTimes(1);
    expect(last()[1].data).toEqual({ url: URL, title: 'Docs' });
  });

  it('is asked again once a canvas that turned read-only while it waited is editable again', async () => {
    const answers = [deferred(), deferred()];
    const unfurl = vi.fn(() => answers[unfurl.mock.calls.length - 1].promise);
    const { handle, last } = mountEmbeds([bookmark()], { unfurl });
    act(() => handle().controller.setReadOnly(true));
    await act(async () => answers[0].resolve({ title: 'Docs' }));
    act(() => handle().controller.setReadOnly(false));
    await settle();
    expect(unfurl).toHaveBeenCalledTimes(2);
    await act(async () => answers[1].resolve({ title: 'Docs' }));
    expect(last()[1].data).toEqual({ url: URL, title: 'Docs' });
  });

  it('writes nothing once the canvas is gone', async () => {
    const answer = deferred();
    const onChange = vi.fn();
    const extensions = [embedExtension({ unfurl: () => answer.promise })];
    const { unmount } = render(
      <BlockCanvas blocks={[bookmark()]} onChange={onChange} blockTypes={coreBlocks} extensions={extensions} />,
    );
    unmount();
    await act(async () => answer.resolve({ title: 'Docs' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('runs once under StrictMode, and what it found still lands', async () => {
    const unfurl = vi.fn(async () => ({ title: 'Docs' }));
    const extensions = [embedExtension({ unfurl })];
    const ref = createRef<QuoinEditorHandle>();
    function Host() {
      const [blocks, setBlocks] = useState([bookmark()]);
      return <BlockCanvas ref={ref} blocks={blocks} onChange={setBlocks} blockTypes={coreBlocks} extensions={extensions} />;
    }
    render(
      <StrictMode>
        <Host />
      </StrictMode>,
    );
    await settle();
    expect(unfurl).toHaveBeenCalledTimes(1);
    expect(ref.current!.editor.getBlocks()[0].data).toEqual({ url: URL, title: 'Docs' });
  });
});
