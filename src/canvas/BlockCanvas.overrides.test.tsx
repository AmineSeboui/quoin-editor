import { act, fireEvent, screen } from '@testing-library/react';
import { Star } from 'lucide-react';
import { coreBlocks } from '../blocks/core';
import { mountCanvas, paragraph } from '../blocks/void/test-canvas';
import { resetDevWarnings } from '../dev-warn';
import { nodeSelection } from '../engine';
import { blockByType, defineBlock, type AnyBlockDefinition } from '../registry';
import type { BlockPreviewProps, QuoinBlock } from '../types';

function RichMarkdownPreview({ data, blockId }: BlockPreviewProps) {
  return <article data-testid={`rich-${blockId}`}>{String(data.markdown ?? '')}</article>;
}

const richMarkdown = defineBlock({ ...blockByType(coreBlocks, 'MARKDOWN')!, preview: RichMarkdownPreview });

const hostBlock = (type: string, editor = false): AnyBlockDefinition =>
  defineBlock({
    type,
    label: `Host ${type}`,
    icon: Star,
    preview: ({ blockId }) => <p data-testid={`host-${blockId}`}>{type}</p>,
    ...(editor ? { editor: () => <input aria-label={`${type} field`} /> } : {}),
  });

const blocks: QuoinBlock[] = [paragraph('a', '# Title'), paragraph('b', 'Some **bold** words')];

const textBlocks: QuoinBlock[] = [
  { id: 'c', type: 'CALLOUT', data: { tone: 'info', body: 'Note' } },
  { id: 't', type: 'TOGGLE', data: { markdown: 'Summary', open: true } },
  { id: 'd', type: 'DIVIDER', data: {} },
];

function type(text: string): void {
  for (const data of text) {
    const event = new InputEvent('beforeinput', { inputType: 'insertText', data, bubbles: true, cancelable: true });
    fireEvent(document.activeElement!, event);
  }
}

describe('a host definition of a block type the canvas draws itself', () => {
  beforeEach(() => resetDevWarnings());

  it('draws every MARKDOWN block with the host preview in a read-only canvas', () => {
    mountCanvas(blocks, { blockTypes: [...coreBlocks, richMarkdown], readOnly: true });
    expect(screen.getByTestId('rich-a')).toHaveTextContent('# Title');
    expect(screen.getByTestId('rich-b')).toHaveTextContent('Some **bold** words');
    expect(document.querySelectorAll('[data-quoin-host]')).toHaveLength(0);
  });

  it('draws the host definitions of CALLOUT, TOGGLE and DIVIDER as void blocks in a read-only canvas', () => {
    const hostTypes = ['CALLOUT', 'TOGGLE', 'DIVIDER'].map((name) => hostBlock(name));
    mountCanvas(textBlocks, { blockTypes: [...coreBlocks, ...hostTypes], readOnly: true });
    for (const id of ['c', 't', 'd']) expect(screen.getByTestId(`host-${id}`)).toBeInTheDocument();
    expect(document.querySelectorAll('[data-quoin-host]')).toHaveLength(0);
  });

  it('keeps the types typed in place as its own text blocks in an editable canvas, and says why in development', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mountCanvas([...blocks, ...textBlocks], { blockTypes: [...coreBlocks, richMarkdown, hostBlock('CALLOUT')] });
    expect(screen.queryByTestId('rich-b')).toBeNull();
    expect(screen.getByRole('textbox', { name: 'Paragraph' })).toHaveTextContent('Some bold words');
    expect(screen.getByRole('textbox', { name: 'Callout, info' })).toHaveTextContent('Note');
    expect(warn.mock.calls.map(([message]) => String(message).match(/"(\w+)"/)?.[1])).toEqual(['MARKDOWN', 'CALLOUT']);
    warn.mockRestore();
  });

  it('says nothing in development for copies of the core definitions that only take new labels', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const relabelled = coreBlocks.map((definition) => ({ ...definition, label: `Copy of ${definition.label}` }));
    mountCanvas(blocks, { blockTypes: relabelled });
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('draws a host divider as a void block in an editable canvas, whose editor opens from the keyboard', () => {
    const { nodeSelect, press } = mountCanvas(textBlocks, { blockTypes: [...coreBlocks, hostBlock('DIVIDER', true)] });
    expect(screen.getByTestId('host-d')).toBeInTheDocument();
    nodeSelect('d');
    press('Enter');
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'DIVIDER field' }));
  });

  it('opens the host editor of a divider the slash menu inserts', () => {
    const canvas = mountCanvas([paragraph('a', '')], { blockTypes: [...coreBlocks, hostBlock('DIVIDER', true)] });
    act(() => canvas.handle().focus({ block: 'a', region: 'text', offset: 0 }));
    type('/divider');
    fireEvent.keyDown(document.activeElement!, { key: 'Enter' });
    expect(canvas.last()).toEqual([{ id: 'a', type: 'DIVIDER', data: {} }]);
    expect(canvas.selection()).toEqual(nodeSelection('a'));
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'DIVIDER field' }));
  });
});
