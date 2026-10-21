import { createRef } from 'react';
import { render } from '@testing-library/react';
import { coreBlocks } from '../blocks/core';
import { useQuoin, type QuoinConfig } from '../context';
import { defineExtension } from '../engine';
import type { ExtensionUI } from '../extensions/ui-types';
import { englishLabels } from '../i18n/english-labels';
import type { QuoinBlock } from '../types';
import { BlockCanvas } from './BlockCanvas';
import type { QuoinEditorHandle } from './canvas-props';

const probe = { config: null as QuoinConfig | null };

function Probe() {
  probe.config = useQuoin();
  return <div contentEditable={false}>probe</div>;
}

const probeUi: ExtensionUI = { renderers: { PROBE: Probe } };
const extensions = [defineExtension({ name: 'probe', ui: probeUi })];

const blocks: QuoinBlock[] = [{ id: 'p', type: 'PROBE', data: {} }];

beforeEach(() => {
  probe.config = null;
});

describe('what BlockCanvas hands its blocks through useQuoin', () => {
  it('is the registry, the host couplings, the code highlighter and the controller of the canvas', () => {
    const ref = createRef<QuoinEditorHandle>();
    const blockTypes = [...coreBlocks];
    const upload = vi.fn();
    const resolveAssetUrl = (key: string) => `/files/${key}`;
    const onError = vi.fn();
    const highlight = vi.fn(() => []);
    render(
      <BlockCanvas
        ref={ref}
        extensions={extensions}
        blocks={blocks}
        onChange={() => {}}
        blockTypes={blockTypes}
        upload={upload}
        resolveAssetUrl={resolveAssetUrl}
        onError={onError}
        highlight={highlight}
      />,
    );
    expect(probe.config).toMatchObject({ blockTypes, upload, resolveAssetUrl, onError, highlight });
    expect(probe.config?.controller).toBe(ref.current!.controller);
  });

  it('defaults the registry to the core blocks and leaves uploads unwired', () => {
    render(<BlockCanvas extensions={extensions} blocks={blocks} onChange={() => {}} />);
    expect(probe.config?.blockTypes).toBe(coreBlocks);
    expect(probe.config?.upload).toBeUndefined();
    expect(probe.config?.resolveAssetUrl('k')).toBe('k');
  });

  it('carries the English labels, with the keys the host overrides', () => {
    const { rerender } = render(<BlockCanvas extensions={extensions} blocks={blocks} onChange={() => {}} />);
    expect(probe.config?.labels).toEqual(englishLabels);
    rerender(<BlockCanvas extensions={extensions} blocks={blocks} onChange={() => {}} labels={{ bold: 'Gras' }} />);
    expect(probe.config?.labels).toEqual({ ...englishLabels, bold: 'Gras' });
  });
});
