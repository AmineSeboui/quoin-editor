import {
  coreExtensions,
  insertText,
  removeBlocksStep,
  replaceInlineStep,
  text,
  Transaction,
  undo,
  type Editor,
} from '../../engine';
import { caret, md, range, startEditor } from '../../engine/test-support/editor-fixtures';
import { deleteRange } from '../../engine/commands/delete-range';
import { acceptAnswer } from './ai-accept';
import { aiExtension } from './ai-extension';
import { ask, openMenu, retry } from './ai-flow';
import { aiState } from './ai-plugin';
import { targetOfSelection } from './ai-target';
import { fakeAiHost, nextFrame } from './ai-test-host';

function writing(...lines: string[]) {
  const host = fakeAiHost();
  const { editor } = startEditor(
    lines.map((line, i) => md(`p${i}`, line)),
    { extensions: [...coreExtensions(), aiExtension({ stream: host.stream })] },
  );
  editor.mount();
  return { ...host, editor };
}

async function answer(editor: Editor, host: ReturnType<typeof writing>, action: 'improve' | 'continue', output: string) {
  openMenu(editor, targetOfSelection(editor.state)!, false);
  ask(editor, host.stream, { action });
  host.last().push(output);
  host.last().end();
  await nextFrame();
}

const at = (block: string, offset: number) => ({ block, region: 'text', offset });
const texts = (editor: Editor) => editor.getBlocks().map((block) => block.data.markdown);
const back = (editor: Editor) => undo(editor.state, (tr) => editor.dispatch(tr));

describe('accepting an answer', () => {
  it('replaces the selected text in one transaction from AI, which one undo takes back', async () => {
    const host = writing('Say a word here');
    const { editor } = host;
    editor.commands.setSelection(range('p0', 4, 10));
    await answer(editor, host, 'improve', 'some **words**');
    const origins: string[] = [];
    editor.subscribe((_, tr) => tr && origins.push(tr.origin));
    expect(acceptAnswer(editor)).toEqual({ gone: false });
    expect(texts(editor)).toEqual(['Say some **words** here']);
    expect(origins).toEqual(['ai']);
    expect(aiState(editor.state)).toMatchObject({ ghost: null, target: null });
    back(editor);
    expect(texts(editor)).toEqual(['Say a word here']);
    expect(editor.can().undo()).toBe(false);
  });

  it('puts the answer to an action that writes more below the block, in one undo step', async () => {
    const host = writing('First', 'Last');
    const { editor } = host;
    editor.commands.setSelection(caret('p0', 2));
    await answer(editor, host, 'continue', 'More text.\n\n- an item');
    acceptAnswer(editor);
    expect(texts(editor)).toEqual(['First', 'More text.', '- an item', 'Last']);
    back(editor);
    expect(texts(editor)).toEqual(['First', 'Last']);
  });

  it('fills the empty line it was asked from', async () => {
    const host = writing('Before', '');
    const { editor } = host;
    editor.commands.setSelection(caret('p1', 0));
    await answer(editor, host, 'continue', '## A heading\n\nBody');
    acceptAnswer(editor);
    expect(texts(editor)).toEqual(['Before', '## A heading', 'Body']);
  });

  it('replaces the text where edits made while it streamed moved it, including those of a collaborator', async () => {
    const host = writing('Say a word here', 'Other');
    const { editor } = host;
    editor.commands.setSelection(range('p0', 4, 10));
    openMenu(editor, targetOfSelection(editor.state)!, false);
    ask(editor, host.stream, { action: 'improve' });
    host.last().push('one ');
    await nextFrame();
    editor.commands.setSelection(caret('p0', 0));
    insertText('So, ')(editor.state, (tr) => editor.dispatch(tr));
    const remote = new Transaction(editor.state).setOrigin('remote');
    remote.step(replaceInlineStep('p0', 'text', 19, 19, [text('!')]));
    editor.dispatch(remote);
    editor.commands.setSelection(caret('p1', 5));
    insertText(' end')(editor.state, (tr) => editor.dispatch(tr));
    host.last().push('term');
    host.last().end();
    await nextFrame();
    acceptAnswer(editor);
    expect(texts(editor)).toEqual(['So, Say one term here!', 'Other end']);
    back(editor);
    expect(texts(editor)).toEqual(['So, Say a word here!', 'Other end']);
  });

  it('inserts the answer where its text was when that text was deleted meanwhile, and says so', async () => {
    const host = writing('Say a word here');
    const { editor } = host;
    editor.commands.setSelection(range('p0', 4, 10));
    await answer(editor, host, 'improve', 'one term');
    editor.dispatch(new Transaction(editor.state).step(replaceInlineStep('p0', 'text', 3, 11, [])));
    expect(texts(editor)).toEqual(['Sayhere']);
    expect(acceptAnswer(editor)).toEqual({ gone: true });
    expect(texts(editor)).toEqual(['Sayone termhere']);
  });

  it('reads the answer with the engine parser, as a paste is read, so an unsafe link is dropped and its HTML stays text', async () => {
    const host = writing('Text');
    const { editor } = host;
    editor.commands.setSelection(caret('p0', 0));
    await answer(editor, host, 'continue', 'A [link](javascript:alert(1)) <img src=x onerror=alert(1)>');
    acceptAnswer(editor);
    // The unsafe address is dropped and the tag stays text, escaped as such.
    expect(texts(editor)[1]).toBe('A link \\<img src=x onerror=alert(1)>');
  });

  it('does nothing while the answer streams or when there is none', () => {
    const host = writing('Text');
    const { editor } = host;
    expect(acceptAnswer(editor)).toBeNull();
    openMenu(editor, targetOfSelection(editor.state)!, false);
    ask(editor, host.stream, { action: 'continue' });
    expect(acceptAnswer(editor)).toBeNull();
  });

  it('puts the answer as blocks of their own between the neighbours of a block deleted while it streamed', async () => {
    for (const retried of [false, true]) {
      const host = writing('First', 'Middle words', 'Last');
      const { editor } = host;
      editor.commands.setSelection(caret('p1', 3));
      openMenu(editor, targetOfSelection(editor.state)!, false);
      ask(editor, host.stream, { action: 'improve' });
      host.last().push('Better words');
      await nextFrame();
      editor.dispatch(new Transaction(editor.state).setOrigin('remote').step(removeBlocksStep(1, 1)));
      await nextFrame();
      if (retried) {
        retry(editor, host.stream);
        host.last().push('Retried words');
        host.last().end();
        await nextFrame();
      }
      expect(acceptAnswer(editor)).toEqual({ gone: true });
      expect(texts(editor)).toEqual(['First', retried ? 'Retried words' : 'Better words', 'Last']);
      back(editor);
      expect(texts(editor)).toEqual(['First', 'Last']);
    }
  });

  it('puts it before the next block when the deleted block was the first', async () => {
    const host = writing('Only words', 'Next');
    const { editor } = host;
    editor.commands.setSelection(caret('p0', 2));
    openMenu(editor, targetOfSelection(editor.state)!, false);
    ask(editor, host.stream, { action: 'continue' });
    host.last().push('New');
    await nextFrame();
    editor.dispatch(new Transaction(editor.state).setOrigin('remote').step(removeBlocksStep(0, 1)));
    await nextFrame();
    expect(acceptAnswer(editor)).toEqual({ gone: true });
    expect(texts(editor)).toEqual(['New', 'Next']);
  });

  it('keeps the answer, stopped, and puts it where a deletion of its block and both neighbours collapsed', async () => {
    for (const origin of ['input', 'remote'] as const) {
      const host = writing('Keep', 'Above', 'Target words', 'Below', 'Tail');
      const { editor } = host;
      editor.commands.setSelection(caret('p2', 3));
      openMenu(editor, targetOfSelection(editor.state)!, false);
      ask(editor, host.stream, { action: 'improve' });
      host.last().push('Better target');
      await nextFrame();
      const tr = new Transaction(editor.state).setOrigin(origin);
      deleteRange(tr, editor.state.schema, at('p0', 2), at('p4', 2));
      editor.dispatch(tr);
      await nextFrame();
      expect(host.last().signal.aborted).toBe(true);
      expect(aiState(editor.state).ghost).toMatchObject({ phase: 'stopped', output: 'Better target' });
      expect(acceptAnswer(editor)).toEqual({ gone: true });
      expect(texts(editor)).toEqual(['Keil', 'Better target']);
    }
  });

  it('keeps the answer when the whole document is deleted', async () => {
    const host = writing('One', 'Target words', 'Three');
    const { editor } = host;
    editor.commands.setSelection(caret('p1', 3));
    openMenu(editor, targetOfSelection(editor.state)!, false);
    ask(editor, host.stream, { action: 'improve' });
    host.last().push('Better');
    await nextFrame();
    editor.commands.setSelection({ kind: 'text', anchor: at('p0', 0), head: at('p2', 5) });
    editor.commands.deleteBackward();
    await nextFrame();
    expect(aiState(editor.state).ghost).toMatchObject({ phase: 'stopped', output: 'Better' });
    expect(acceptAnswer(editor)).toEqual({ gone: true });
    expect(texts(editor)).toEqual(['', 'Better']);
  });
});
