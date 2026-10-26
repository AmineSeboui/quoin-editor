import { act } from '@testing-library/react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { coreBlocks } from '../../blocks/core';
import { paragraph } from '../../blocks/void/test-canvas';
import { BlockCanvas } from '../../canvas/BlockCanvas';
import { createCommentThreads } from './comment-threads';
import { commentsExtension, type CommentsOptions } from './comments-extension';
import { span, thread } from './comments-test-canvas';

const OFFSET_WIDTH = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth')!;

function canvasWidth(width: number) {
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get(this: HTMLElement) {
      return this.classList.contains('quoin-editor') ? width : 0;
    },
  });
}

afterEach(() => Object.defineProperty(HTMLElement.prototype, 'offsetWidth', OFFSET_WIDTH));

function canvas(initialLayout?: CommentsOptions['initialLayout']) {
  const extension = commentsExtension({
    threads: createCommentThreads([thread('t1', 'On it')]),
    currentUser: { id: 'me', name: 'Grace Hopper' },
    onCreate: () => Promise.resolve('new'),
    onReply: () => Promise.resolve(),
    onResolve: () => Promise.resolve(),
    onDelete: () => Promise.resolve(),
    initialLayout,
  });
  const blocks = [paragraph('a', `Say ${span('t1', 'hello')}`)];
  return <BlockCanvas blocks={blocks} onChange={() => {}} blockTypes={coreBlocks} extensions={[extension]} />;
}

const layoutOf = (html: string) =>
  html.includes('quoin-comments-rail') ? 'wide' : html.includes('quoin-comments-markers') ? 'narrow' : null;

function hydrated(initialLayout: CommentsOptions['initialLayout'], width: number) {
  const container = document.body.appendChild(document.createElement('div'));
  container.innerHTML = renderToString(canvas(initialLayout));
  const onRecoverableError = vi.fn();
  canvasWidth(width);
  act(() => void hydrateRoot(container, canvas(initialLayout), { onRecoverableError }));
  return { container, onRecoverableError };
}

describe('the layout comments start with', () => {
  it('is narrow on the server by default, and the one the host names when it names one', () => {
    expect(layoutOf(renderToString(canvas()))).toBe('narrow');
    expect(layoutOf(renderToString(canvas('narrow')))).toBe('narrow');
    expect(layoutOf(renderToString(canvas('wide')))).toBe('wide');
  });

  it('is the one the server drew on the first render in the browser, so hydration changes nothing', () => {
    const { container, onRecoverableError } = hydrated('wide', 1000);
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(layoutOf(container.innerHTML)).toBe('wide');
    container.remove();
  });

  it('follows the width the canvas measures when it disagrees', () => {
    const narrow = hydrated('wide', 400);
    expect(layoutOf(narrow.container.innerHTML)).toBe('narrow');
    narrow.container.remove();
    const wide = hydrated(undefined, 1000);
    expect(layoutOf(wide.container.innerHTML)).toBe('wide');
    wide.container.remove();
  });
});
