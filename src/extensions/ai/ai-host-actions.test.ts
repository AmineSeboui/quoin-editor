import { resetDevWarnings } from '../../dev-warn';
import { hostActions, placedIn, type AiActionDefinition } from './ai-host-actions';

const action = (id: string, label = id): AiActionDefinition => ({ id, label, prompt: `Do ${id}.` });

beforeEach(() => resetDevWarnings());

describe("the host's AI actions", () => {
  it('are kept in their order, and are none when the host gives none', () => {
    const [release, style] = [action('release-note'), action('style-check')];
    expect(hostActions([release, style])).toEqual([release, style]);
    expect(hostActions()).toEqual([]);
  });

  it('leave out an action whose id an earlier one has, keeping the first, with a warning in development', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const first = action('release-note', 'Rewrite as a release note');
    const kept = hostActions([first, action('style-check'), action('release-note', 'Release note again')]);
    expect(kept.map(({ label }) => label)).toEqual(['Rewrite as a release note', 'style-check']);
    expect(warn).toHaveBeenCalledExactlyOnceWith(
      'Quoin: the AI action "release-note" has the id of an earlier action, so it is left out.',
    );
    warn.mockRestore();
  });

  it('leave out an action named for a built-in one, the typed request among them', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const kept = hostActions([action('improve'), action('custom'), action('improve-tone')]);
    expect(kept.map(({ id }) => id)).toEqual(['improve-tone']);
    expect(warn.mock.calls).toEqual([
      ['Quoin: the AI action "improve" has the id of a built-in action, so it is left out.'],
      ['Quoin: the AI action "custom" has the id of a built-in action, so it is left out.'],
    ]);
    warn.mockRestore();
  });

  it('go in the AI menu alone unless they name their places', () => {
    const plain = action('release-note');
    const everywhere: AiActionDefinition = {
      ...action('style-check'),
      places: ['aiMenu', 'slashMenu', 'bubbleToolbar', 'blockMenu'],
    };
    const toolbarOnly: AiActionDefinition = { ...action('test-case'), places: ['bubbleToolbar'] };
    const all = [plain, everywhere, toolbarOnly];
    expect(all.filter(placedIn('aiMenu'))).toEqual([plain, everywhere]);
    expect(all.filter(placedIn('slashMenu'))).toEqual([everywhere]);
    expect(all.filter(placedIn('bubbleToolbar'))).toEqual([everywhere, toolbarOnly]);
    expect(all.filter(placedIn('blockMenu'))).toEqual([everywhere]);
  });
});
