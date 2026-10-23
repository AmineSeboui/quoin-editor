import { act, cleanup, screen, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { paragraph } from '../../blocks/void/test-canvas';
import { portalledMenu } from '../test-support/portalled-menu';
import { mountAi } from './ai-test-canvas';

describe('the AI menu', () => {
  it('adds Ask AI to the toolbar, the block menu and the slash menu, in an AI group', () => {
    const { ui } = mountAi([paragraph('a', 'Text')]);
    expect(ui().bubbleItems!.map(({ title }) => title)).toEqual(['Ask AI']);
    expect(ui().blockMenuItems!.map(({ label }) => label)).toEqual(['Ask AI']);
    expect(ui().slashItems!.map(({ title, group }) => [title, group])).toEqual([
      ['Ask AI', 'ai'],
      ['Continue writing', 'ai'],
    ]);
  });

  it('opens about the selected text with focus in its field, listing the actions', async () => {
    const canvas = mountAi([paragraph('a', 'Say a word here')]);
    canvas.select('a', 4, 10);
    canvas.askAi();
    expect(document.activeElement).toBe(canvas.field());
    const list = screen.getByRole('listbox', { name: 'AI actions' });
    expect(within(list).getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Continue writing',
      'Improve writing',
      'Fix spelling and grammar',
      'Make shorter',
      'Make longer',
      'Simplify language',
      'Change tone',
      'Translate',
      'Summarize',
      'Explain',
    ]);
    expect(canvas.field()).toHaveAttribute('aria-activedescendant', within(list).getAllByRole('option')[0].id);
    expect(await act(() => axe(screen.getByRole('dialog', { name: 'Ask AI' })))).toHaveNoViolations();
  });

  it('filters the actions as the writer types, and Enter sends the one chosen', () => {
    const canvas = mountAi([paragraph('a', 'Say a word here')]);
    canvas.select('a', 4, 10);
    canvas.askAi();
    canvas.typeInField('short');
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Make shorter',
      'Ask AI: short',
    ]);
    canvas.press('Enter');
    expect(canvas.stream).toHaveBeenCalledTimes(1);
    expect(canvas.last().request).toMatchObject({ action: 'shorten', selection: 'a word' });
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('sends what was typed as a request of its own', () => {
    const canvas = mountAi([paragraph('a', 'Say a word here')]);
    canvas.select('a', 4, 10);
    canvas.askAi();
    canvas.typeInField('make it rhyme');
    canvas.press('ArrowDown');
    canvas.press('ArrowUp');
    canvas.press('Enter');
    expect(canvas.last().request).toMatchObject({ action: 'custom', prompt: 'make it rhyme' });
  });

  it('asks for the tone or the language before sending those', () => {
    const canvas = mountAi([paragraph('a', 'Say a word here')]);
    canvas.select('a', 4, 10);
    canvas.askAi();
    canvas.typeInField('tone');
    canvas.press('Enter');
    expect(canvas.field()).toHaveAccessibleName('Tone to take, such as friendly');
    expect(screen.queryByRole('listbox')).toBeNull();
    canvas.typeInField('friendly');
    canvas.press('Enter');
    expect(canvas.last().request).toMatchObject({ action: 'tone', prompt: 'friendly' });
  });

  it('closes on Escape, giving focus back to the text', () => {
    const canvas = mountAi([paragraph('a', 'Say a word here')]);
    canvas.select('a', 4, 10);
    canvas.askAi();
    canvas.press('Escape');
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(document.activeElement).toBe(canvas.host('a'));
    expect(canvas.stream).not.toHaveBeenCalled();
  });

  it('sends the canvas language when it has one', () => {
    const canvas = mountAi([paragraph('a', 'Bonjour')]);
    canvas.container.setAttribute('lang', 'fr');
    canvas.caret('a', 2);
    canvas.askAi();
    canvas.press('Enter');
    expect(canvas.last().request).toMatchObject({ action: 'continue', language: 'fr' });
  });

  it('shows its strings from the labels given', () => {
    const canvas = mountAi([paragraph('a', 'Text')], { labels: { prompt: 'Demander', menu: 'Actions IA' } });
    canvas.caret('a', 2);
    canvas.askAi();
    expect(canvas.field()).toHaveAccessibleName('Demander');
    expect(screen.getByRole('listbox', { name: 'Actions IA' })).toBeInTheDocument();
  });

  it('offers no entry point on a read-only canvas', () => {
    const canvas = mountAi([paragraph('a', ''), paragraph('b', 'Text')], {}, { readOnly: true });
    canvas.askAi();
    expect(screen.queryByRole('combobox')).toBeNull();
  });
});

describe('a Space on an empty line', () => {
  it('opens the AI menu about that line, with only the actions that write', () => {
    const canvas = mountAi([paragraph('a', 'Text'), paragraph('b', '')]);
    canvas.caret('b', 0);
    canvas.key(' ');
    expect(document.activeElement).toBe(canvas.field());
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Continue writing', 'Summarize']);
  });

  it('types a plain space when a second Space or an Escape follows', () => {
    for (const second of [' ', 'Escape']) {
      const canvas = mountAi([paragraph('a', 'Text'), paragraph('b', '')]);
      canvas.caret('b', 0);
      canvas.key(' ');
      canvas.press(second);
      expect(screen.queryByRole('combobox')).toBeNull();
      expect(document.activeElement).toBe(canvas.host('b'));
      expect(canvas.markdown('b')).toBe('&#32;');
      cleanup();
    }
  });

  it('types a plain space on an emptied line after focus went to the canvas\u2019s own menus, not after it left', () => {
    const canvas = mountAi([paragraph('a', 'Text'), paragraph('b', '')], {}, { extensions: [portalledMenu('Menu')] });
    const page = Object.assign(document.createElement('button'), { className: 'quoin', textContent: 'Page' });
    document.body.append(page);
    canvas.caret('b', 0);
    canvas.type('a');
    canvas.key('Backspace');
    act(() => screen.getByRole('button', { name: 'Menu' }).focus());
    canvas.caret('b', 0);
    canvas.key(' ');
    expect(screen.queryByRole('combobox')).toBeNull();
    act(() => page.focus());
    canvas.caret('b', 0);
    canvas.key(' ');
    expect(screen.queryByRole('combobox')).not.toBeNull();
    page.remove();
  });
});
