import { act, fireEvent, screen, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { paragraph } from '../../blocks/test-support/test-canvas';
import { FileText } from '../../icons';
import type { AiActionDefinition } from './ai-host-actions';
import { mountAi } from './ai-test-canvas';

const releaseNote: AiActionDefinition = {
  id: 'release-note',
  label: 'Rewrite as a release note',
  prompt: 'Rewrite this as one line of a release note.',
};
const styleCheck: AiActionDefinition = {
  id: 'style-check',
  label: 'Check against our style guide',
  prompt: (request) => `Check this against our style guide, in ${request.language ?? 'English'}.`,
};

const optionNames = (element: HTMLElement) =>
  within(element)
    .getAllByRole('option')
    .map((option) => option.textContent);

function askingAbout(actions: AiActionDefinition[], labels = {}) {
  const canvas = mountAi([paragraph('a', 'Say a word here'), paragraph('b', '')], { actions, labels });
  canvas.select('a', 4, 10);
  canvas.askAi();
  return canvas;
}

describe("the host's actions in the AI menu", () => {
  it('follow the built-in actions, in a group of their own', async () => {
    askingAbout([releaseNote, styleCheck]);
    const list = screen.getByRole('listbox', { name: 'AI actions' });
    expect(optionNames(list).slice(-3)).toEqual([
      'Translate',
      'Rewrite as a release note',
      'Check against our style guide',
    ]);
    const group = within(list).getByRole('group', { name: 'More actions' });
    expect(optionNames(group)).toEqual(['Rewrite as a release note', 'Check against our style guide']);
    expect(await act(() => axe(screen.getByRole('dialog', { name: 'Ask AI' })))).toHaveNoViolations();
  });

  it('name their group from the labels', () => {
    askingAbout([releaseNote], { moreActions: 'Actions Acme' });
    const list = screen.getByRole('listbox', { name: 'AI actions' });
    expect(optionNames(within(list).getByRole('group', { name: 'Actions Acme' }))).toEqual([
      'Rewrite as a release note',
    ]);
  });

  it('leave the menu without their group when the host gives none', () => {
    askingAbout([]);
    expect(within(screen.getByRole('listbox', { name: 'AI actions' })).queryByRole('group', { name: 'More actions' })).toBeNull();
  });

  it("send the action's prompt as a custom request carrying its id, which replaces the selected text", async () => {
    const canvas = askingAbout([releaseNote]);
    act(() => void fireEvent.click(screen.getByRole('option', { name: 'Rewrite as a release note' })));
    expect(canvas.stream).toHaveBeenCalledTimes(1);
    expect(canvas.last().request).toEqual({
      action: 'custom',
      actionId: 'release-note',
      prompt: 'Rewrite this as one line of a release note.',
      selection: 'a word',
      context: 'Say a word here\n',
    });
    canvas.last().push('one note');
    await canvas.frame();
    expect(canvas.host('a').querySelector('.quoin-ai-replaced')?.textContent).toBe('a word');
  });

  it('build the prompt from the request when the action gives a function', () => {
    const canvas = askingAbout([styleCheck]);
    canvas.container.setAttribute('lang', 'de');
    act(() => void fireEvent.click(screen.getByRole('option', { name: 'Check against our style guide' })));
    expect(canvas.last().request).toMatchObject({
      actionId: 'style-check',
      prompt: 'Check this against our style guide, in de.',
      language: 'de',
    });
  });

  it('are filtered with the built-in ones as the writer types, and Enter sends the first that matches', () => {
    const canvas = askingAbout([releaseNote, styleCheck]);
    canvas.typeInField('release');
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Rewrite as a release note',
      'Ask AI: release',
    ]);
    canvas.press('Enter');
    expect(canvas.last().request).toMatchObject({ action: 'custom', actionId: 'release-note' });
  });

  it('are listed on an empty line too, after the actions that write', () => {
    const canvas = mountAi([paragraph('a', 'Text'), paragraph('b', '')], { actions: [releaseNote] });
    canvas.caret('b', 0);
    canvas.key(' ');
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Continue writing',
      'Summarize',
      'Rewrite as a release note',
    ]);
  });

  it('are asked again on Retry, and a follow-up asks for a change to the answer as a request of its own', async () => {
    const canvas = askingAbout([releaseNote]);
    act(() => void fireEvent.click(screen.getByRole('option', { name: 'Rewrite as a release note' })));
    const first = canvas.last().request;
    canvas.last().fail(new Error('down'));
    await canvas.frame();
    canvas.click('Retry');
    expect(canvas.last().request).toEqual(first);
    canvas.last().push('A note');
    canvas.last().end();
    await canvas.frame();
    const followUp = screen.getByRole('textbox', { name: 'Tell AI what to do next' });
    act(() => void fireEvent.change(followUp, { target: { value: 'shorter' } }));
    act(() => void fireEvent.submit(followUp.closest('form')!));
    expect(canvas.last().request).toEqual({
      action: 'custom',
      prompt: 'shorter',
      selection: 'A note',
      context: first.context,
    });
  });

  it('leave an action out of the AI menu when its places do not name it', () => {
    askingAbout([{ ...releaseNote, places: ['bubbleToolbar'] }, styleCheck]);
    expect(optionNames(screen.getByRole('group', { name: 'More actions' }))).toEqual(['Check against our style guide']);
  });

  it('report a prompt function that throws to onError, and ask nothing', () => {
    const failing: AiActionDefinition = {
      ...releaseNote,
      prompt: () => {
        throw new Error('no prompt');
      },
    };
    const canvas = askingAbout([failing]);
    act(() => void fireEvent.click(screen.getByRole('option', { name: 'Rewrite as a release note' })));
    expect(canvas.stream).not.toHaveBeenCalled();
    expect(canvas.onError).toHaveBeenCalledExactlyOnceWith(new Error('no prompt'));
  });
});

describe("the host's actions beyond the AI menu", () => {
  const everywhere: AiActionDefinition = {
    ...releaseNote,
    icon: FileText,
    places: ['slashMenu', 'bubbleToolbar', 'blockMenu'],
  };

  it('are offered in the slash menu, the toolbar and the block menu where their places name them', () => {
    const { ui } = mountAi([paragraph('a', 'Text')], { actions: [everywhere, styleCheck] });
    expect(ui().slashItems!.map(({ title, group, icon }) => [title, group, icon])).toEqual([
      ['Ask AI', 'ai', expect.anything()],
      ['Continue writing', 'ai', expect.anything()],
      ['Rewrite as a release note', 'ai', FileText],
    ]);
    expect(ui().bubbleItems!.map(({ title, icon }) => [title, icon])).toEqual([
      ['Ask AI', expect.anything()],
      ['Rewrite as a release note', FileText],
    ]);
    expect(ui().blockMenuItems!.map(({ label, icon }) => [label, icon])).toEqual([
      ['Ask AI', expect.anything()],
      ['Rewrite as a release note', FileText],
    ]);
  });

  it('ask about what each place is about: the selected text, the caret block or the chosen blocks', () => {
    const canvas = mountAi([paragraph('a', 'Say a word here'), paragraph('b', 'Next')], { actions: [everywhere] });
    const { controller } = canvas.handle();
    canvas.select('a', 4, 10);
    act(() => canvas.ui().bubbleItems![1].run(controller));
    expect(canvas.last().request).toMatchObject({ actionId: 'release-note', selection: 'a word' });
    canvas.caret('b', 2);
    act(() => canvas.ui().slashItems![2].run!({ controller, range: { block: 'b', region: 'text', from: 2, to: 2 } }));
    expect(canvas.last().request).toMatchObject({ actionId: 'release-note', selection: 'Next' });
    act(() => canvas.ui().blockMenuItems![1].run(controller, ['a', 'b']));
    expect(canvas.last().request).toMatchObject({ actionId: 'release-note', selection: 'Say a word here\n\nNext' });
    expect(canvas.ui().blockMenuItems![1].available!(controller.editor.state, ['a'])).toBe(true);
    expect(canvas.stream).toHaveBeenCalledTimes(3);
  });

  it('draw Sparkles where the action gives no icon', () => {
    const { ui } = mountAi([paragraph('a', 'Text')], { actions: [{ ...releaseNote, places: ['bubbleToolbar'] }] });
    const [askAi, release] = ui().bubbleItems!;
    expect(release.icon).toBe(askAi.icon);
  });
});
