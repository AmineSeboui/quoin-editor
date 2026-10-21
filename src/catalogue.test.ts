import { catalogue } from './catalogue';
import { atom } from './engine';
import type { ExtensionUI } from './extensions/ui-types';

describe('the catalogue entry', () => {
  it('gathers every opt-in feature, each built with the options under its name', () => {
    expect(catalogue().map((extension) => extension.name)).toEqual([
      'table',
      'embed',
      'math',
      'toc',
      'mention',
      'emoji',
      'find',
    ]);
    const [table, embed, math, toc, mention, emoji, find] = catalogue({
      table: { labels: { table: 'Tableau' } },
      embed: { labels: { embed: 'Int\u00e9grer' } },
      math: { renderMath: () => '<b>drawn</b>', labels: { inlineEquation: 'Formule' } },
      toc: { labels: { tableOfContents: 'Sommaire' } },
      mention: { search: async () => [], labels: { mentionDescription: (kind) => `Mention (${kind})` } },
      emoji: { labels: { chooseIcon: "Choisir l'ic\u00f4ne" } },
      find: { labels: { findAndReplace: 'Rechercher' } },
    });
    expect((table.ui as ExtensionUI).slashItems?.map((item) => item.title)).toEqual(['Tableau']);
    expect((embed.ui as ExtensionUI).slashItems?.map((item) => item.title)).toEqual(['Int\u00e9grer', 'Bookmark']);
    expect((math.ui as ExtensionUI).slashItems?.map((item) => item.title)).toEqual(['Block equation', 'Formule']);
    const drawn = (math.ui as ExtensionUI).render?.atoms?.math(atom('math', { latex: 'x' }), document);
    expect(drawn?.innerHTML).toBe('<b>drawn</b>');
    expect((toc.ui as ExtensionUI).slashItems?.map((item) => item.title)).toEqual(['Sommaire']);
    const chip = (mention.ui as ExtensionUI).render?.atoms?.mention(atom('mention', { id: '1', label: 'Ada', kind: 'user' }), document);
    expect(chip?.getAttribute('aria-description')).toBe('Mention (user)');
    expect((emoji.ui as ExtensionUI).blockMenuItems?.map((item) => item.label)).toEqual(["Choisir l'ic\u00f4ne"]);
    expect((find.ui as ExtensionUI).overlays).toHaveLength(1);
  });

  it('leaves out a feature set to false', () => {
    expect(catalogue({ table: false }).map((extension) => extension.name)).toEqual([
      'embed',
      'math',
      'toc',
      'mention',
      'emoji',
      'find',
    ]);
    const none = { table: false, embed: false, math: false, toc: false, mention: false, emoji: false, find: false } as const;
    expect(catalogue(none)).toEqual([]);
  });
});
