import { createRef } from 'react';
import { render } from '@testing-library/react';
import { coreBlocks } from '../blocks/core';
import type { QuoinConfig } from '../context';
import { englishLabels } from '../i18n/labels';
import type { QuoinBlock } from '../types';
import { BlockCanvas } from './BlockCanvas';
import type { QuoinEditorHandle } from './canvas-props';

const probe = vi.hoisted(() => ({ config: null as QuoinConfig | null }));

vi.mock('./collect-ui', async () => {
  const { useQuoin } = await import('../context');
  const { defaultRenderers } = await import('../view');
  function Probe() {
    probe.config = useQuoin();
    return <div contentEditable={false}>probe</div>;
  }
  return { canvasRenderers: () => ({ ...defaultRenderers, PROBE: Probe }) };
});

const blocks: QuoinBlock[] = [{ id: 'p', type: 'PROBE', data: {} }];

beforeEach(() => {
  probe.config = null;
});

describe('what BlockCanvas hands its blocks through useQuoin', () => {
  it('is the registry, the host couplings and the controller of the canvas', () => {
    const ref = createRef<QuoinEditorHandle>();
    const blockTypes = [...coreBlocks];
    const upload = vi.fn();
    const resolveAssetUrl = (key: string) => `/files/${key}`;
    const onError = vi.fn();
    render(
      <BlockCanvas
        ref={ref}
        blocks={blocks}
        onChange={() => {}}
        blockTypes={blockTypes}
        upload={upload}
        resolveAssetUrl={resolveAssetUrl}
        onError={onError}
      />,
    );
    expect(probe.config).toMatchObject({ blockTypes, upload, resolveAssetUrl, onError });
    expect(probe.config?.controller).toBe(ref.current!.controller);
  });

  it('defaults the registry to the core blocks and leaves uploads unwired', () => {
    render(<BlockCanvas blocks={blocks} onChange={() => {}} />);
    expect(probe.config?.blockTypes).toBe(coreBlocks);
    expect(probe.config?.upload).toBeUndefined();
    expect(probe.config?.resolveAssetUrl('k')).toBe('k');
  });

  it('carries the English labels, with the keys the host overrides', () => {
    const { rerender } = render(<BlockCanvas blocks={blocks} onChange={() => {}} />);
    expect(probe.config?.labels).toEqual(englishLabels);
    rerender(<BlockCanvas blocks={blocks} onChange={() => {}} labels={{ bold: 'Gras' }} />);
    expect(probe.config?.labels).toEqual({ ...englishLabels, bold: 'Gras' });
  });
});
