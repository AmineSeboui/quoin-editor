import { act, fireEvent, screen } from '@testing-library/react';
import { ShieldAlert } from 'lucide-react';
import { resetDevWarnings } from '../../dev-warn';
import { defineBlock } from '../../registry';
import type { QuoinBlock } from '../../types';
import { mountCanvas, paragraph, testBlockTypes } from './test-canvas';

const refused = new Error('owner is required');

const strict = defineBlock<{ owner: string }>({
  type: 'STRICT',
  label: 'Strict',
  icon: ShieldAlert,
  parse: (data) => {
    if (typeof data.owner !== 'string') throw refused;
    return { owner: data.owner };
  },
  preview: ({ data }) => <p>{`Owned by ${data.owner}`}</p>,
});

const inserter = defineBlock<{ note: string }>({
  type: 'INSERTER',
  label: 'Inserter',
  icon: ShieldAlert,
  alwaysEditing: true,
  editor: ({ onInsertBlock }) => (
    <button type="button" onClick={() => onInsertBlock?.('STRICT')}>
      Add strict
    </button>
  ),
});

const blockTypes = [...testBlockTypes, strict, inserter];

function typeText(text: string): void {
  for (const data of text) {
    const event = new InputEvent('beforeinput', { inputType: 'insertText', data, bubbles: true, cancelable: true });
    fireEvent(document.activeElement!, event);
  }
}

function chooseFromSlash(blocks: QuoinBlock[], props = {}) {
  const canvas = mountCanvas(blocks, { blockTypes, ...props });
  act(() => canvas.handle().focus({ block: 'a', region: 'text', offset: 0 }));
  typeText('/strict');
  fireEvent.keyDown(document.activeElement!, { key: 'Enter' });
  return canvas;
}

const types = (canvas: ReturnType<typeof mountCanvas>) => canvas.handle().editor.getBlocks().map(({ type }) => type);

describe('a block whose parse throws on the empty data an insertion seeds it with', () => {
  let warned: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    resetDevWarnings();
    warned = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => warned.mockRestore());

  it('inserts nothing from the slash palette and reports the error to the canvas', () => {
    const onError = vi.fn();
    const canvas = chooseFromSlash([paragraph('a', '')], { onError });
    expect(types(canvas)).toEqual(['MARKDOWN']);
    expect(onError).toHaveBeenCalledWith(refused);
    expect(warned).not.toHaveBeenCalled();
  });

  it('warns the developer when the canvas has no onError', () => {
    const canvas = chooseFromSlash([paragraph('a', '')]);
    expect(types(canvas)).toEqual(['MARKDOWN']);
    expect(warned).toHaveBeenCalledWith(expect.stringContaining('"STRICT"'));
  });

  it('inserts nothing after a block whose editor asks for it and reports the error to the canvas', () => {
    const onError = vi.fn();
    const canvas = mountCanvas([{ id: 'i', type: 'INSERTER', data: { note: '' } }], { blockTypes, onError });
    fireEvent.click(screen.getByRole('button', { name: 'Add strict' }));
    expect(types(canvas)).toEqual(['INSERTER']);
    expect(onError).toHaveBeenCalledWith(refused);
  });
});
