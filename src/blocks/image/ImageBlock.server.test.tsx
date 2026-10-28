// @vitest-environment node
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BlockCanvas } from '../../canvas/BlockCanvas';
import type { QuoinBlock } from '../../types';
import { testBlockTypes } from '../void/test-canvas';

const image: QuoinBlock = { id: 'i', type: 'IMAGE', data: { storageKey: 'cat.png', alt: '' } };

describe('the image block rendered on the server', () => {
  it('draws without a DOMRect global, with its no alt text badge', () => {
    expect(globalThis.DOMRect).toBeUndefined();
    const html = renderToString(<BlockCanvas blocks={[image]} blockTypes={testBlockTypes} onChange={() => undefined} />);
    expect(html).toContain('No alt text');
  });
});
