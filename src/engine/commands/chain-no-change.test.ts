import { describe, expect, it } from 'vitest';
import { buildState, markdownOf } from '../test-support/build-state';
import { applyTransaction, type EditorState } from '../state/editor-state';
import { coreCommandFactories, createCommandHelpers } from './chain';

describe('a chain and a command that changes nothing', () => {
  const setup = () => {
    let state: EditorState = buildState(['hello'], { anchor: { block: 0, offset: 0 }, head: { block: 0, offset: 5 } });
    let dispatched = 0;
    const helpers = createCommandHelpers(() => state, (tr) => {
      dispatched += 1;
      state = applyTransaction(state, tr);
    }, coreCommandFactories);
    helpers.commands.setMark('bold');
    dispatched = 0;
    return { helpers, get: () => state, count: () => dispatched };
  };

  it('stops at setMark on a range that already has the mark and dispatches nothing', () => {
    const { helpers, get, count } = setup();
    expect(helpers.chain().setMark('bold').setTextAlign('center').run()).toBe(false);
    expect(helpers.chain().setTextAlign('center').setMark('bold').run()).toBe(false);
    expect(count()).toBe(0);
    expect(markdownOf(get())).toEqual(['**hello**']);
  });

  it('succeeds with toggleMark in the same position', () => {
    const { helpers, get, count } = setup();
    expect(helpers.chain().toggleMark('bold').setTextAlign('center').run()).toBe(true);
    expect(count()).toBe(1);
    expect(markdownOf(get())[0]).not.toContain('**');
  });

  it('agrees between can() and run() for each command in the chain', () => {
    const { helpers } = setup();
    expect(helpers.can().setMark('bold')).toBe(false);
    expect(helpers.can().toggleMark('bold')).toBe(true);
    expect(helpers.chain().setMark('bold').run()).toBe(false);
    expect(helpers.chain().toggleMark('bold').run()).toBe(true);
  });
});
