# Changelog

Quoin is 0.x: a minor version may contain breaking changes, and each one is listed here under "Breaking".

## 0.4.1 (2026-10-12)

A patch release that fixes the data-loss, accessibility and React 18 problems found in a review of 0.4.0. Nothing is removed from the public API.

### Fixed
- `useAutosave` saves the newest edit when its component unmounts, and when the page is hidden or closed (`pagehide`, or the tab turning hidden), instead of dropping up to one debounce interval of typing.
- `useAutosave` keeps one save in flight. Edits made while it runs are sent in a single follow-up save with the newest payload, so an older payload can no longer land last.
- A save that fails after `useAutosave` has unmounted no longer schedules retries nobody can stop.
- A save that fails for good no longer retries forever: retries stop after `maxRetries` (default 8) or when `isRetryable` says no, `status` becomes `failed` and `error` holds the reason. A success clears the error and any pending backoff.
- An image block records its `storageKey` as soon as the upload finishes, before the picture is measured. With overlapping uploads the last pick wins, and a late measurement never overwrites a newer image.
- `UploadField` waits for an async `onUploaded` and reports its rejection through `onError`, once. The "Image attached" text no longer carries a check mark that screen readers read out.
- The markdown surface and the empty-document starter ignore keys that belong to an IME composition. Committing a candidate with Enter no longer continues a list, and Backspace, Tab and `/` inside a composition no longer exit a list, indent or open the palette.
- On macOS the shortcuts use Command, so Ctrl+B, Ctrl+E and Ctrl+K keep their system text meanings. Elsewhere they use Ctrl, as before.
- A lagging host can no longer rewind the canvas. An array the canvas emitted is recognised however late it comes back, so the limit of 64 unacknowledged emissions is gone, and a structural copy of one of the last 64 counts as its echo. Stores that clone the document on the way through, such as Redux, Zustand or a server round trip, keep every keystroke while they are within 64 edits.
- Keyboard focus is visible on buttons, inputs, textareas, selects, the dialog close button, the markdown surface and the starter: a solid 2 px outline in `--quoin-ring`, which reaches 3:1 against the page and popover in light and dark, and which Windows forced colours mode keeps.
- A highlighted row in a menu, the slash palette or a select carries an inset bar as well as a background, and the Delete label and shortcut hints reach 4.5:1 on it.
- React 18 works: `Button`, `Input` and `Textarea` forward refs, so the refs that focus return, the drag handle and the menu triggers rely on are no longer dropped, and layout effects no longer run during server rendering. CI now checks the packed package on React 18 and 19.
- Inserting a block focuses and scrolls to it inside its own canvas, so two canvases on one page no longer interfere.
- The last inserted block no longer reopens, and takes focus, when `readOnly` is toggled or the host undoes a change.
- Inserting a block from the slash palette closes the source block's editor, so one editor is open at a time.

### Changed
- `useAutosave` gains the `'failed'` status, the `maxRetries`, `isRetryable` and `flushOnHide` options, and `error` and `flush()` on its result. When `save` resolves `{ ok: false }`, that value is the `error`.
- `UploadFieldProps.onUploaded` may return a promise.
- `useAutoGrow` is typed to return `React.RefObject<T>`, so the ref it returns is accepted by React 18 and 19 types.
- Default tokens: light `--quoin-ring` is darker, dark `--quoin-ring` is lighter, and light `--quoin-destructive` and `--quoin-muted-foreground` are slightly darker. A host that maps `--quoin-ring` to a pale colour should give it one that reaches 3:1.
- The package description, keywords and author are updated.

### Docs
- The README no longer warns that a store which clones the document loses text.
- New Accessibility and Stability sections, which name the gaps that remain in 0.4.
- `--quoin-ring` is documented.

## 0.4.0 (2026-10-12)

### Breaking
- Each callout tone draws in a colour of its own. New tokens: `--quoin-info`, `--quoin-success` and `--quoin-warning`.

## 0.3.0 (2026-10-11)

Answers an integrator's report from 0.1.1.

### Added
- The core block data shapes are exported (`MarkdownBlockData`, `CalloutBlockData`, `CodeBlockData`, `ImageBlockData`, `FileBlockData`, `CoreBlockData`) and documented, with a test that reads the keys back from each editor.
- A block definition may omit `editor` for content that is never edited in the canvas; omitting both `editor` and `preview` is a type error.
- A read-only canvas warns once per type, in the developer console, when a definition has no `preview`.

### Changed
- `useAutosave`'s `save` may return anything; only an explicit `{ ok: false }` (or a rejection) counts as a failure.
- `defineBlock` defaults its data type to `Record<string, unknown>`.
- A block whose type nobody registered no longer offers an Edit button.

### Docs
- Tailwind v3, v4 and no-Tailwind setups, and the install footprint.

## 0.2.0 (2026-10-10)

### Breaking
- Every CSS custom property is prefixed `--quoin-`.
- All of the package's CSS ships under one top-level `quoin` cascade layer.
- Tailwind's theme is imported by reference, so its tokens no longer land on the host's `:root`.
- Utilities are built from the package's components only, not from the README prose.

### Added
- `onDelete` tells the host which block a deletion removed and the index it held.
- `UploadField` and `FilePickerButton` are exported for custom blocks.

### Fixed
- Builds under Tailwind v3.

## 0.1.1 (2026-10-09)

### Fixed
- `package.json` is exposed through the `exports` map, so tooling can read the manifest.
- The headless surface is re-exported from the main entry.
- The caret lands where a click fell instead of at the top of the block.
- Every emission a lagging host has not echoed yet is recognised, so delayed `onChange` handling no longer loses typing.
- A block type nothing registered is drawn and reported through `onError`.
- `useBlockList` caps the removals it keeps for undo.

### Changed
- The markdown commit the keymap is keyed on is memoised.

### Docs
- A custom block reaching `upload` through `useQuoin`, and a host token collision with its escape hatch.

## 0.1.0 (2026-10-09)

First release of Quoin, published on npm as `quoin-editor` (npm rejects the bare name `quoin` as too similar to an existing package).

### Added
- `BlockCanvas`: a controlled React block editor (`blocks` and `onChange`) with drag to reorder, block inserters, a block actions menu and a read-only mode.
- Five core block types: markdown, callout, code, image and file, plus an open registry through `defineBlock` with plain React `editor` and `preview` components.
- A markdown surface with keyboard shortcuts, list continuation, indentation and a slash palette.
- Host-owned uploads through an injected `upload` function and `resolveAssetUrl`.
- `quoin-editor/headless`: the markdown text transforms with no UI dependency.
- Scoped styles with a class-based dark mode.
