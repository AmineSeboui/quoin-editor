import { describe, expect, it } from 'vitest';
import { englishLabels } from '../i18n/english-labels';
import { coreBlockMenuActions, menuActions, type BlockMenuAction } from './block-menu-items';

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
