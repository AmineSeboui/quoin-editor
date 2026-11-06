import type { QuoinLabels } from 'quoin-editor';
import type { DiagramLabels } from 'quoin-editor/diagram';
import type { EmbedLabels } from 'quoin-editor/embed';
import type { EmojiLabels } from 'quoin-editor/emoji';
import type { FindLabels } from 'quoin-editor/find';
import type { MathLabels } from 'quoin-editor/math';
import type { MentionLabels } from 'quoin-editor/mention';
import type { SourceLabels } from 'quoin-editor/source';
import type { StatsLabels } from 'quoin-editor/stats';
import type { TableLabels } from 'quoin-editor/table';
import type { TocLabels } from 'quoin-editor/toc';

export type LabelSets = {
  core: QuoinLabels;
  diagram: DiagramLabels;
  embed: EmbedLabels;
  emoji: EmojiLabels;
  find: FindLabels;
  math: MathLabels;
  mention: MentionLabels;
  source: SourceLabels;
  stats: StatsLabels;
  table: TableLabels;
  toc: TocLabels;
};

export const SET_SUFFIX: Record<keyof LabelSets, string> = {
  core: 'Labels',
  diagram: 'DiagramLabels',
  embed: 'EmbedLabels',
  emoji: 'EmojiLabels',
  find: 'FindLabels',
  math: 'MathLabels',
  mention: 'MentionLabels',
  source: 'SourceLabels',
  stats: 'StatsLabels',
  table: 'TableLabels',
  toc: 'TocLabels',
};

export const SET_NAMES = Object.keys(SET_SUFFIX) as (keyof LabelSets)[];

// A pack names every set after the language code, which its own tests hold it to: frLabels for the canvas,
// frTableLabels for the table.
const setsOf = (pack: Record<string, unknown>, code: string): LabelSets =>
  Object.fromEntries(SET_NAMES.map((set) => [set, pack[`${code}${SET_SUFFIX[set]}`]])) as LabelSets;

export type Language = { code: string; name: string; load: () => Promise<LabelSets | null> };

/** English, which needs no pack, and the seven the package ships, each downloaded only when it is chosen. */
export const LANGUAGES: readonly Language[] = [
  { code: 'en', name: 'English', load: async () => null },
  { code: 'ar', name: 'Arabic (العربية)', load: async () => setsOf(await import('quoin-editor/locale-ar'), 'ar') },
  { code: 'de', name: 'German (Deutsch)', load: async () => setsOf(await import('quoin-editor/locale-de'), 'de') },
  { code: 'es', name: 'Spanish (Español)', load: async () => setsOf(await import('quoin-editor/locale-es'), 'es') },
  { code: 'fr', name: 'French (Français)', load: async () => setsOf(await import('quoin-editor/locale-fr'), 'fr') },
  { code: 'ja', name: 'Japanese (日本語)', load: async () => setsOf(await import('quoin-editor/locale-ja'), 'ja') },
  { code: 'pt', name: 'Portuguese (Português)', load: async () => setsOf(await import('quoin-editor/locale-pt'), 'pt') },
  { code: 'zh', name: 'Chinese (简体中文)', load: async () => setsOf(await import('quoin-editor/locale-zh'), 'zh') },
];

export const languageNamed = (code: string): Language => LANGUAGES.find((language) => language.code === code) ?? LANGUAGES[0];
