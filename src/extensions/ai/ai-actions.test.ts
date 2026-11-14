import { ACTION_ICONS } from './ai-action-icons';
import { EDIT_ACTIONS, EMPTY_LINE_ACTIONS, MENU_ACTIONS, WRITE_ACTIONS, type AiAction } from './ai-actions';
import { englishAiLabels } from './ai-labels';

describe('the AI actions', () => {
  it('list Write before Edit', () => {
    expect(WRITE_ACTIONS).toEqual(['continue', 'summarize', 'explain']);
    expect(EDIT_ACTIONS).toEqual(['improve', 'fix', 'shorten', 'lengthen', 'simplify', 'tone', 'translate']);
    expect(MENU_ACTIONS).toEqual([...WRITE_ACTIONS, ...EDIT_ACTIONS]);
  });

  it('offer only Continue writing and Summarize on an empty line', () => {
    expect(EMPTY_LINE_ACTIONS).toEqual(['continue', 'summarize']);
  });

  it('have an icon each, the typed request included', () => {
    const actions = Object.keys(englishAiLabels.actions) as AiAction[];
    expect(actions.filter((action) => ACTION_ICONS[action] === undefined)).toEqual([]);
  });
});
