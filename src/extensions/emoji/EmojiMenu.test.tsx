import { createRef, StrictMode, useState } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { coreBlocks } from '../../blocks/core';
import { paragraph } from '../../blocks/void/test-canvas';
import { BlockCanvas } from '../../canvas/BlockCanvas';
import type { QuoinEditorHandle } from '../../canvas/canvas-props';
import { mentionExtension } from '../mention/mention-extension';
import { mountTypingCanvas } from '../typing-test-canvas';
import { loadEmojiData } from './emoji-data';
import { emojiExtension } from './emoji-extension';
import { heldEmojiData, mountEmoji } from './emoji-test-canvas';

const PARTY_POPPER = '\u{1F389}';
const SMILEY = '\u{1F603}';
const SMILE = '\u{1F604}';
const LOADING = 'Loading emoji\u2026';
const FAILED = 'Emoji could not be loaded';

const options = () => within(screen.getByRole('listbox', { name: 'Emoji' })).queryAllByRole('option');
const popup = () => screen.getByRole('listbox', { name: 'Emoji' }).parentElement!;

async function expectAccessible(canvas: ReturnType<typeof mountEmoji>) {
  await act(async () => {});
  expect(await axe(canvas.container)).toHaveNoViolations();
  expect(await axe(popup())).toHaveNoViolations();
}
const optionNames = () => options().map((option) => option.textContent);

function openOn(markdown: string, canvas: Parameters<typeof mountEmoji>[2] = {}) {
  const mounted = mountEmoji([paragraph('p', markdown)], {}, canvas);
  mounted.caret('p', markdown.length);
  return mounted;
}

describe('the emoji menu', () => {
  beforeAll(() => loadEmojiData());
  afterEach(() => vi.restoreAllMocks());

  it('opens on : and two characters, the first match active, with the smiles first for :smi', () => {
    const canvas = openOn('Hello');
    canvas.type(' :s');
    expect(canvas.menu()).toBeNull();
    canvas.type('mi');
    expect(optionNames().slice(0, 2)).toEqual([`${SMILEY}smiley`, `${SMILE}smile`]);
    expect(options()[0]).toHaveAttribute('aria-selected', 'true');
    expect(options()[0]).toHaveAccessibleName('smiley');
  });

  it('puts the party popper for :tada and Enter in place of the : and the query, and one undo brings them back', () => {
    const canvas = openOn('');
    canvas.type(':tada');
    canvas.key('Enter');
    expect(canvas.menu()).toBeNull();
    expect(canvas.markdown('p')).toBe(PARTY_POPPER);
    expect(canvas.selection()).toMatchObject({ head: { block: 'p', offset: PARTY_POPPER.length } });
    canvas.undo();
    expect(canvas.markdown('p')).toBe(':tada');
  });

  it('chooses with Tab and the arrows too', () => {
    const canvas = openOn('Hi');
    canvas.type(' :smi');
    canvas.key('ArrowDown');
    canvas.key('Tab');
    expect(canvas.markdown('p')).toBe(`Hi ${SMILE}`);
  });

  it('closes on Escape and keeps the text, and stays closed as the query grows', () => {
    const canvas = openOn('');
    canvas.type(':tada');
    canvas.key('Escape');
    expect(canvas.menu()).toBeNull();
    canvas.type('a');
    expect(canvas.menu()).toBeNull();
    expect(canvas.markdown('p')).toBe(':tadaa');
  });

  it('closes at a space, and opens nothing for a : inside a word, a time or a web address', () => {
    const canvas = openOn('');
    canvas.type(':tada ');
    expect(canvas.menu()).toBeNull();
    for (const typed of ['at 10:30', ' see https:', '//quoin.dev', ' note:ok']) {
      canvas.type(typed);
      expect(canvas.menu()).toBeNull();
    }
    expect(canvas.markdown('p')).toBe(':tada at 10:30 see <https://quoin.dev> note:ok');
  });

  it('chooses nothing on an Enter that belongs to a composition', () => {
    const canvas = openOn('');
    canvas.type(':tada');
    canvas.key('Enter', { keyCode: 229 });
    canvas.key('Enter', { isComposing: true });
    expect(canvas.markdown('p')).toBe(':tada');
    expect(canvas.menu()).not.toBeNull();
  });

  it('opens and chooses once under StrictMode', () => {
    const ref = createRef<QuoinEditorHandle>();
    const extensions = [emojiExtension()];
    function Host() {
      const [blocks, setBlocks] = useState([paragraph('p', '')]);
      return <BlockCanvas ref={ref} blocks={blocks} onChange={setBlocks} blockTypes={coreBlocks} extensions={extensions} />;
    }
    render(
      <StrictMode>
        <Host />
      </StrictMode>,
    );
    act(() => ref.current!.focus({ block: 'p', region: 'text', offset: 0 }));
    for (const data of ':tada') {
      const event = new InputEvent('beforeinput', { inputType: 'insertText', data, bubbles: true, cancelable: true });
      act(() => void document.activeElement!.dispatchEvent(event));
    }
    expect(optionNames()[0]).toBe(`${PARTY_POPPER}tada`);
    act(() => void fireEvent.keyDown(document.activeElement!, { key: 'Enter' }));
    expect(ref.current!.editor.getBlocks()[0].data.markdown).toBe(PARTY_POPPER);
  });

  it('takes over from the @ menu while its : is the trigger nearest the caret', () => {
    const search = vi.fn(async () => [{ id: '1', label: 'Ada Lovelace' }]);
    const extensions = [mentionExtension({ search }), emojiExtension()];
    const canvas = mountTypingCanvas([paragraph('p', '')], { extensions });
    canvas.caret('p', 0);
    canvas.type('@Ada :sm');
    expect(screen.getAllByRole('listbox').map((listbox) => listbox.getAttribute('aria-label'))).toEqual(['Emoji']);
    canvas.key('Escape');
    expect(screen.queryByRole('listbox', { name: 'Emoji' })).toBeNull();
  });

  it('stays closed on a read-only canvas', () => {
    const canvas = openOn(':tada', { readOnly: true });
    expect(canvas.menu()).toBeNull();
  });

  it('has no axe violations while open', async () => {
    const canvas = openOn('');
    canvas.type(':smi');
    await expectAccessible(canvas);
    expect(canvas.host('p')).toHaveAttribute('role', 'combobox');
  });
});

describe('the emoji menu, while the dataset loads', () => {
  afterEach(() => vi.restoreAllMocks());

  it('says it loads the emoji until they come, then lists the matches', async () => {
    const held = heldEmojiData();
    const canvas = openOn('');
    canvas.type(':tada');
    expect(screen.getByText(LOADING)).toBeInTheDocument();
    await expectAccessible(canvas);
    await held.last().resolve();
    expect(screen.queryByText(LOADING)).toBeNull();
    expect(optionNames()[0]).toBe(`${PARTY_POPPER}tada`);
  });

  it('says the emoji could not be loaded when the load fails, reports it once, and loads again on a later open', async () => {
    const onError = vi.fn();
    const held = heldEmojiData();
    const canvas = openOn('', { onError });
    canvas.type(':ta');
    canvas.type('d');
    await held.answers[0].reject(new Error('offline'));
    await held.answers[1].reject(new Error('offline'));
    expect(screen.getByText(FAILED)).toBeInTheDocument();
    expect(onError.mock.calls).toEqual([[new Error('offline')]]);
    await expectAccessible(canvas);
    canvas.type('a');
    expect(held.load).toHaveBeenCalledTimes(2);
    expect(screen.getByText(FAILED)).toBeInTheDocument();
    canvas.type(' more');
    expect(canvas.host('p')).toBeInTheDocument();
    expect(canvas.markdown('p')).toBe(':tada more');

    canvas.type(' :ta');
    expect(held.load).toHaveBeenCalledTimes(3);
    expect(screen.getByText(LOADING)).toBeInTheDocument();
    await held.last().resolve();
    canvas.type('da');
    expect(held.load).toHaveBeenCalledTimes(3);
    expect(optionNames()[0]).toBe(`${PARTY_POPPER}tada`);
  });

  it('reports no failure that comes once the canvas is gone', async () => {
    const onError = vi.fn();
    const held = heldEmojiData();
    const canvas = openOn('', { onError });
    canvas.type(':ta');
    cleanup();
    await held.last().reject(new Error('offline'));
    expect(onError).not.toHaveBeenCalled();
  });
});
