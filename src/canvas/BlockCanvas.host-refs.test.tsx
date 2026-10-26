import { render } from '@testing-library/react';
import type * as ReactModule from 'react';
import { coreBlocks } from '../blocks/core';
import { BlockCanvas } from './BlockCanvas';

// A renderer that sets no host refs, as react-test-renderer without createNodeMock, stood in for by refs that never
// take the editor's root element.
vi.mock('react', async (importOriginal) => {
  const react = await importOriginal<typeof ReactModule>();
  const skipRoot = <T,>(initial: T) => {
    let value = initial;
    return {
      get current() {
        return value;
      },
      set current(next: T) {
        if (!(next instanceof HTMLElement && next.classList.contains('quoin-editor'))) value = next;
      },
    };
  };
  function useRef<T>(initial: T) {
    const ref = react.useRef<{ current: T } | null>(null);
    ref.current ??= skipRoot(initial);
    return ref.current;
  }
  return { ...react, default: { ...react, useRef }, useRef };
});

describe('a canvas drawn by a renderer that sets no host refs', () => {
  it('renders without attaching to a root it was not given', () => {
    const blocks = [{ id: 'a', type: 'MARKDOWN', data: { markdown: 'Hello' } }];
    expect(() => render(<BlockCanvas blocks={blocks} onChange={() => {}} blockTypes={coreBlocks} />)).not.toThrow();
  });
});
