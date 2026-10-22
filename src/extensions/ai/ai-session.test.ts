import { coreExtensions, removeBlocksStep, type Editor } from '../../engine';
import { deleteBlocks } from '../../engine/commands/block-structure';
import { caret, md, range, startEditor } from '../../engine/test-support/editor-fixtures';
import { aiExtension } from './ai-extension';
import { ask, discard, followUp, openMenu, retry, stop } from './ai-flow';
import { linkOf } from './ai-link';
import { AI, aiState, type AiAct } from './ai-plugin';
import { targetOfSelection } from './ai-target';
import { fakeAiHost, nextFrame } from './ai-test-host';

function writing(...lines: string[]) {
  const host = fakeAiHost();
  const extension = aiExtension({ stream: host.stream });
  const { editor } = startEditor(
    lines.map((line, i) => md(`p${i}`, line)),
    { extensions: [...coreExtensions(), extension] },
  );
  const unmount = editor.mount();
  const link = linkOf(editor);
  const report = vi.fn();
  const written = vi.fn();
  link.report = report;
  link.ended = written;
  const acts: AiAct[] = [];
  editor.subscribe((_, tr) => {
    const act = tr?.getMeta<AiAct>(AI);
    if (act !== undefined) acts.push(act);
  });
  return { ...host, editor, unmount, report, written, acts };
}

function askAbout(editor: Editor, stream: Parameters<typeof ask>[1], action: Parameters<typeof ask>[2]['action']) {
  openMenu(editor, targetOfSelection(editor.state)!, false);
  ask(editor, stream, { action });
}

const ghost = (editor: Editor) => aiState(editor.state).ghost;

describe('streaming an answer from the host', () => {
  it('sends the request and draws the chunks at most once a frame, closed for display', async () => {
    const { editor, stream, last, acts } = writing('Say a word here');
    editor.commands.setSelection(range('p0', 4, 10));
    askAbout(editor, stream, 'improve');
    expect(stream).toHaveBeenCalledTimes(1);
    expect(last().request).toMatchObject({ action: 'improve', selection: 'a word' });
    expect(ghost(editor)).toMatchObject({ phase: 'streaming', replace: true, output: '' });
    last().push('Hel');
    last().push('lo **wor');
    await Promise.resolve();
    expect(ghost(editor)?.output).toBe('');
    await nextFrame();
    expect(ghost(editor)).toMatchObject({ output: 'Hello **wor', shown: 'Hello **wor**' });
    expect(acts.filter((act) => act.type === 'stream')).toHaveLength(1);
  });

  it('ends with what streamed, said once', async () => {
    const { editor, stream, last, written } = writing('Some text');
    editor.commands.setSelection(caret('p0', 2));
    askAbout(editor, stream, 'continue');
    last().push('More ');
    last().push('words.');
    last().end();
    await nextFrame();
    expect(ghost(editor)).toMatchObject({ phase: 'done', replace: false, output: 'More words.' });
    expect(written).toHaveBeenCalledTimes(1);
    expect(written).toHaveBeenCalledWith('done', 'More words.');
  });

  it('aborts the signal on Stop and keeps what streamed for Accept or Discard', async () => {
    const { editor, stream, last, written } = writing('Some text');
    editor.commands.setSelection(caret('p0', 2));
    askAbout(editor, stream, 'continue');
    last().push('Partial');
    await nextFrame();
    stop(editor);
    expect(last().signal.aborted).toBe(true);
    expect(ghost(editor)).toMatchObject({ phase: 'stopped', output: 'Partial' });
    last().push(' and more');
    last().end();
    await nextFrame();
    expect(ghost(editor)).toMatchObject({ phase: 'stopped', output: 'Partial' });
    expect(last().returned).toBe(true);
    expect(written).toHaveBeenCalledTimes(1);
    expect(written).toHaveBeenCalledWith('stopped', 'Partial');
  });

  it('keeps chunks that arrived before Stop but were not drawn yet', async () => {
    const { editor, stream, last } = writing('Some text');
    askAbout(editor, stream, 'continue');
    last().push('Quick');
    await Promise.resolve();
    await Promise.resolve();
    stop(editor);
    expect(ghost(editor)).toMatchObject({ phase: 'stopped', output: 'Quick' });
  });

  it('reports a stream that fails, rejects, throws or gives something other than text, and shows it', async () => {
    const failing = [
      (call: ReturnType<ReturnType<typeof fakeAiHost>['last']>) => call.fail(new Error('quota')),
      (call: ReturnType<ReturnType<typeof fakeAiHost>['last']>) => call.push(42),
    ];
    for (const fail of failing) {
      const { editor, stream, last, report } = writing('Some text');
      askAbout(editor, stream, 'continue');
      last().push('Half');
      fail(last());
      await nextFrame();
      expect(ghost(editor)?.phase).toBe('error');
      expect(report).toHaveBeenCalledTimes(1);
      expect(report.mock.calls[0][0]).toBeInstanceOf(Error);
    }
    const thrown = writing('Some text');
    thrown.stream.mockImplementationOnce(() => {
      throw new Error('no model');
    });
    askAbout(thrown.editor, thrown.stream, 'continue');
    await nextFrame();
    expect(ghost(thrown.editor)?.phase).toBe('error');
    expect(thrown.report).toHaveBeenCalledWith(new Error('no model'));
    const rejected = writing('Some text');
    rejected.stream.mockImplementationOnce(() => Promise.reject(new Error('offline')) as never);
    askAbout(rejected.editor, rejected.stream, 'continue');
    await nextFrame();
    expect(ghost(rejected.editor)?.phase).toBe('error');
    expect(rejected.report).toHaveBeenCalledWith(new Error('offline'));
  });

  it('retries with the same request, and asks a follow-up about the last answer', async () => {
    const { editor, stream, calls } = writing('Some text');
    editor.commands.setSelection(range('p0', 0, 4));
    askAbout(editor, stream, 'shorten');
    calls[0].fail(new Error('busy'));
    await nextFrame();
    retry(editor, stream);
    expect(calls[1].request).toEqual(calls[0].request);
    expect(ghost(editor)).toMatchObject({ phase: 'streaming', replace: true });
    calls[1].push('So');
    calls[1].end();
    await nextFrame();
    followUp(editor, stream, 'in French');
    expect(calls[2].request).toEqual({
      action: 'custom',
      prompt: 'in French',
      selection: 'So',
      context: calls[0].request.context,
    });
    expect(ghost(editor)).toMatchObject({ phase: 'streaming', replace: true, output: '' });
  });

  it('aborts the stream it was reading when a new request starts, and draws nothing more of it', async () => {
    const { editor, stream, calls } = writing('Some text');
    askAbout(editor, stream, 'continue');
    askAbout(editor, stream, 'summarize');
    expect(calls[0].signal.aborted).toBe(true);
    calls[0].push('old');
    calls[1].push('new');
    await nextFrame();
    expect(ghost(editor)?.output).toBe('new');
  });

  it('aborts on Discard', () => {
    const { editor, stream, last } = writing('Some text');
    askAbout(editor, stream, 'continue');
    discard(editor);
    expect(last().signal.aborted).toBe(true);
    expect(aiState(editor.state)).toMatchObject({ ghost: null, target: null, menu: null });
  });

  it('aborts when the last mount ends, and changes nothing afterwards', async () => {
    const { editor, stream, last, unmount, report } = writing('Some text');
    askAbout(editor, stream, 'continue');
    unmount();
    expect(last().signal.aborted).toBe(true);
    const before = editor.state;
    last().push('late');
    last().fail(new Error('late'));
    await nextFrame();
    expect(editor.state).toBe(before);
    expect(report).not.toHaveBeenCalled();
  });

  it('stops the stream when the block it is about is deleted, keeping what it wrote', async () => {
    const { editor, stream, last, written } = writing('First', 'Second');
    editor.commands.setSelection(caret('p1', 0));
    askAbout(editor, stream, 'continue');
    last().push('Kept');
    await nextFrame();
    editor.commands.setSelection({ kind: 'blocks', anchor: 'p1', head: 'p1' });
    last().push(' and this');
    await Promise.resolve();
    await Promise.resolve();
    deleteBlocks(editor.state, (tr) => editor.dispatch(tr));
    expect(last().signal.aborted).toBe(true);
    await Promise.resolve();
    expect(ghost(editor)).toMatchObject({ phase: 'stopped', output: 'Kept and this' });
    expect(aiState(editor.state).target?.lost).toBeDefined();
    expect(written).toHaveBeenCalledWith('stopped', 'Kept and this');
  });
});

describe('an answer no stream feeds', () => {
  it('stops as it stands when the canvas mounts again after the last mount ended', async () => {
    const { editor, stream, last, unmount } = writing('Some text');
    askAbout(editor, stream, 'continue');
    last().push('Half');
    await nextFrame();
    unmount();
    editor.mount();
    stop(editor);
    expect(ghost(editor)).toMatchObject({ phase: 'stopped', output: 'Half' });
  });

  it('is dropped with its target when nothing of the document it was in is left', async () => {
    const { editor, stream } = writing('Only');
    askAbout(editor, stream, 'continue');
    const all = editor.createTransaction();
    all.step(removeBlocksStep(0, 1));
    editor.dispatch(all);
    expect(aiState(editor.state)).toMatchObject({ target: null, ghost: null });
    expect(editor.decorations().filter((decoration) => decoration.kind === 'widget')).toEqual([]);
  });
});
