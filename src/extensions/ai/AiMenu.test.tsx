import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { paragraph } from '../../blocks/test-support/test-canvas';
import { nestedCanvas } from '../test-support/nested-canvas';
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
      'Summarize',
      'Explain',
      'Improve writing',
      'Fix spelling and grammar',
      'Make shorter',
      'Make longer',
      'Simplify language',
      'Change tone',
      'Translate',
    ]);
    expect(canvas.field()).toHaveAttribute('aria-activedescendant', within(list).getAllByRole('option')[0].id);
    expect(await act(() => axe(screen.getByRole('dialog', { name: 'Ask AI' })))).toHaveNoViolations();
  });

  it('heads the actions that write and the ones that edit', () => {
    const canvas = mountAi([paragraph('a', 'Say a word here')]);
    canvas.select('a', 4, 10);
    canvas.askAi();
    const write = screen.getByRole('group', { name: 'Write' });
    const edit = screen.getByRole('group', { name: 'Edit' });
    expect(within(write).getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Continue writing',
      'Summarize',
      'Explain',
    ]);
    expect(within(edit).getAllByRole('option')).toHaveLength(7);
  });

  it("draws its field as shadcn's command input, with no focus ring of its own inside the menu", () => {
    const canvas = mountAi([paragraph('a', 'Say a word here')]);
    canvas.select('a', 4, 10);
    canvas.askAi();
    const group = canvas.field().closest('[data-slot="input-group"]')!;
    expect(group.className.split(' ')).toContain('has-[[data-slot=input-group-control]:focus-visible]:ring-0');
    expect(group.className.split(' ')).not.toContain('has-[[data-slot=input-group-control]:focus-visible]:ring-3');
    expect(group.className.split(' ')).toEqual(expect.arrayContaining(['pointer-coarse:h-auto', 'pointer-coarse:min-h-11']));
  });

  it('keeps Send unavailable until something is typed', () => {
    const canvas = mountAi([paragraph('a', 'Say a word here')]);
    canvas.select('a', 4, 10);
    canvas.askAi();
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
    canvas.typeInField('short');
    expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled();
  });

  it('sends the typed words themselves from Send, where Enter would run the highlighted action', () => {
    const canvas = mountAi([paragraph('a', 'Say a word here')]);
    canvas.select('a', 4, 10);
    canvas.askAi();
    canvas.typeInField('short');
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(canvas.last().request).toMatchObject({ action: 'custom', prompt: 'short', selection: 'a word' });
  });

  it('sends the tone typed after Change tone from Send', () => {
    const canvas = mountAi([paragraph('a', 'Say a word here')]);
    canvas.select('a', 4, 10);
    canvas.askAi();
    canvas.typeInField('tone');
    canvas.press('Enter');
    canvas.typeInField('friendly');
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(canvas.last().request).toMatchObject({ action: 'tone', prompt: 'friendly' });
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

  it("opens the AI menu again on an emptied line once focus went into a canvas drawn inside this one's tree", () => {
    const { extension, inner } = nestedCanvas();
    const canvas = mountAi([paragraph('a', 'Text'), paragraph('b', '')], {}, { extensions: [extension] });
    canvas.caret('b', 0);
    canvas.type('a');
    canvas.key('Backspace');
    act(() => inner.current!.focus());
    canvas.caret('b', 0);
    canvas.key(' ');
    expect(screen.queryByRole('combobox')).not.toBeNull();
  });
});
