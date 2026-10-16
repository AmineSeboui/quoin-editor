import { describe, expect, it } from 'vitest';
import { buildState } from '../engine/test-support/build-state';
import { englishLabels } from '../i18n/labels';
import { coreBlockMenuActions, menuActions, menuTargets, styleTargets, type BlockMenuAction } from './block-menu-items';

const nested = ['- a', { id: 'x', type: 'MARKDOWN', data: { markdown: '- child' }, indent: 1 }, 'b', 'c'] as const;

describe('menuTargets', () => {
  it('uses the selection when the handle block is in it, else the block and its children', () => {
    const blocks = ['- a', { id: 'x', type: 'MARKDOWN', data: { markdown: '- child' }, indent: 1 }, 'b', 'c'] as const;
    const range = buildState([...blocks], { blocks: [2, 3] });
    expect(menuTargets(range, 'b2')).toEqual(['b2', 'b3']);
    expect(menuTargets(range, 'b0')).toEqual(['b0', 'b1']);
  });

  it('takes every block a text selection crosses, and a caret as its own block', () => {
    const across = buildState(['a', 'b', 'c'], { anchor: { block: 0, offset: 0 }, head: { block: 1, offset: 1 } });
    expect(menuTargets(across, 'b1')).toEqual(['b0', 'b1']);
    const caret = buildState(['a', 'b'], { block: 1, offset: 0 });
    expect(menuTargets(caret, 'b1')).toEqual(['b1']);
  });
});

describe('styleTargets', () => {
  it('styles the handle block alone, never the blocks nested under it', () => {
    expect(styleTargets(buildState([...nested], null), 'b0')).toEqual(['b0']);
    expect(styleTargets(buildState([...nested], { block: 0, offset: 0 }), 'b0')).toEqual(['b0']);
  });

  it('styles the selected blocks when the handle block is among them, and the handle block alone otherwise', () => {
    const range = buildState([...nested], { blocks: [2, 3] });
    expect(styleTargets(range, 'b2')).toEqual(['b2', 'b3']);
    expect(styleTargets(range, 'b0')).toEqual(['b0']);
  });
});

describe('coreBlockMenuActions', () => {
  const actions = coreBlockMenuActions(englishLabels, { blockLink: (id) => `#block-${id}` });

  it('offers the block actions in order, Delete last and destructive', () => {
    expect(actions.map((action) => action.label)).toEqual([
      'Duplicate',
      'Copy',
      'Copy link to block',
      'Move up',
      'Move down',
      'Delete',
    ]);
    expect(actions.filter((action) => action.destructive).map((action) => action.id)).toEqual(['delete']);
    expect(actions.find((action) => action.id === 'duplicate')?.shortcut).toBe('Mod-d');
  });

  it('puts the actions of extensions after the core ones and before Delete', () => {
    const askAi: BlockMenuAction = { id: 'ask-ai', label: 'Ask AI', icon: () => null, run: () => {} };
    expect(menuActions(actions, [askAi]).map((action) => action.id)).toEqual([
      'duplicate',
      'copy',
      'copy-link',
      'move-up',
      'move-down',
      'ask-ai',
      'delete',
    ]);
  });
});
