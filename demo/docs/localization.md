---
title: Localization
description: The seven locale packs the package ships, how a host passes one to the canvas and to each feature, and how to write a language of your own.
---

# Localization

Every word the editor shows or speaks is a label, and every label can be replaced. The package ships English and seven other languages, each as an entry of its own that a host imports and passes in. Nothing is detected: the host picks the language, and the package never reads `navigator.language`.

## The packs

| Entry | Language | Export names |
| --- | --- | --- |
| `quoin-editor/locale-ar` | Arabic | `arLabels`, `arTableLabels`, … |
| `quoin-editor/locale-de` | German | `deLabels`, `deTableLabels`, … |
| `quoin-editor/locale-es` | Spanish | `esLabels`, `esTableLabels`, … |
| `quoin-editor/locale-fr` | French | `frLabels`, `frTableLabels`, … |
| `quoin-editor/locale-ja` | Japanese | `jaLabels`, `jaTableLabels`, … |
| `quoin-editor/locale-pt` | Portuguese | `ptLabels`, `ptTableLabels`, … |
| `quoin-editor/locale-zh` | Simplified Chinese | `zhLabels`, `zhTableLabels`, … |

`pt` is written for Brazil and `zh` in simplified characters. A pack is data and nothing else: no React, no side effects, and about 5.5 KB gzip, which a host downloads only for the language it imports.

## Passing a language to the canvas

The canvas takes the core set as `labels`:

```tsx
import { BlockCanvas, type QuoinBlock } from 'quoin-editor';
import { frLabels } from 'quoin-editor/locale-fr';
import 'quoin-editor/styles.css';

export function Editor({ blocks, onChange }: { blocks: QuoinBlock[]; onChange: (next: QuoinBlock[]) => void }) {
  return <BlockCanvas blocks={blocks} onChange={onChange} labels={frLabels} />;
}
```

Each feature carries its own set, and takes it the same way, through the feature's options:

```tsx
import { BlockCanvas, type QuoinBlock } from 'quoin-editor';
import { catalogue } from 'quoin-editor/catalogue';
import { frFindLabels, frLabels, frTableLabels } from 'quoin-editor/locale-fr';

const extensions = catalogue({ table: { labels: frTableLabels }, find: { labels: frFindLabels } });

export function Editor({ blocks, onChange }: { blocks: QuoinBlock[]; onChange: (next: QuoinBlock[]) => void }) {
  return <BlockCanvas blocks={blocks} onChange={onChange} labels={frLabels} extensions={extensions} />;
}
```

Keep the object you pass stable, as the canvas memoises its configuration on identity, and remount the canvas with a new `key` to change the language of its extensions, which are read once when it mounts.

A pack covers all fifteen sets: the canvas itself and the table, AI, comments, find and replace, emoji, equation, embed, table of contents, mention, presence, statistics, diagram, markdown source and diff features. The export is the set's name with the language in front: `frTableLabels` for `englishTableLabels`, `frDiffLabels` for `englishDiffLabels`.

## Changing a word

Labels merge key by key over the defaults, so a host can take a pack and change one string, or stay in English and change a few:

```tsx
import { BlockCanvas, type QuoinBlock } from 'quoin-editor';
import { frLabels } from 'quoin-editor/locale-fr';

const labels = { ...frLabels, askAi: 'Demander à Claude' };

export function Editor({ blocks, onChange }: { blocks: QuoinBlock[]; onChange: (next: QuoinBlock[]) => void }) {
  return <BlockCanvas blocks={blocks} onChange={onChange} labels={labels} />;
}
```

A key left out, or passed as `undefined`, keeps the English default. That is how a language the package does not ship is written: a `Partial<QuoinLabels>` of your own, with English standing in for anything you have not translated yet.

## Counts, dates and sizes

A label that carries a number is a function, and each pack answers it the way its language does rather than by adding an "s". The packs ask the browser through `Intl`, so Arabic gets its six plural forms, Japanese its one, and French its own rule where zero is singular:

```ts
import { arLabels } from 'quoin-editor/locale-ar';
import { frLabels } from 'quoin-editor/locale-fr';

frLabels.resultCount(0); // "0 résultat"
frLabels.resultCount(2); // "2 résultats"
arLabels.resultCount(1); // "نتيجة واحدة"
arLabels.resultCount(2); // "نتيجتان"
```

Numbers, dates and file sizes follow the same path: `Intl.NumberFormat` for grouping and decimals, `Intl.DateTimeFormat` for the time a comment was posted, `Intl.ListFormat` for a list of collaborators, and each pack's own unit names for a file size (`1,5 Ko` in French, `1.5 KB` in German).

## What a pack does not change

A pack changes the words. It does not change the direction of the page: the canvas is written for a left to right page today, so an Arabic document reads with Arabic words in a left to right layout. Right to left across the canvas, its menus and its toolbars is [tracked separately](https://github.com/AmineSeboui/quoin-editor/issues/151).

It also does not change the document. Markdown is markdown in every language, and so are the block types, the slash command characters and the keyboard shortcuts; only the names shown for them move.
