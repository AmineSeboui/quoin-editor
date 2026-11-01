import { describe, expect, it, vi } from 'vitest';
import { createEditor } from '../../engine/extension/editor';
import { text } from '../../engine/model/inline';
import { textSelection } from '../../engine/state/selection';
import type { TransactionOrigin } from '../../engine/state/transaction';
import { replaceInlineStep } from '../../engine/transform/replace-inline-step';
import { createEngagement } from './engagement';

function setUp() {
  const editor = createEditor({
    blocks: [
      { id: 'd', type: 'DIVIDER', data: {} },
      { id: 'a', type: 'MARKDOWN', data: { markdown: 'hello' } },
    ],
  });
  const engagement = createEngagement(editor);
  const told = vi.fn();
  engagement.subscribe(told);
  const caret = (origin: TransactionOrigin) =>
    editor.dispatch(
      editor.createTransaction().setSelection(textSelection({ block: 'a', region: 'text', offset: 1 })).setOrigin(origin),
    );
  return { editor, engagement, told, caret };
}

describe('engagement', () => {
  it('starts unengaged and tells its listeners once when the reader engages', () => {
    const { engagement, told } = setUp();
    expect(engagement.engaged).toBe(false);
    engagement.engage();
    engagement.engage();
    expect(engagement.engaged).toBe(true);
    expect(told).toHaveBeenCalledTimes(1);
  });

  it.each<TransactionOrigin>(['command', 'input', 'paste', 'ai'])('is engaged by a selection a %s transaction sets', (origin) => {
    const { engagement, told, caret } = setUp();
    caret(origin);
    expect(engagement.engaged).toBe(true);
    expect(told).toHaveBeenCalledTimes(1);
  });

  it.each<TransactionOrigin>(['remote', 'reconcile', 'history'])('stays unengaged by a selection a %s transaction sets', (origin) => {
    const { engagement, told, caret } = setUp();
    caret(origin);
    expect(engagement.engaged).toBe(false);
    expect(told).not.toHaveBeenCalled();
  });

  it('stays unengaged by a change that sets no selection', () => {
    const { editor, engagement } = setUp();
    editor.dispatch(editor.createTransaction().step(replaceInlineStep('a', 'text', 0, 0, [text('X')])));
    expect(editor.getBlocks()[1].data.markdown).toBe('Xhello');
    expect(engagement.engaged).toBe(false);
  });

  it('stops telling a listener that unsubscribed', () => {
    const { editor } = setUp();
    const engagement = createEngagement(editor);
    const told = vi.fn();
    engagement.subscribe(told)();
    engagement.engage();
    expect(told).not.toHaveBeenCalled();
  });
});
