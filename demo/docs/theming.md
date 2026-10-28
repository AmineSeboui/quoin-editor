---
title: Theming
description: Every colour and radius comes from a --quoin- token, the stylesheet sits in one quoin cascade layer and resets nothing outside the editor.
---

# Theming

`quoin-editor/styles.css` is compiled Tailwind CSS v4. Every colour and every radius it draws with comes from a custom property under a `--quoin-` prefix. It ships a default for all of them, on `:root` for light and on `.dark` for dark. These are the ones the whole editor reads:

```css
:root {
  --quoin-background: oklch(1 0 0);
  --quoin-foreground: oklch(0.145 0 0);
  --quoin-muted: oklch(0.97 0 0);
  --quoin-muted-foreground: oklch(0.49 0 0);
  --quoin-secondary: oklch(0.97 0 0);
  --quoin-secondary-foreground: oklch(0.205 0 0);
  --quoin-popover: oklch(1 0 0);
  --quoin-popover-foreground: oklch(0.145 0 0);
  --quoin-border: oklch(0.922 0 0);
  --quoin-input: oklch(0.62 0 0);
  --quoin-ring: oklch(0.45 0 0);
  --quoin-primary: oklch(0.205 0 0);
  --quoin-primary-foreground: oklch(0.985 0 0);
  --quoin-accent: oklch(0.97 0 0);
  --quoin-accent-foreground: oklch(0.205 0 0);
  --quoin-destructive: oklch(0.55 0.245 27.325);
  --quoin-info: oklch(0.55 0.17 250);
  --quoin-success: oklch(0.55 0.14 155);
  --quoin-warning: oklch(0.6 0.16 65);
  --quoin-radius: 0.625rem;
}

.dark {
  --quoin-background: oklch(0.145 0 0);
  --quoin-foreground: oklch(0.985 0 0);
  --quoin-muted: oklch(0.269 0 0);
  --quoin-muted-foreground: oklch(0.708 0 0);
  --quoin-secondary: oklch(0.269 0 0);
  --quoin-secondary-foreground: oklch(0.985 0 0);
  --quoin-popover: oklch(0.205 0 0);
  --quoin-popover-foreground: oklch(0.985 0 0);
  --quoin-border: oklch(1 0 0 / 10%);
  --quoin-input: oklch(0.56 0 0);
  --quoin-ring: oklch(0.708 0 0);
  --quoin-primary: oklch(0.922 0 0);
  --quoin-primary-foreground: oklch(0.205 0 0);
  --quoin-accent: oklch(0.269 0 0);
  --quoin-accent-foreground: oklch(0.985 0 0);
  --quoin-destructive: oklch(0.704 0.191 22.216);
  --quoin-info: oklch(0.72 0.14 250);
  --quoin-success: oklch(0.74 0.15 155);
  --quoin-warning: oklch(0.79 0.15 65);
  --quoin-radius: 0.625rem;
}
```

Out of the box that is a neutral grey editor that works in both modes with nothing configured. `src/ui/tokens.test.ts` holds the defaults to their contrast: the focus ring at 3:1 or more against the page, a popover and a selected block, body and muted text at 4.5:1 or more on the page, on a popover and on a highlighted row.

The other tokens belong to one part of the editor each, with a light and a dark default in `src/ui/tokens.css`:

| Tokens | What reads them |
| --- | --- |
| `--quoin-selection` | The tint of selected blocks, of a selection across blocks, of selected code and of a range of table cells |
| `--quoin-color-*`, `--quoin-bg-*` (`default`, `gray`, `brown`, `orange`, `yellow`, `green`, `blue`, `purple`, `pink`, `red`) | The text and background colours a writer picks; each text colour reaches 4.5:1 on the page, and body text 4.5:1 on each background |
| `--quoin-comment`, `--quoin-comment-active`, `--quoin-comment-edge` | Text that comment threads are anchored to |
| `--quoin-diff-inserted`, `--quoin-diff-deleted` | The words `QuoinDiff` marks as inserted and deleted |
| `--quoin-link` | Links in `QuoinView` and `QuoinDiff` |

Apart from these the stylesheet reads `--tw-*`, which belong to the Tailwind runtime it is compiled with, the `--radix-*` values Radix writes on its own portalled elements while they are open, and two room sizes the editor sets itself: `--quoin-comments-room` for the thread list beside the text and `--quoin-ai-room` under a streaming answer. Tailwind's theme tokens are imported by reference, so the package resolves `--spacing`, `--text-base`, `--container-md` and the rest at build time and declares none of them on your page.

## Mapping your own tokens

Point the prefixed names at your own in one block on `.quoin`. The canvas root carries that class, and so do the menus, popovers and dialogs Quoin renders into `document.body`, so one rule covers all of them.

```css
.quoin {
  --quoin-background: var(--background);
  --quoin-foreground: var(--foreground);
  --quoin-muted: var(--muted);
  --quoin-muted-foreground: var(--muted-foreground);
  --quoin-secondary: var(--secondary);
  --quoin-secondary-foreground: var(--secondary-foreground);
  --quoin-popover: var(--popover);
  --quoin-popover-foreground: var(--popover-foreground);
  --quoin-border: var(--border);
  --quoin-input: var(--input);
  --quoin-ring: var(--ring);
  --quoin-primary: var(--primary);
  --quoin-primary-foreground: var(--primary-foreground);
  --quoin-accent: var(--accent);
  --quoin-accent-foreground: var(--accent-foreground);
  --quoin-destructive: var(--destructive);
  --quoin-info: var(--info);
  --quoin-success: var(--success);
  --quoin-warning: var(--warning);
  --quoin-radius: var(--radius);
}
```

`--quoin-info`, `--quoin-success` and `--quoin-warning` are read only by the callout block, for its rule and the wash behind it, never for type. If your own theme has no equivalent, leave those three out of the block and the defaults above stand; the rest of the editor does not touch them. `--quoin-comment`, `--quoin-comment-active` and `--quoin-comment-edge` mark the text threads are anchored to; keep the two tints pale enough for your body and palette text.

`--quoin-input` is the border of the outline button and of the other fields, and `--quoin-warning` is the rule of a warning callout. A border or rule that carries meaning needs 3:1 against what it sits on, so give `--quoin-input` a value that reaches 3:1 against `--quoin-background` and `--quoin-popover`, and `--quoin-warning` one that reaches 3:1 against its own wash (the warning colour at 15% over the page). Quoin's defaults do, and a host that sets these tokens keeps its own values.

`--quoin-ring` colours the keyboard focus outline, which is solid and drawn at full strength, so it should reach 3:1 against both `--quoin-background` and `--quoin-popover`. A pale value, such as the grey many shadcn themes keep for `--ring`, fails that, so give `--quoin-ring` a value of its own that does.

That one block covers both modes: the tokens on the right already flip with your own dark class, and each mapping beats Quoin's `:root` and `.dark` defaults alike. Write it unlayered, or in a layer that sorts after `quoin`, so it outranks those defaults.

To change one token rather than adopt a whole theme, declare it on `:root`, and pair it with a `.dark` rule if you theme dark at all. Pinning a token on `:root` alone also beats Quoin's `.dark` value for it, which would freeze that one token in its light form.

```css
:root {
  --quoin-primary: oklch(0.55 0.2 260);
  --quoin-radius: 0.5rem;
}

.dark {
  --quoin-primary: oklch(0.72 0.17 260);
}
```

## Dark mode

Dark mode keys on a `.dark` class on an ancestor (for example `<html class="dark">`), not on `prefers-color-scheme`. Quoin redefines its own tokens under `.dark`, and its `dark:` variants follow the same class, so the two cannot disagree when a visitor's OS theme differs from your app's theme. Put the class on `html` or `body`: menus, popovers and dialogs are rendered into `document.body`, so a `.dark` class on a wrapper around the canvas leaves them light.

## Resets

Quoin does not reset your page. The stylesheet contains no `html`, `body`, heading, list or other element rules, and no universal `*` reset. Its own reset (box sizing, zero margins, unstyled lists and form controls) applies only inside a `.quoin` element: the canvas root, and the menus, popovers and dialogs that Quoin renders into `document.body`, which carry the class themselves. Your headings, paragraphs, lists and buttons keep whatever styles you gave them, or the browser's.

All of Quoin's own rules are in cascade layers, so an **unlayered** global reset of yours beats them. A host that ships one (Bootstrap's reboot, or a hand-rolled `* { margin: 0; padding: 0; border: 0 }`) will see Quoin's padding and borders vanish. Tailwind 4's preflight is itself layered and is fine. Either declare your reset in a layer that comes before Quoin's, or scope it away from `.quoin`:

```css
@layer reset, theme, base, components, quoin, utilities;

@layer reset {
  * { margin: 0; padding: 0; border: 0; }
}
```

```css
*:where(:not(.quoin, .quoin *)) { margin: 0; padding: 0; border: 0; }
```

The layer statement has to come before Quoin's stylesheet is parsed, so put it first in your own CSS or in an inline `<style>` in the document head.

## Tailwind, or no Tailwind

`quoin-editor/styles.css` is compiled output. Every value in it is already resolved, so it is a plain stylesheet, not a Tailwind plugin, and a project with no Tailwind at all can import it and be done.

If you do use Tailwind, both major versions work, and what you have to do differs:

| Your setup | What to do |
| --- | --- |
| **Tailwind v4** | Name the layer order and import Quoin into it, as [below](#cascade-layers-and-import-order). Without it Quoin's layer sorts last and its utilities beat yours. |
| **Tailwind v3** | Nothing. v3 emits its own utilities unlayered, and an unlayered rule beats a layered one whatever the order, so yours win over Quoin's by construction. |
| **No Tailwind** | Nothing. Import the stylesheet and the editor is styled. |

## Cascade layers and import order

Everything the stylesheet paints is inside one top-level cascade layer called `quoin`, with nested layers for its own theme, base and utilities inside it. Nothing it ships lands in a bare `theme`, `base`, `components` or `utilities` layer. It carries only the utilities Quoin's own components use, so the set of class names it can collide with at all is small and fixed.

The package cannot settle this on its own, because a browser orders layers by first appearance. A host whose own Tailwind is parsed first registers `theme`, `base`, `components` and `utilities` before `quoin` appears, so `quoin` sorts last and still wins. Name the order yourself, as the first thing in your stylesheet, and import Quoin into it:

```css
@layer theme, base, components, quoin, utilities;
@import "quoin-editor/styles.css" layer(quoin);
```

With `quoin` named before `utilities`, your own utilities outrank Quoin's, including the responsive ones, while Quoin still outranks your `components`.

Naming it first instead puts every layer of yours above the package:

```css
@layer quoin, theme, base, components, utilities;
@import "quoin-editor/styles.css" layer(quoin);
```

Layer position settles more than which utility wins. It also settles who owns a custom property both of you declare on `:root`, which is why it is worth deciding rather than inheriting. Quoin declares no name Tailwind owns, because it imports Tailwind's theme by reference, but a package that does resizes every `p-4` on the page from whichever layer sorts last.

Importing the stylesheet from a root layout, or with a plain `import 'quoin-editor/styles.css'` in JavaScript, gives you no say in where the layer lands. The bundler decides, and in a Tailwind host that usually means Quoin's layer sorts last. That is fine for an application with no Tailwind of its own, and it is what the samples in these pages do for brevity. A Tailwind host should use the two lines above and drop the JavaScript import.

How the prefix and the layer came to be, and what they fixed, is told in [the history of the stylesheet](https://amineseboui.github.io/quoin-editor/docs/styles-history/).
