import { coreExtensions, type EditorState, type Selection } from '../../engine';
import { caret, md, range, startEditor } from '../../engine/test-support/editor-fixtures';
import { aroundSelection, buildRequest, CONTEXT_LIMIT } from './ai-request';
import { targetOfSelection } from './ai-target';

const stateOf = (blocks: ReturnType<typeof md>[], selection: Selection) => {
  const { editor } = startEditor(blocks, { extensions: coreExtensions() });
  editor.commands.setSelection(selection);
  return editor.state;
};

const request = (state: EditorState) => buildRequest(state, targetOfSelection(state)!, { action: 'improve' });

describe('the request sent to the host', () => {
  it('sends the markdown of the selected text, and the whole document as context when it is short', () => {
    const state = stateOf([md('a', '# Title'), md('b', 'Some **bold** words here')], range('b', 5, 15));
    expect(request(state)).toEqual({
      action: 'improve',
      selection: '**bold** words',
      context: '# Title\n\nSome **bold** words here\n',
    });
  });

  it('sends the whole block the caret is in, with its type, when nothing is selected', () => {
    const state = stateOf([md('a', '## A heading'), md('b', 'Next')], caret('a', 3));
    expect(request(state).selection).toBe('## A heading');
  });

  it('sends the selection across blocks as markdown', () => {
    const state = stateOf([md('a', 'First line'), md('b', '- an item'), md('c', 'Last')], {
      kind: 'text',
      anchor: { block: 'a', region: 'text', offset: 6 },
      head: { block: 'c', region: 'text', offset: 2 },
    });
    expect(request(state).selection).toBe('line\n\n- an item\n\nLa');
  });

  it('sends an empty selection from an empty line', () => {
    const state = stateOf([md('a', 'Before'), md('b', '')], caret('b', 0));
    expect(request(state).selection).toBe('');
  });

  it('passes the prompt and the language on when given', () => {
    const state = stateOf([md('a', 'Hello')], caret('a', 0));
    const target = targetOfSelection(state)!;
    expect(buildRequest(state, target, { action: 'translate', prompt: 'French', language: 'en-GB' })).toMatchObject({
      action: 'translate',
      prompt: 'French',
      language: 'en-GB',
    });
  });

  it('cuts a long document to 8,000 characters around the selection, at block boundaries', () => {
    const blocks = Array.from({ length: 200 }, (_, i) => md(`p${i}`, `Paragraph ${i} ${'words '.repeat(15).trim()}`));
    const state = stateOf(blocks, range('p150', 0, 9));
    const { context } = request(state);
    expect(CONTEXT_LIMIT).toBe(8_000);
    expect(context.length).toBeLessThanOrEqual(8_000);
    expect(context.length).toBeGreaterThan(7_000);
    expect(context).toContain('Paragraph 150 ');
    expect(context).toMatch(/^Paragraph \d+ /);
    expect(context).toMatch(/ words\n$/);
    const first = Number(/^Paragraph (\d+)/.exec(context)![1]);
    const last = Number(/Paragraph (\d+) [^\n]*$/.exec(context.trimEnd())![1]);
    expect(Math.abs(150 - first - (last - 150))).toBeLessThanOrEqual(2);
  });

  it('keeps the context at the start of the document when the selection is near it', () => {
    const blocks = Array.from({ length: 200 }, (_, i) => md(`p${i}`, `Paragraph ${i} ${'words '.repeat(15)}`));
    const { context } = request(stateOf(blocks, range('p1', 0, 4)));
    expect(context.startsWith('Paragraph 0 ')).toBe(true);
    expect(context.length).toBeLessThanOrEqual(8_000);
  });
});

describe('the context window', () => {
  it('never splits a surrogate pair where no block boundary is near', () => {
    const smile = '\ud83d\ude00';
    const text = smile.repeat(10);
    for (const limit of [3, 4, 5, 7]) {
      const cut = aroundSelection(text, 9, 11, limit);
      expect(cut.length).toBeLessThanOrEqual(limit);
      expect(cut).toMatch(/^(\ud83d\ude00)*$/);
    }
  });

  it('is centred on the selection', () => {
    const text = 'a'.repeat(100) + 'X' + 'b'.repeat(100);
    expect(aroundSelection(text, 100, 101, 21)).toBe(`${'a'.repeat(10)}X${'b'.repeat(10)}`);
  });
});
