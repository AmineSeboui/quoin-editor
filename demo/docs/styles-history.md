---
title: The history of the stylesheet
description: Why Quoin's tokens carry a --quoin- prefix and its rules sit in one quoin cascade layer, both since 0.2.0, and what a host upgrading from 0.1 has to do.
---

# The history of the stylesheet

[Theming](https://amineseboui.github.io/quoin-editor/docs/theming/) describes the stylesheet as it is. This page keeps the story of two changes made in 0.2.0, for a host upgrading from 0.1 and for anyone wondering why they are there.

## The prefix arrived in 0.2.0

Until 0.2.0 the tokens were unprefixed: `--background`, `--accent`, `--border` and the rest. That was sold as free theme inheritance, and for a shadcn-style host it was. It also meant Quoin read whatever a host happened to keep under those names.

The stock Vite React + TypeScript template is the case that forced the change. It declares `--accent` as a bright purple and `--border` on `:root` with meanings of its own, so a fresh `npm create vite` project that installed Quoin drew the selected slash-palette row on that purple while keeping Quoin's own near-black `--accent-foreground`. The pair measures around 3.2:1, under the 4.5:1 that WCAG AA asks for, with nothing done wrong by the consumer.

A fallback form such as `var(--quoin-accent, var(--accent))` does not fix that, because the colliding value is exactly what gets read when only the unprefixed name is set. So the prefix is unconditional, and the inheritance is no longer free. If your theme stopped reaching Quoin when you upgraded, this is why, and [Mapping your own tokens](https://amineseboui.github.io/quoin-editor/docs/theming/#mapping-your-own-tokens) is how to hand it over again.

## One cascade layer since 0.2.0

Until 0.2.0 the package imported Tailwind's utilities into the bare `utilities` layer, so in a Tailwind host they appended into the host's own `utilities` layer, after the host's rules, and beat them on source order. One bare `.hidden { display: none }` from the package was enough to keep every element carrying `hidden md:block` hidden at every width, across the whole application. Since 0.2.0 everything sits in one `quoin` layer.

Before 0.2.0 Quoin also declared names Tailwind owns, so it resized every `p-4` on the page from whichever layer sorted last. It now imports Tailwind's theme by reference and declares none of them.

**Upgrading alone does not fix the order.** Import 0.2.0 or later the way 0.1.1 was imported, with no layer statement of your own, and a host's `hidden md:block` still computes to `display: none`, as before. The layer the package ships is what makes the fix available to you; the two lines in [Cascade layers and import order](https://amineseboui.github.io/quoin-editor/docs/theming/#cascade-layers-and-import-order) are what apply it.

## Tailwind v3 builds since 0.2.0

**On Tailwind v3, 0.2.0 is the first version that builds at all.** 0.1.1 and earlier emitted bare `@layer base` and `@layer utilities`, which the v3 PostCSS plugin refuses two different ways: importing the stylesheet from a component raises `'@layer base' is used but no matching '@tailwind base' directive is present`, and `@import`ing it from a stylesheet that does carry the `@tailwind` directives raises `TypeError: layerRule.nodes is not iterable`. Nesting everything under `quoin` in 0.2.0 removed both. If you worked around this by copying the stylesheet into `public/`, you can stop.
