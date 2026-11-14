# Changelog

Every release of `quoin-editor` is listed here, newest first, in the spirit of [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). From 1.0.0 the package follows [semantic versioning](https://semver.org/): a breaking change waits for the next major version. Until then, Quoin was 0.x and a minor version could contain breaking changes; those known at release were marked "Breaking". The 0.x sections are kept as they were released, "Docs" headings included. Moving from 0.4 to 1.0, and from 1.x to 2.0, is covered step by step in [MIGRATION.md](MIGRATION.md). Review finding ids such as F-17 are those of the 0.4.0 review in [#73](https://github.com/AmineSeboui/quoin-editor/issues/73).

## 2.2.0 (2026-11-14)

### Added
- `toPdf(blocks, options)` in a new `quoin-editor/pdf` entry writes a document as a PDF, in a browser, a worker or Node 18 and later, with no DOM and no dependency, and loads alone as `quoin-editor/docx` does. Every block type is drawn: headings, which also make the outline a reader lists beside the pages and which the table of contents links to; bullets, numbers and checkboxes; quotes beside a bar; code and callouts on their grounds; dividers; toggles; tables with wrapped cells and a shaded header row; pictures; files, embeds and bookmarks as links; and math as its source. Marks are drawn as the canvas draws them and links become link annotations under the Word export's rule for which addresses a file may open. Pages are A4 or Letter (`pageSize`) with `margin` points of margin, and break between lines, never inside one. The same blocks and options always give the same file. Until now the only export was a Word file, while PDF is what people usually ask for.
- Text in the PDF export is laid out with the real width of each letter of Helvetica and Courier, the standard fonts every reader carries, which draw Latin text only. `fonts` takes TrueType files for `regular`, `bold`, `italic` and `mono`, each optional, and embeds each whole with its widths and a map back to its characters, so Chinese, Japanese and any other text its glyphs cover can be drawn, copied and searched; a style the host gives no face for is faked from the regular face. There is no shaping engine, so Arabic, Hebrew and the scripts of South and South East Asia are not drawn correctly, which the documentation says.
- `onProblem` in the PDF export hears of each character no font draws, which is drawn as an empty box rather than as another character, of each picture drawn as its alt text because it failed to load or is a GIF or WebP a PDF cannot hold, and of each font left out because it is no TrueType font or its licence forbids embedding it. JPEG pictures are embedded as they are and PNG pictures decoded with their transparency.
- `aiExtension` takes `actions`, a host's own AI actions, so an application can offer "Rewrite as a release note" or "Check against our style guide" by name instead of telling its writers to type the request every time. Each `AiActionDefinition` has an `id`, the `label` the menus show, which the host words and translates itself, and a `prompt`, as text or as a function of the request, with an optional `icon` and `places`. The AI menu lists them after its own actions, in a group headed More actions, and `places` can put an action in the slash menu, on the formatting toolbar or in the block menu as well. The host's stream receives one as the `custom` request it already handles, with the action's prompt as `prompt` and a new optional `actionId` naming it, so a stream that reads only `prompt` needs no change. An action whose `id` repeats an earlier one or a built-in action's name is left out, with a console warning in development. New types `AiActionDefinition` and `AiActionPlace`.
- Label `moreActions`, the heading over a host's actions in the AI menu, in every locale pack. It is optional in `AiLabels` and English where missing, so a complete translation written before it still compiles.
- The canvas uploads a picture a paste carries inside the clipboard itself, as a `data:` address, the way Word for Mac, LibreOffice and some web pages write one, when it has an `upload` function. It decodes the picture, hands it to `upload` as an image named for its type, such as `image.png`, and puts it in where it was in the paste once the upload is in, in the order the paste held the pictures. Such a picture was dropped before. Its data never sits in the document, its undo history or a collaborator's copy, and with no `upload` function it is still left out. A picture of more than 10 MB is not decoded, and `onError` hears the new optional label `pastedPictureTooLarge`, translated in all seven packs. The canvas decodes the address with `fetch`, so a page whose Content Security Policy limits `connect-src` must allow `data:` for it.
- Icon buttons, in the formatting toolbar, the gutter, the link card, the find panel and elsewhere, show their name in a tooltip as the pointer rests on them or keyboard focus reaches them, with the key that does the same where there is one, such as Ctrl+B or ⌘B for Bold. The tooltip adds nothing to what a screen reader announces, since the button's name already says it.
- Shortcut hints, in the slash menu and the shortcuts dialog, are drawn as shadcn's key chips.
- The AI menu follows AI Elements: its field has a send button that asks exactly what was typed (Enter still runs the highlighted action), and its actions are listed under Write and Edit, each with an icon. Write comes first, so Continue writing is still the action Enter runs when nothing is typed.
- The bar under an AI answer follows AI Elements too: Writing shimmers while the answer streams (plain text when the reader asks for reduced motion), Discard and Retry are icon buttons with tooltips, and the follow-up field takes several lines, sending on Enter and breaking the line on Shift+Enter, with a send button of its own.
- Three optional AI labels, `send`, `editGroup` and `writeGroup`, English where missing and translated in every locale pack, so a complete `AiLabels` translation written before them still compiles.

### Changed
- The editor's menus, toolbars, popovers, dialogs, buttons and fields now follow shadcn's current default style: surfaces edged with a faint ring rather than a border, rounder and denser controls (28 pixel toolbar buttons, 32 pixel buttons and fields), smaller muted group headings, and a quick zoom-in as a menu or popover opens, which a reader who asks for reduced motion does not see. Four accessibility guarantees changed with it. Keyboard focus is shadcn's ring rather than a solid outline: buttons and fields still show a focused edge in `--quoin-ring` at 3:1 or more, under a halo at half strength, but other focusable elements, such as links and scrolling regions, show the halo alone, which is under 3:1. Field borders follow shadcn's faint border and are no longer held to 3:1. A highlighted menu row is shown by its tint alone, without the bar along its edge. Under forced colours, focus and the highlighted row are still framed in a system colour.
- `--quoin-input` defaults to shadcn's field border, `oklch(0.927 0.01 262)` in light and `oklch(1 0 0 / 15%)` in dark, and `--quoin-shadow` to 10% in light, with shadows drawn at Tailwind's own sizes. A host that sets these tokens keeps its values; one that reads them in its own CSS sees the new ones.

### Fixed
- Moving through the AI menu with the arrow keys scrolls the highlighted action into view. The list is shorter than its ten actions, so ArrowUp from the first, which wraps to Explain, highlighted an action below the fold that the writer could not see.
- A paste from Word keeps its quotes, dividers and code. Word writes a quote as a paragraph in its Quote or Intense Quote style, which arrived as brown italic text; a divider as an empty paragraph with a line under it, which vanished; and code as paragraphs in a monospaced paragraph style, which arrived as plain text. Each is now the block it was, consecutive code paragraphs join into one code block, and LibreOffice's bordered empty paragraph is a divider too.
- A dark grey text, such as the one Word gives a quote and offers in its colour picker, pastes as gray rather than brown. A grey was matched against every palette colour, and the darker brown lies nearer a dark grey than the gray does.
- Inline code pasted from Word, or from a document the Word export wrote, no longer gains a gray background: the light grey a word processor shades code with is read as part of the code. Any other colour on code is kept.
- A link to a place in the document a paste came from, such as the bookmarks a Word table of contents links to, keeps its words and drops the link, which pointed at nothing in the pasted document.
- The bold Word gives the header row of a table no longer pastes as bold text in a row the canvas already draws bold.

## 2.1.0 (2026-11-13)

### Added
- `yjsCommentThreads(doc, { currentUser })` in `quoin-editor/comments` keeps comment threads in the `Y.Doc` a canvas already syncs through, so collaborators see each other's threads, replies and resolves. It returns a store and the four callbacks `commentsExtension` takes, and `listen()`, which reads the document before following it and returns how to stop. Each comment is kept under its own id, so two replies sent to one thread at the same moment both stay, where keeping a thread as one value lost one of them, and deleting a thread takes its comments with it. The entry takes the document by its shape, so it imports nothing from `yjs`, types included, and a canvas with comments but no collaboration still needs no `yjs` installed.
- `aiExtension` takes `describeError` and `isRetryable`, so a failed answer can say why. `describeError` is given what the stream threw or rejected with and returns the text the bar shows under "AI could not answer", announced with it; `isRetryable` returning false leaves Discard alone in the bar, focused, for a failure such as a missing key or an unknown model that asking again cannot fix. Before, the reason reached only `onError` and Retry was always offered. Both are opt-in, so an error the host did not describe stays out of the bar as it did, a throw from either falls back to the label and to Retry, and `onError` still hears every failure.
- `EditorView` takes `rendererLabels`, the names its renderers give each block's text and the controls beside it (`paragraph`, `heading`, `bulletItem`, `numberedItem`, `task`, `quote`, `callout`, `calloutTones`, `toggle`, `toggleButton`), in place of the English ones; a key left out stays English, and so does each tone `calloutTones` leaves out. The canvas labels and the locale packs carry every one of these keys, so a pack can be passed as it is, and the empty document's paragraph and an empty heading's placeholder follow them unless `paragraphLabel` or `blockPlaceholder` is given. New type `RendererLabels`.
- `PaletteName` and `CalloutTone`, the types `QuoinLabels` keys the colour names and the callout tone names by, exported from `quoin-editor/engine` and the entries that carry it. A translation typed against the labels could not name either, since both were declared in modules no entry exported.
- Label `textColorSample`, the letter the colour menus draw in each text colour beside its name: `A` in English and the Latin-script packs, `أ` in Arabic, `あ` in Japanese and `文` in Chinese. It is optional in `QuoinLabels` and English where missing.
- Two labels in every locale pack: `blocksInserted`, which says how many blocks went in at once and where the first of them now is, and `copyFailed`, which says a copy from the block menu did not reach the clipboard. A third, `blockOptions`, names the block handle on a touch screen. All three are optional in `QuoinLabels` and read as English where missing, so a complete translation written before them still compiles.
- The mobile toolbar answers Alt+F10 from a hardware keyboard, as the bubble toolbar does: the arrows walk it and Escape goes back to the text. It was tappable only, and out of the tab order, so a keyboard paired with a phone or tablet could not reach it.
- A paste rule is handed everything that was pasted, the HTML and Quoin flavours beside the plain text, as an optional third argument to its `match`, so a rule can tell a line of text from a table copied out of a spreadsheet and keep what it takes over formatted. A rule written for two arguments works as it did.
- A paste from a word processor keeps its headings where the source writes them as larger text rather than as heading elements. TextEdit and Pages never write a heading element, Word writes its Title style and any hand-styled heading as a sized paragraph, and Word on the web marks a heading with a role, so all of those arrived as bold or plain paragraphs. A paragraph set 1.8 times larger than most of the text pasted with it becomes a level 1 heading, a bold one 1.4 or 1.15 times larger a level 2 or 3, and a heading role gives its own level. A larger line that is not bold, such as the opening paragraph of an article copied from a browser, stays a paragraph.
- The canvas uploads the pictures in HTML pasted from another document, such as Google Docs or Notion, when it has an `upload` function: it reads each picture from its address and hands it to `upload` as it would a dropped image, so the document keeps a copy of its own rather than a link the source may later expire. A picture whose server does not let the page read it stays linked as before, and a failed upload is reported to `onError`. This is the one request the canvas makes itself, and only with an `upload` function.
- A documentation page, Adopting existing documents, for moving a directory of markdown files or a column of HTML into Quoin. It opens with what each conversion loses, measured over 1,319 README, changelog and documentation files from npm packages: an image inside a line of text and HTML outside the few tags the document keeps are shown as text, front matter reads as a divider and a heading, and words after a code fence's language are dropped. It lists the inline HTML the document keeps (underline, highlight, text colour, background, subscript, superscript, line breaks and comment anchors), what storing blocks as markdown keeps and drops, why ids should be assigned once and stored, and the ways back out. Until now nothing said that the package could take an existing document set at all, or what it would cost.
- A conversion script in the repository, `npm run convert:markdown -- <directory>`, that converts every markdown file under a directory, writes the blocks back as markdown, reads that again, and reports which files came back unchanged, which changed only in spelling, and which would lose something if stored as markdown, naming the first block that differs. `--out` writes the blocks and the markdown beside each other for review, and the script exits with 1 when a file failed, so a migration can be gated on it.

### Changed
- A list a custom block draws inside the canvas keeps its bullets or numbers. The stylesheet's base reset gave every `ul` and `ol` under `.quoin` `list-style: none`, which a host's layered styles could not undo; Quoin's own lists, in the comments rail, a thread, the comments sheet, the thread chooser, the AI menu and the table of contents, now drop their markers with a class of their own. The reset still zeroes a list's padding, so give such a list a `padding-inline-start` of its own.

### Fixed
- A collaborator typing exactly at your caret no longer carries your caret along with their text, and their Enter there no longer takes your caret into the new block, where your next keystroke landed inside their text and could open your own slash menu over it. A remote change was carried through the selection the way your own typing is, with the caret following what is put in at it. Text a collaborator puts in at either end of your selection now stays outside it too, and the rule sits in the engine, so an adapter of your own that applies changes with `applyRemote` gets it as well.
- Undo after a change the editor did not record puts text back on the side of a block boundary it came from. Deleting a selection across two blocks and then undoing, once text had been added earlier in the first block without recording (by a collaborator, an AI answer or a new `blocks` array), put the first block's deleted tail into the second block. An undo step that split one place twice was dropped outright, and two deleted pieces came back in swapped order once the change had deleted the text between them. Carrying the history over the change lost which side of the writer's own edit a position was on wherever the change left nothing between the two, and now keeps it.
- Undo history is carried over a change of the block list, such as a block added or removed without recording or a new `blocks` array from the host, at about the cost of a text change. Such a change named no block, so every undo and redo step was rewritten, at a cost that grew with the square of the history's depth; now only the steps in the blocks it added, removed, edited or reordered are.
- The line end key on a wrapped line (End, or Command with the right arrow on a Mac) leaves the caret at the end of that line in the editor's selection too, with `assoc: -1`, as a click past the end of the line already did. The browser drew it there, but the selection read back said it was at the start of the next line, so the editor measured the next ↑ or ↓ from there where the browser did not make that move itself.
- A caret at the end of a wrapped line is drawn there again when a resize puts the wrap back. Once the caret had been written while no wrap fell where it was, as when focus left and came back at another width, it stayed at the start of the next line until it moved.
- A slash menu item with neither a `command` nor a `run` is left out of the menu, with a console warning in development. It was listed, and choosing it removed the slash and the query and did nothing else.
- A slash, mention or emoji item that throws when chosen is reported through `onError`, and the Enter or Tab that chose it stays the menu's. The error escaped the key handler before it claimed the key, so the key went on to the text and the error went uncaught.
- The bubble toolbar shows again once a press that made a selection ends without a pointerup: a native drag of the selected text, or the window losing focus mid-press. It also shows once a composition that wrote the selected text over again has settled; it stayed hidden until the selection changed.
- The link hover card is a group, not a dialog, since it never takes focus, and its Edit button names Mod+K, the key that opens the same popover from the text. The toolbar's Link button says it opens a dialog.
- A refused address in the link popover is said once. The message was both an alert and the field's description, so a screen reader could read it twice; it stays the field's description, and the canvas's live region says it once.
- A link with an empty address no longer shows an Open button in its hover card, which opened the current page in a new tab. The card and the popover now draw the same Open button.
- A multi-kilobyte value pasted into the link popover is checked in time that grows with its length. The email check tried every dot of the address against the rest of it, about a third of a second for 32 KB of dots.
- Tab past the last control of the link popover, which WebKit reaches with Option+Tab, gives focus back to the text, and so does Shift+Tab before its field. Focus fell to the page.
- A host turning the canvas read-only while focus is in the bubble toolbar, one of its menus, the mobile toolbar or the link popover gives focus back to the text. It fell to the page.
- Closing a canvas menu leaves focus on a menu button a host's own block draws, which the writer had pressed or tabbed to. Only the canvas's own menu buttons, out of the tab order, hand focus back to the text.
- An open slash, mention or emoji menu keeps its combobox attributes when React draws a new element for the line it is open on, as when the block changes type.
- The live region says how many blocks an insert of several put in, rather than one, and no longer counts the empty line a command adds for the caret. After the gutter's +, the slash menu's result count follows the insert announcement rather than replacing it, and a drag says where the block went once without leaning on the announcer's repeat window.
- Copy and Copy link to block say when the copy failed. They said "Copied" on success and nothing on failure.
- The gutter's + on an empty paragraph with blocks nested under it adds a line after them, rather than writing the slash into the parent.
- A right-click on the block handle while its menu is open opens the menu again at the pointer. It closed the menu and opened nothing.
- The block handle on a touch screen is named "Block options". It was "Drag to move, click for options", though a touch never drags it.
- The mobile toolbar marks Undo, Redo, Indent and Outdent unavailable while they would do nothing, and stays in place under a pinch zoom: it spans the visible part of the page at its own size, rather than starting at the page's left edge and growing with the zoom.
- An inline `labels={{ ... }}` holding the same words on each render no longer re-renders everything that reads the canvas configuration. The canvas resolves the labels again only when one of them changes; a label function written inline is still new each time.
- In `quoin-editor/headless`, a task's checkbox is named after its task's text, and by `Task` while that is empty, and a closed toggle's chevron says how many blocks it hides (`Toggle, 2 blocks hidden`) and points at them with `aria-controls`, as in the canvas. The headless renderers drew their own copy of the canvas markup, which had drifted: the checkbox was always named `Task` and the chevron always `Toggle`.
- In the canvas, a quote is drawn as a `blockquote`, as `QuoinView`, `toHTML` and the headless view draw it, so assistive technology reports it as a quotation. It was a plain `div`.
- The chevron of an open toggle, or of a closed one with nothing under it, is named by the `toggle` label. It was named by `toggleButton(0)`, so a host that renamed `toggle` alone still heard "Toggle" on the chevron. `toggleButton` is now asked only for the count a closed toggle hides.
- The colour menus draw the sample letter of each text colour from the labels. It was a literal `A` no label reached, so a Japanese, Chinese or Arabic canvas showed a Latin letter as the sample of how its text would look.
- A host's own definition of `IMAGE`, `FILE`, `CODE` or `DIVIDER` is named by its own `label`: in the block's accessible name, its Edit button, the block menu's heading, the slash menu and Turn into. Those read the name the labels give Quoin's block, so a host's "Photo" block was announced and listed as "Image".
- A callout whose icon is not the one of its tone keeps its tone in words. The icon menu offers any icon to any tone, so a warning given a pin was told by its colour alone until the pointer reached it and showed the tone chip, and on a read-only canvas, which draws no chip, for good. The chip now stays in view while the icon is not the tone's own, and a read-only callout writes the tone's name in the same place.
- A callout whose tone is none of the five is drawn as `info` by the core callout preview and shaded as `info` by `toDocx`, as the canvas and the view already drew it. The preview drew it with a neutral border and fill, and the Word export shaded it grey.
- The placeholder of an empty callout stays at 4.5:1 while the callout is selected. A selected block paints the accent under the callout's wash, which brought the muted placeholder to 4.39:1 on the dark warning wash and 4.48:1 on the light danger wash. The default `--quoin-muted-foreground` moves from `oklch(0.48 0.029 263)` to `oklch(0.47 0.029 263)` in light and from `oklch(0.72 0.02 262)` to `oklch(0.73 0.02 262)` in dark, so every other muted text gains a little contrast too. A host that sets the token keeps its own value.
- A custom block's editor that calls `onDone` after it has closed, as when an upload it started settles once the reader has moved on, no longer selects its block and takes focus back from wherever the reader went. A call from an editor that is no longer mounted does nothing.
- A press on a page element that stops `pointerdown` from propagating, and takes no focus, closes an open custom block editor like any press outside it. The press never reached the document, where the editor listened for it, so the editor stayed open.
- Shift+Tab back into a block selected as a whole leaves the page where it is. The element that holds such a selection is fixed at the top of the editor's viewport, and focus the browser gives it itself scrolled to it before anything could put the scroll back: about 9 px on WebKit, and to the top of the editor under a transformed ancestor, where fixed means the top of that ancestor. It now moves over the selected block as it takes focus, so the browser scrolls only to bring that block into view.
- Undo and redo in a code block bring the caret they leave into view. They put the caret after the text they change by script, which the browser does not scroll to, so a caret left past the right edge of a long line stayed hidden, as Enter, Tab and a typed key no longer left it.
- The name a selected block is announced by, its first line clipped at 80 characters, is clipped between graphemes. It counted code points, so an emoji family or a flag straddling character 80 was cut in half before the ellipsis, and a line of 80 flags was clipped although a reader sees 80 characters.
- Redoing an upload into an image block that was undone before its picture was measured brings the picture's size back with it. The size measured once the key had gone was dropped, so the redone image reserved no height until it was measured again; it is now written as soon as the block shows the key again.
- A file dropped or pasted on the canvas whose upload fails without a message of its own reaches `onError` as "Upload failed.", as an upload into an image or file block already did. It arrived as the rejection turned into a string, such as "undefined". An upload that resolves to an empty key is left out and reported the same way, where it went in as an image or file with nothing behind it.
- A file dropped right after a click goes in with the empty line after it, as any drop or paste does while the writer stays put. The editor reads a click's caret on the selectionchange that follows it, so a drop that came first saw the caret move during the upload, took it for the writer moving on, and left the empty line out.
- A file pasted while an empty image or file block is selected as a whole goes into that block, which says it is uploading and shows a failure as its own button does. It went in as a new block after the empty one and left that empty. Other files pasted with it go in after it.
- An empty image or file block, and an `UploadField` in a custom block, announce an upload through the canvas's live region and show the words as plain text. Each drew a live region of its own, so a document with ten empty images held ten beside the canvas's own. An `UploadField` under a provider with no canvas keeps its own region.
- `FilePickerButton` leaves focus on the page when the user presses blank space while focus waits to come back to it after a pick. It gave focus back to its input once a host enabled it again, and could not tell the browser dropping focus from the user pressing away.
- The alt text popover of an image never covers the image's toolbar. Both were anchored to the picture, so near the top of the window, where the toolbar flips below the picture, and near the bottom, where the popover flips above it, the popover covered the toolbar's buttons. It now goes beside the picture and the toolbar together.
- Where the block decorations of a state are computed in the decorations paint mode, as in a browser without the highlight API, every extension's decorations run once per state rather than twice.
- The uploads guide says that `toMarkdown`, the plain text a copy puts on the clipboard and the block menu's Copy write the address `resolveAssetUrl` returns in whatever scheme, while the blocks, `toHTML`, `QuoinView` and `QuoinDiff` drop one that is not a web, blob, data or relative address.
- A nested block dragged straight down below a closed toggle lands beside the toggle, where it stays drawn. A drop could nest one level deeper than the block above the drop line, and below a closed toggle that level is the toggle's hidden content, so the block disappeared into it and the move was announced with the position of the block drawn after it.
- Dragging a block nests it by the step the page's stylesheet indents a level by. The drag used a step of 1.5rem of its own, so a host that indents blocks by another measure saw the drop line between levels and a drop nest one level more or less than the line showed.
- The drop line follows the page as the wheel scrolls it during a drag. It was worked out again only when the pointer moved, so a drop after a scroll landed where the pointer had been rather than where it was.
- Dragging a block, or a selection across blocks, to the edge of the editor scrolls every container round it in turn: once the nearest one reaches its end, the one around it takes over, and the window last. Only the nearest container used to scroll, a page whose body scrolls in place of the window scrolled nothing, and an editor inside a shadow root scrolled the window rather than the container around its host.
- A tap on a divider drawn without a renderer of its own, as a headless `EditorView` draws it, selects it in Firefox. Firefox leaves no native selection after a touch on a block with no text, and the press that selects such a block was skipped for touch.
- On a right to left page a menu row is laid out from the right: the bar that marks the highlighted row, the room for a tick, the shortcut at the far end and the chevron of a submenu, which now points the way the submenu opens, were all placed as on a left to right page. The close button of a dialog moves to the top left with them.
- A canvas inside an element turned round with `dir="rtl"`, on a page that runs left to right, turns round what it draws over the page too. The slash menu, the formatting toolbar, the link and colour popovers, the dialogs, the editing tools on a phone, the find panel and the comments sheet are drawn into the page's body and were laid out left to right, with the arrows walking the toolbars the wrong way; only the block menus followed the canvas. The find panel now sits at the end of the top edge, so at the top left on such a page.
- A page that turns round while the canvas is on it, through a `dir` attribute, a class or an inline style on the canvas or an element around it, is followed at once. A gutter showing beside a block stayed on the old side until the pointer moved to another block, and the menus kept opening the old way round until the canvas was mounted again. A turn made by a stylesheet alone, such as a media query, still needs a remount.
- Copying a table's cell range copies those cells and nothing else. It put the whole table on the clipboard, so a cut followed by a paste brought back every cell the cut had left alone. Rich editors and spreadsheets now receive the cells as a table that keeps their columns' alignment and widths, and the header row only when it is one of them, and plain text receives them a row to a line, separated by tabs.
- Cells copied from a range, or a table copied out of a spreadsheet, paste into a table from the cell the caret is in or from the first cell of a range, adding the rows and columns they reach past, so a cut then a paste puts the cells back. A paste over a range wrote the plain text of anything pasted into its first cell, and a line of formatted text pasted over a range now keeps its formatting there.
- Text that reaches a cell range without a key replaces the range from its first cell, as a key typed over it does. Dictation, the emoji picker and an input method composing over the range emptied the cells between its two ends in reading order instead, and kept part of the first and last of them. Deleting across cells, through the engine or by a cut, now empties the rectangle of cells the selection spans, as it is painted.
- A table drops stored column widths that give its columns no usable width, a list of the wrong length or a width of zero or less, as it loads. It kept them, and wrote them back on every change until the first column resize, though it drew the table as if it had none.
- The table controls are drawn only into the table they belong to. For one render after the caret or the pointer moved to another table, that table's handles were drawn into the previous table and measured against it.
- An embed's cover lifts after a press that opens a context menu, as Control and the main button do in Chromium on a Mac. That press fires no click, so the block was selected while the cover stayed over its frame until the next click anywhere.
- A bookmark whose host unfurl threw or rejected asks again the next time it is drawn, as when undo brings it back or the canvas turns editable. A failure marked the address as asked for the rest of the session, so a bookmark placed while the host's service was down kept its bare address until the page was loaded again. An unfurl that answers with nothing is still never asked again.
- A double click on a formula in a line opens its editor once. The second click, when it reached the formula, opened the editor again after the press before it had closed it, as a mention chip already avoided.
- Pasted text that starts with a space right after an `@` opens no mention menu. Only a typed space closed it, so a paste kept the menu open and asked the host about the words after it.
- Escape on a menu that covered a farther trigger closes that one too. An `@` before a slash command came back with its menu once a space ended the dismissed slash command, holding everything typed since.
- `insertMention` and `insertAtom` refuse attributes that are not text, as code without types can pass, rather than throwing. A kind, an id or a label that was not a string made the check that the atom reads back throw.
- Typing `:` after an `@` mention query keeps the mention menu open until two characters follow the `:`. The emoji menu waited for those two characters, but a bare `:` already counted as the trigger nearest the caret, so `@Ada :` closed the mention menu and opened nothing in its place.
- Each grid of the callout icon picker is a tab stop of its own, and the arrows, Home and End stay inside it. The picker drew a grid for each group of emoji but walked them as one, with a single tab stop and arrows that ran from the last row of one group into the next, so a screen reader was told of nine grids that the keys treated as one. Tab now moves from the search field through the grids in turn, and each grid keeps its cell when Tab comes back to it.
- In regex mode, `^` and `$` in the find panel match at the start and the end of a line only. A line is searched in pieces cut at each formula or mention, and each piece was searched as if it were the whole line, so `^` matched just after a formula and `$` just before one.
- The find panel's message for a regular expression that cannot be read describes the query field, so a screen reader says why the field is invalid rather than only that it is.
- The find panel brings a match above the page into view below itself. It is fixed over the top of the page, and a match scrolled to the top edge sat under it.
- The find panel counts every match and steps to each one. It kept the first 1,000 and dropped the rest, so a match past them could not be reached, the count read "1,000+", and opening the panel with the caret past the thousandth match made the first match current rather than the nearest after the caret. It still marks only the 1,000 matches around the current one, so a search that finds far more costs no more to draw.
- Typography keeps turning quotes, dashes and arrows after a closed code span that holds a dollar, as in `` `$PATH` ``. The span's dollar was read as a formula opening with nothing to close it, which stopped every typographic replacement for the rest of the line.
- A spelling replacement, or any other edit the browser targets at a range, that the editor refuses leaves the selection where it was. A refused one, at a character limit for instance, left the replaced word selected, so the next key typed over it.
- Focus mode stays dimmed while the block menu or another menu the canvas opened has focus. Menus are drawn outside the canvas, so opening one took focus out of it and brought the whole page back to full strength until the menu closed.
- The character limit's documentation says that Backspace right after a typographic replacement, which undoes it, is let through past the limit as any undo is.
- A line that opens with a ballot box, as a Word checkbox, a TextEdit or Pages document and a typed checklist write it, is pasted as a task, ticked for a checked box, and a Google Docs checklist pastes as tasks rather than as empty list items with the text beside them. The box was kept as a character in a plain paragraph, and the picture Google Docs draws each box with split its item in two.
- A list item pasted from Word on the web keeps its depth. Word on the web writes every item as a list of its own and gives its level as an attribute, so a nested list arrived flat.
- A table with merged cells keeps every cell in its own column. A cell spanning two columns or two rows pushed the cells after it one column across, so a pasted table could put each value under the wrong heading. A merged cell now keeps its text in its first row and column and leaves the cells it covered empty, losing the merge and nothing else.
- Underline, strikethrough, colours and sizes that Word, LibreOffice, TextEdit and Pages set on a class in the style sheet of the clipboard HTML are read, rather than only those written on the element itself. TextEdit and Pages write all of them that way, so a paste from them lost every underline, strikethrough and colour.
- Text in a monospaced typeface pastes as inline code, so code set in Consolas, Menlo, Courier or a mono typeface in Word, Google Docs, TextEdit or Pages is no longer pasted as plain text. The typeface of the page a selection was copied from is not read, so prose copied from a page set in a monospaced font stays prose.
- A highlight from Word or LibreOffice is kept, and so is a colour Word names rather than writes as a number, such as `red`. Both were read only from `background-color` and numeric colours, while Word writes `background:yellow` and LibreOffice a `font` element's `color`.
- A non-breaking space at the end of a pasted paragraph or table cell is dropped, as an ordinary space already was. Word on the web ends every paragraph with one, so each pasted line carried an invisible trailing space.
- An AI answer on a right to left page is drawn under the block it is for. It sat 48 px to the right of its block, over the gutter, and inside a block that scrolls sideways it was cut off against the wrong edge: the layer was anchored at the inline start of the canvas, the right on such a page, and then moved by a distance measured from the left.
- In Safari, the down arrow leaves a paragraph of English words that ends in a full stop or an emoji on a right to left page. WebKit gives the caret no position after such a last character, so the canvas could not tell the caret was on the last line, handed the key to the browser, which had nowhere to go, and the caret stayed where it was.
- A table's pointer controls work on a right to left page, where its first column is on the right. They measured the columns as if they ran from the left: the + between two columns inserted at the mirrored edge, and none was offered after the last column; the rows offered their + only near the left border, and drew it and their handles there; and each column's border was drawn on its right, the side the column starts from, where dragging it away from the column narrowed it. The handles and the + of the rows now sit outside the right border, each column's border sits on its left and widens the column as it is dragged away, and the up arrow from the block below a table lands in the column under the caret rather than in the first one. The arrows on a column's border still move it the way the key points, so on such a page the left arrow widens the column. The controls are drawn again when the page turns round under them.

## 2.0.5 (2026-11-11)

### Changed
- The guide is at <https://quoincloud.com/docs/editor/> now, beside the documentation for the collaboration server, and the README and every link this package prints point there. The old addresses still answer, with a notice that takes the reader across, so nothing a consumer wrote is broken. Nothing else in this release: the package's code is identical to 2.0.4, and npm serves the README of whichever version was published last, which is the only reason for the version number.

## 2.0.4 (2026-11-10)

### Fixed
- An upload a host answers with an empty key fails the way one that answers with no key already did, so the block says so rather than sitting empty with nothing reported. The guard asked whether the key was a string, and an empty string is one.
- A quote block is a `blockquote` in the canvas, as it already was in the HTML the engine renders. It was a `div` whose accessible name said "Quote", so a reader moving by quotation found nothing.

## 2.0.3 (2026-11-09)

### Fixed
- A closed toggle points the way the text runs on, so on a right to left page its chevron points left rather than right. Open points down whichever way the page runs, as it did. The badge on an image with no alt text moves to the inline start with it.
- The horizontal arrows walk the text the way it runs on a right to left page. A caret at the edge of a block left it towards the wrong neighbour, so the left arrow at the end of an Arabic or Hebrew line went back to the block before rather than on to the next, and Shift with an arrow beside a formula or a mention took the atom on the wrong side. The arrows in the bubble toolbar and in the emoji picker's grid moved against the page too. An arrow names a side of the screen rather than a movement, so the view now reads one as it would be written on a left to right page, once, and the moves and the keymaps behind it are unchanged. The arrows that resize an image or a table column stay as they are, since a handle should move the way the key under the finger points.
- The table's column menu puts a column where it says on a right to left page. `Insert column left` added it before this one in the document, which the page then drew on the right, and `Move column left` moved it right; the two move items were also disabled at the wrong ends, so the column a reader saw at the left edge could still be moved further left. The wording stays physical, since that is what the writer is looking at, and the indices turn round behind it.
- Every menu, toolbar and popover opens on the correct side of a canvas whose page runs right to left. The twenty places that open one already asked to be placed at the inline start or end rather than at a left or a right, but whoever places them reads the direction through React rather than from the DOM, because they are drawn in a portal outside the canvas, and nothing ever told it. All twenty therefore resolved against a left to right default, so an Arabic, Hebrew, Persian or Urdu document had every menu on the wrong side and the arrow keys inside them mirrored. The canvas now reports the direction it is laid out in, read from its root, which also covers a page turned round with CSS rather than with a `dir` attribute. This adds `@radix-ui/react-direction` to the package's dependencies, a context provider of a few hundred bytes that draws nothing.
- A callout whose tone the editor does not know is drawn as `info` in the read-only view, which is the tone the canvas already falls back to. The two renderers disagreed: the canvas normalised anything outside the five tones, while the view passed the stored value straight into `data-tone` and into the region's accessible name, so a document carrying a tone from untyped host code, or from a version that knew another one, drew unstyled in the view and read its raw value aloud. Both now take the one list.
- A host renaming one entry of a label that holds a record keeps the English wording of every other entry in it. `blockNames`, `groups`, `colors` and `calloutTones` are maps of names rather than single names, and an override replaced the whole map, so renaming one slash group left the others undefined and the menu drew their headings blank.
- `englishLabels` is frozen, with the records inside it. Every canvas on the page shares that one object, so a host writing to it, by accident or to patch a string, changed the wording under every other canvas and under the locale packs that fall back to it.
- A composition over a formula, a mention or another atom is left alone. The guard that keeps a selection out of an atom read only the view's own composing flag, which the view sets after the key, while the browser reports the composition on the key itself. A first keystroke of a Japanese or Pinyin input beside an atom could therefore move the selection out mid-composition and drop the text being composed.
- A host predicate passed to `useAutosave` as `isRetryable` that throws ends the retries instead of escaping into the save loop. The throw replaced the save's own failure, so the document stayed unsaved and nothing was reported.

## 2.0.2 (2026-11-09)

### Fixed
- The packaged stylesheet no longer carries the `::highlight()` rule that paints a selection running across blocks, and the rule goes on the page at runtime instead, beside the registration of the highlight it styles. Lightning CSS, the parser Next.js and Turbopack use, does not know the Custom Highlight API and reported a parse failure for the rule on every consumer build. Nothing was lost, since the rule was passed through and the selection still painted, but the package's CSS is inlined into the consumer's own stylesheet, so the warning named their file and a byte offset in a minified line and read as a mistake of theirs. The rule now lands only in a browser that has the API, which is the only browser it ever applied in, and what is painted is unchanged.
- The bubble toolbar and the menus anchored to a range read the document the canvas is in rather than the page's own, so a canvas a host draws inside an iframe shows them. Focus was read from the top document, which never holds the focused element of an iframe, so the toolbar never appeared at all; the listeners that wait for a selection to settle were bound to the same wrong document, and the side a range menu opens on was measured against the wrong window height.
- The emoji search finds an emoji by a tag the dataset spells with capitals, such as the `Shaka` of the call me hand or the `ZA` of the South African flag. The query was folded to lower case and the tags were not, so 263 of the 1,923 emoji could not be reached by one of their tags at all. The tags are folded once as the dataset loads, so a search costs what it did and the tag keeps the spelling it is shown by.
- Replace in the find panel steps to the next match when the replacement is the match itself, rather than leaving the panel where it stood. Replacing `cat` with `cat` changed nothing, which is right, but the panel then stayed on that match and pressing Replace again did nothing, so stepping past it meant reaching for the next button.
- A file block draws the icon of a type its host spells with capitals: `IMAGE/PNG` now gives the image icon rather than falling through to the extension of the file name. Media types are case insensitive and the extension path already folded its case.
- A failure raised while uploaded files are put into the document, rather than while they upload, reaches `onError`. The upload itself was always reported, but anything thrown after it, such as a host plugin that refuses the transaction carrying the blocks, became an unhandled rejection that only the console saw.
- An address typed into the link popover that is an email address gets `mailto:`, not `https://`. `ada@example.com` was completed to `https://ada@example.com`, a link to the host `example.com` carrying `ada` as a user name.
- An extension whose `ui` holds something other than a list where the canvas expects one no longer takes the canvas down with it. The engine carries the field untyped, so untyped host code could put a string in `slashItems` and the canvas spread it into the slash menu, and a value of any other shape reached a `flatMap` that threw.

## 2.0.1 (2026-11-07)

### Added
- The playground also switches comments, AI actions and a second collaborator on and off. Comments anchor a thread to a range and keep it in a store of the page’s own, AI streams canned text where a host would pass its model, and collaboration draws a second canvas with a Yjs document of its own that reconciles with the first over a BroadcastChannel. The settings are in two groups now, those a canvas reads as it mounts and those it answers to at once, because the three new ones are extensions and remount it where highlighting and read only do not.
- A playground page on the site switches the editor between English and the seven locale packs, turns syntax colouring and the markdown source pane on and off, and draws the canvas read only, with the tsx for whatever is set beside it to copy. Picking a language downloads that pack and remounts the canvas, since a canvas reads its extensions once, and the other three take effect where they are. The home page links it from the hero, and two cards there name the code block colouring and the markdown pane, which shipped in 1.5.0 and 1.6.0 and the page had never mentioned. Nothing in the package changes.
- The FAQ answers how to upgrade from 1.x to 2.0 beside the 0.4 answer it already carried, naming all seven removed exports and pointing at the section of the migration guide that covers them.

## 2.0.0 (2026-11-06)

### Removed
- Seven names the view layer only ever calls itself leave `quoin-editor/view`, and with it `quoin-editor/headless` and `quoin-editor`. `BlockShell` and `SelectionSink`, with the `BlockShellProps` and `SelectionSinkProps` that typed them, are drawn by `EditorView` itself and register themselves with the controller, so a second copy of either takes the registration from the first. `VoidBlockFallback` is what a block shell already falls back to when no renderer draws a block type, so a renderer table that names it changes nothing. `defaultRenderers` held the three renderers a canvas already reaches for on its own; a renderer of your own draws its text with `EditableRegion`, which is what those three do. `isCrossSelection` answers whether a text selection spans blocks or regions, which is what painting and the arrow keys ask; a host that wants the answer reads `anchor` and `head` of the public `Selection`, and were it to earn a place it belongs beside `textSelection` in `quoin-editor/engine` rather than in the React entry. `BlockRenderProps` and `BlockRenderer` stay, so a renderer table still types. The five values among the seven were marked deprecated in 1.8.0. Removing a published name is breaking, so this lands in 2.0.0; [MIGRATION.md](MIGRATION.md) covers the move.

### Fixed
- A menu no longer throws where `Element.prototype.scrollIntoView` is absent, which is jsdom with no stub and any webview that omits it. Ten calls guarded the element they had queried but not the method on it, so an element that existed without the method was called anyway and threw a `TypeError` that left Quoin for the host's tree, replacing the page wherever an error boundary caught it. The calls are in the slash and language menus, the code block's caret reveal, a block link's target, a table cell, a heading jumped to from the table of contents and vertical caret movement. Keeping the highlighted entry in view is the whole of what a host without the method now loses. Two `scrollTo` calls that restore a scroll position after a change carried the same shape and are guarded with them.
- An editable canvas warns in development when a definition of `CODE`, `IMAGE` or `FILE` replaces the preview that edits it and brings no editor of its own. Quoin edits those three in their preview rather than through an `editor`, so such a definition left a block the canvas drew and nobody could write in: no editable node, no language picker, and for an image or a file no toolbar and no way to fill the empty state. Nothing was logged, and the warning that would have caught it covered `MARKDOWN`, `CALLOUT` and `TOGGLE` only, whose consequence is milder since the canvas keeps drawing and typing into those. The migration guide said as much by naming only that first set, and now names both. Nothing about what the canvas draws changes.

## 1.8.0 (2026-11-05)

### Added
- Seven locale packs, one entry each, carrying every string the editor shows or speaks in that language: `quoin-editor/locale-ar` (Arabic), `quoin-editor/locale-de` (German), `quoin-editor/locale-es` (Spanish), `quoin-editor/locale-fr` (French), `quoin-editor/locale-ja` (Japanese), `quoin-editor/locale-pt` (Portuguese) and `quoin-editor/locale-zh` (Simplified Chinese). A pack covers the canvas and all fourteen feature label sets, so `frLabels` goes to the canvas and `frTableLabels` to the table, and it is data alone: no React, no side effects, about 5.5 KB gzip each, downloaded only by a host that imports one. A label that carries a count, a date, a number or a file size is written as its language writes it, through `Intl`, so Arabic gets its six plural forms and Japanese its one. Nothing is detected: the host picks the language, and a key a pack leaves out still falls back to English.
- `quoin-editor/headless` exports the types its own signatures already named, so a host can write them down rather than reach them through `Parameters` and `ReturnType`: `Announcer` with `Spoken`, `Engagement`, `FocusTarget`, `HostRegistry` with `HostEntry`, and `NodeReveal`, all reached through `ViewController`; `CaretPoint`, which `caretFromPoint` returns; and `BlockShellProps` and `SelectionSinkProps`, taken by the two components named after them. They reach `quoin-editor` too, which re-exports the headless entry. Nothing new runs and no type changes shape.

### Changed
- The exports a host meets first carry a documentation comment, so an editor explains them on hover: `BlockCanvas`, `EditorView`, `useQuoinEditor`, `createEditor`, `toMarkdown`, `toHTML`, `toPlainText`, `fromMarkdown`, `PALETTE` and `englishLabels`. Nothing about their behaviour changes.
- `BlockShell`, `SelectionSink`, `defaultRenderers`, `VoidBlockFallback` and `isCrossSelection` are marked deprecated, in an editor and on the headless reference, and they go in 2.0.0. All five are internal to the view layer and a host has no use for them: `EditorView` draws the first two itself and a second copy of either takes the registration with the controller from the first, a renderer of your own draws a block's text with `EditableRegion` rather than reaching for `defaultRenderers`, a block shell already falls back to `VoidBlockFallback` when no renderer draws a block's type, and a host reads `anchor` and `head` of the public `Selection` to tell a selection that spans blocks or regions from one held inside a single region. `BlockRenderProps` and `BlockRenderer` stay public, so a renderer table still types. Every name is still exported and still does what it did.
- The comparison table weighs Quoin against Lexical and Plate as well, rechecked against each project's own pages and dated 2026-11-05. Lexical keeps an editor state it writes as JSON, draws no interface of its own, and ships neither comments nor translations: none of its forty packages covers either, and the comment plugin a reader finds is playground code. Plate keeps Slate JSON, converts markdown both ways, collaborates over Yjs and marks comments on text, and is MIT with a paid set of components behind its Notion-like template. A localization row goes in beside them: BlockNote ships 24 locales, Editor.js takes a dictionary the host writes, and Tiptap, Lexical and Plate ship none, since their interface strings live in the code a host copies into its own project. The comparison page reads in a wider column than the guide, because seven columns in a line of prose left each one too narrow to read.

## 1.7.0 (2026-11-04)

### Added
- `quoin-editor/diagram` draws a code block whose language names a diagram, such as `mermaid`, through a renderer you pass, which may answer at once or with a promise as the common engines do, with its source below the drawing where a writer already edits it. Quoin draws no diagrams itself and bundles no engine. The document is unchanged: a diagram is a fenced code block, and opens as one anywhere else. A renderer that throws or draws nothing leaves the source alone rather than losing the block.

## 1.6.0 (2026-11-04)

### Added
- `quoin-editor/source` shows the document as the markdown it is stored as, read only, beside or below the canvas. `QuoinSource` draws it with the block holding the caret marked, and `useEditorSource` gives the same markdown and the lines of that block for a pane of your own. What it shows is `toMarkdown` of the whole document, not of each block in turn, because a list item spells itself differently alone.

### Changed
- The CommonJS build ships no sourcemaps, and carries no comment pointing at one. The ESM build keeps its own, which is what a browser, a bundler and a reader step through. Both sets together had taken the tarball past the 5 MB it states; it is now about 0.96 MB packed and 4.0 MB unpacked, against 1.09 MB and 5.02 MB.

## 1.5.0 (2026-11-03)

### Added
- `quoin-editor/highlight` colours code blocks, in every language the block's language picker offers. `usePrismHighlighter` is a `highlight` for `BlockCanvas`, and the grammars behind it are a chunk fetched the first time a canvas using it mounts, so a page that imports none of this downloads none of it. Six theme tokens, `--quoin-syntax-comment`, `-keyword`, `-string`, `-number`, `-function` and `-variable`, colour the runs, each held by a test to 4.5:1 on a code block in both themes. The `highlight` prop is unchanged, so a highlighter of your own still replaces it.

### Changed
- An image with no alt text is announced as `Image, no alt text`, where it was `Image, no description`, so the editor speaks the term the badge beside it and the alt text popover already use. A host that sets `imageNoAlt` in its labels is not affected.
- Every slash menu description is a noun phrase: `List with bullets`, `Quotation, set apart`, `Image, uploaded or linked` and `File to download`, where some were written as instructions and others carried a leading article. The block names above them are unchanged, and a host that sets `slashDescriptions` is not affected.
- The comparison table is rechecked against each competitor's own pages, dated 2026-11-03. Editor.js's collaborative editing is on its roadmap and in progress, where the table said only that it was on the roadmap; BlockNote also runs on vanilla JavaScript when the host draws its own UI, where the table said React; and the toolbox and inline toolbar of Editor.js are cited to its repository, which documents them, where the home page cited no longer does. Every other cell holds, licences and paid tiers included.

## 1.4.1 (2026-11-02)

### Changed
- The npm description and keywords and the README's first sentence call Quoin a rich markdown editor, a block editor and a rich text editor for React, the phrases npm search and search engines match on. The code is unchanged.

## 1.4.0 (2026-11-02)

### Changed
- Quoin draws its own icons and no longer depends on `lucide-react`, so an install is about 36 MB and 4,300 files lighter and the canvas about 3.5 kB gzip smaller. The drawings are Lucide's, so nothing looks different. An icon carries its name in `data-quoin-icon`, such as `data-quoin-icon="check"`, where it had the `lucide` and `lucide-check` classes. A custom block's `icon` still takes any component that accepts a `className` and `aria-hidden`, a lucide one included: if you import from `lucide-react`, list it in your own dependencies.
- The emoji data comes from emojibase-data 18. It adds nine emoji, such as 🫝 pickle and 🛙 lighthouse, and an emoji that is drawn as an emoji by default, such as 👍, is inserted without the U+FE0F variation selector it carried.

### Fixed
- The comment marker beside a block is named after the count it shows, `1 comment` or `3 comments`, where it was `Comments (1)`, so a voice command that says what is on screen reaches it. A host that sets `showComments` in its labels is not affected.

## 1.3.0 (2026-11-01)

### Added
- `TextSelection` has a new optional `assoc`, `-1` for a caret drawn at the end of the line before a soft wrap. The editor sets it when ↑, ↓ or a click leaves the caret there; a host that never sets it sees the same selections as before. It is never written to step, document or Yjs JSON.

### Changed
- Markdown shortcuts convert list items as well as paragraphs: `# `, `> `, `1. `, `- ` and `[] ` typed at the start of a bullet, a numbered item or a task turn it into that block and keep its indent, as in Notion. A prefix for the kind the item already is, such as `- ` in a bullet, stays text, and the divider, `$$ ` and code fence shortcuts still turn paragraphs only.

### Fixed
- The undo history survives a change the editor does not record, such as a new `blocks` array, a transaction with `addToHistory: false` or a remote change without a collaboration history, where it was cleared. Undo and redo carry the writer's edits over that change and never remove text it added; an edit whose text it removed or rewrote is dropped, and older edits still undo. A Yjs collaboration keeps its own history as before.
- ↑ and ↓ keep the caret on the line they move to where a soft wrap ends it. With the caret's horizontal position past the end of a wrapped line, the caret was drawn at the start of the next line in some cases, and typed text started the next line; the caret now stops before the space the line wraps at, or, where it wraps after another character such as a hyphen, is drawn at the end of the line. A click past the end of a wrapped line keeps that side too, so the next ↑ or ↓ starts from the line clicked.

## 1.2.3 (2026-11-01)

### Fixed
- Nothing in the package changes from 1.2.2. The test that bounds the work done when a collaborator retypes a block counts the blocks it reads instead of timing them, so a release no longer fails on a slow runner.

## 1.2.2 (2026-11-01)

### Fixed
- Popovers, the bubble toolbar, dialogs, the AI response bar, the find panel, the mobile toolbar and the keys in the shortcuts dialog draw a soft hairline edge in `--quoin-border`, where they drew a near-black one. The stylesheet's reset gives every border that names no colour `--quoin-border`, instead of the text colour Tailwind 4 falls back to.
- An editor whose first block has no text, such as a table of contents, an image, a divider or an embed, no longer draws that block as selected or says "1 block selected" as soon as the page loads, server-rendered HTML included. The block is drawn as selected once focus enters the editor or a menu of it, or once the reader or the host sets a selection, and stays so when focus leaves.

### Changed
- Fields draw their border in `--quoin-input`, a lighter grey that still reaches 3:1 on the page, a popover and a highlighted row, and darken it on hover. A focused field shows the focus outline alone, where its border also turned to the ring colour. Outline buttons draw their border in `--quoin-border`.
- Menus, popovers, the AI response bar and the find panel are rounded to `--quoin-radius`, and dialogs a step more, over a lightly blurred backdrop.
- The rule beside a streaming AI answer is drawn in `--quoin-ring`, cobalt by default, where it used `--quoin-primary`.

## 1.2.1 (2026-11-01)

### Changed
- The default theme is slate with a cobalt accent. The focus ring, text selection, the ring of a selected block and the bar of a highlighted menu row are cobalt where they were near-black or grey, and the neutrals carry a slight cool tint. A host that sets its own `--quoin-` tokens keeps its values, except that the bar of a highlighted row now reads `--quoin-ring` where it read `--quoin-foreground`.
- A tip callout draws its rule and wash from a new `--quoin-tip` token, violet by default, where it used `--quoin-primary` and drew grey. Set `--quoin-tip` to your primary colour to keep the old look.
- Menus, popovers and toolbars cast a softer two-layer shadow, coloured by a new `--quoin-shadow` token.
- Blocks have 2px of room above and below, so consecutive list items and paragraphs no longer touch.

### Fixed
- A callout whose text starts with a line of pipes and dashes, such as `|-`, is written to markdown with a blank line after its alert marker, so it reads back as the callout and not as a one-column table.

## 1.2.0 (2026-10-31)

### Fixed
- An extension's `priority` means one thing for blocks, marks, atoms, keys and commands: the higher wins. A block, mark or atom spec from an extension at a lower priority than another extension, core included, no longer replaces it, where the lower priority won for schema entries and the higher for keys and commands. Extensions at the default priority resolve as before. `priority` is now described in the extensions docs.
- Undo separates edits made in two places: typing at the start of a block and then at its end within the grouping delay is two undo steps, as it is in a collaboration, and a caret that lands where the last edit ended still groups. Undoing a formatting change no longer collapses positions inside the range, so collaborators' carets, highlights and comment ranges stay where they were.
- Undoing formatting is now a step of a new kind, `restoreMarks`, in step JSON; a host that relays steps between clients of different versions needs the same version on both ends, as older versions cannot read it. This is the one change to the step wire format.
- A legacy block beside a real block named like one of its derived ids, such as `a` beside `a-2`, is diffed under the same ids the editor gives its pieces, so the diff no longer reports a deletion, a change and an insertion for an unchanged document.
- A codec that has loaded a document with such a real block gives the same ids to a later document without it as a new codec does.
- Typing right after a local change that is not recorded and moves no text, such as opening a toggle or an upload result filling an image, is its own undo step instead of joining the step before it. A remote or reconciled change of that kind leaves the step open.
- `diffBlocks` reports the word changes of a block that moved and was edited: its `insert` now holds a `change`, as an edited block in place is reported. `QuoinDiff` showed them already and is unchanged.
- A change inside Chinese, Japanese or Thai text, written without spaces, marks only the changed words where the runtime has `Intl.Segmenter`, where it marked the whole run.
- Diffing two versions that differ in more than 2,000 blocks, or two texts in more than 2,000 words, reports the older version as deleted and the newer as inserted, whole and with no block marked as moved, so the time and memory stay bounded: two documents of 5,000 blocks with nothing in common diff in a fraction of a second, where it took seconds and hundreds of megabytes.
- On a read-only canvas whose text a page translator or another script rewrote, a drag across blocks no longer throws on every pointer move.
- Text a script or a browser extension rewrites in one block while a composition runs in another reaches the document when the composition ends, where the document kept the old text while the page showed the new one.
- Command with Up or Down on a Mac, and Control with Home or End elsewhere, go to the start or the end of the document, where they stopped at the edge of the block. These keys also leave a selected divider, image or other block for that edge, where on a Mac Command with Up or Down did nothing. Shift with Control+Home or Control+End extends the selection there; on a Mac, Command with Shift and Up or Down moves the block where it can, and extends the selection to the edge where it cannot, such as in the first block. Shift with Up or Down across blocks keeps the caret's horizontal position, where it kept the character offset and drifted sideways between a heading and a paragraph.

### Added
- `BlockCodec.toEngineBlocks(block, taken?)` takes the ids of the other blocks of the document, so the ids it gives the pieces of a legacy block avoid theirs.

## 1.1.2 (2026-10-30)

### Fixed
- A block whose content returns to what was stored is reported as the stored object, whether by undo or by retyping, so `getBlocks()` and `onChange` give back the host's own object. A block written in a legacy form, such as `*old style*`, is not rewritten as `_old style_`, and an intact 0.4 multi-paragraph group is emitted as the original block.
- A mark that spans more of the text is written outside the marks it contains, so nested emphasis such as `_a **b** c_` is stored without HTML tags in more cases. Inline code stays innermost.

## 1.1.1 (2026-10-29)

### Fixed
- An inline decoration no longer writes an event-handler attribute: any name starting with `on`, in any case, is left out, while `class`, `style`, `data-*` and `aria-*` are kept. Widget decorations write no attributes, and block decorations keep their `data-` and `aria-` rule.
- A custom block's preview no longer draws again when a block is inserted, removed or moved above it: only an open editor, which receives `index`, follows the block's position.
- Mod+Z, Mod+Shift+Z and Mod+Y, where bound, pressed on a control in a custom block's preview, such as a checkbox, undo and redo the document as they do on the block itself, where Chromium and WebKit did nothing. A text field in the preview (an `input` that takes text, a `textarea` or a contenteditable element) keeps its own undo.
- A block whose renderer threw is drawn again when its renderer changes, as when the host passes a fixed renderer in `renderers` or new `blockTypes`, where it waited for its data to change.
- A click on the fallback of a text block whose renderer threw selects the block's text as a whole, as a block selection of that one block rather than a node selection, so Delete removes it, where it put a caret in a block with no text drawn to hold it.
- The sourcemaps of the client entries (`'use client'` at the top of the file) map every line again: the directive sits on a line of its own and the map starts with an empty line, where 1.1.0 put it on the first line of code and left the first line's columns off by the length of the directive.

### Changed
- The "No alt text" badge on an image is named "No alt text, add alt text": its visible text first, then what it opens, where it was named by its visible text alone. Its visible text is unchanged. New label `addAltText`, optional in `QuoinLabels` and English where missing. A host that sets `noAltBadge` and not `addAltText` keeps the 1.1.0 name, its translated visible text alone.
- A host renderer for a text block that draws no `EditableRegion` for its text has its text selected as a whole by a click, as a block selection of that one block rather than a node selection, as a block whose renderer threw does. ArrowUp and ArrowDown pass over such a block since 1.1.0, which put the caret in text nothing showed before; the headless page now says so.

## 1.1.0 (2026-10-29)

### Added
- A custom block's editor receives `blockId`, `index` (the block's index in the flat `blocks` array, counting from 0 with nested blocks included, kept current as blocks move; only a block whose index changed draws again) and `onRemove`, which removes the block as one undo step and puts the caret where deleting the selected block puts it. A preview receives `onChange` on an editable canvas, written like an editor's: writes to one block that each follow the last within the history's grouping window (500 ms by default) undo together, so it can hold a control such as a checkbox, and a write made while focus is on the block leaves it selected as a whole; a read-only canvas and `QuoinView` pass none. The canvas always passes all of these, and always passes a preview its `blockId`. They are optional in `BlockEditorProps` and `BlockPreviewProps`, so an editor rendered directly with only `data` and `onChange` still compiles.
- A block definition takes an optional `parse`, which reads a block's stored `data` into the shape its `editor` and `preview` take, to fill required fields and migrate older shapes. The canvas, `QuoinView` and `QuoinDiff` hand its result to `editor` and `preview`; it runs when the block is drawn, once per stored data, and writes nothing, so the stored data changes only when the editor or preview calls `onChange`. A block inserted without `initialData` is seeded with `parse({})`, so `parse` should accept `{}`; when seeding throws, nothing is inserted and the error goes to the canvas's `onError`, or to a warning in development without one. When `parse` throws while drawing, the canvas draws the block's error fallback and reports the error to `onError`, and `QuoinView` and `QuoinDiff` draw the block without its preview and warn once per block type in development. `initialData` stays optional; the custom blocks page recommends `parse` for data with required fields and shows a versioned migration.
- An image can be marked as deliberately decorative: its data takes `decorative: true` (stored only when true, kept by lossless markdown and `quoin-editor/yjs` like `alt`), and the alt text popover has a "Decorative image" checkbox that stores it and clears the alt text, and hides the hint that calls the alt text required while checked; typing alt text unchecks it. The popover closes, storing nothing, when the alt text or the flag changes under it. An editable canvas draws a "No alt text" badge, which opens the popover, on an image with an empty alt text that is not decorative; a read-only canvas, `QuoinView` and `toHTML` draw none. Output is unchanged: both cases are written with `alt=""`. As `decorative` is now a known key of image data, a value other than `true` is no longer kept, where 1.0 kept it as an extra field. New labels `decorativeImage` and `noAltBadge`.
- The labels added in this release, `blockError`, `decorativeImage` and `noAltBadge`, are optional in `QuoinLabels` and read as English where missing, so a complete translation typed as `QuoinLabels` still compiles. `englishLabels` is typed `Required<QuoinLabels>`.

### Changed
- The default `--quoin-warning` and `--quoin-input` reach 3:1 where they did not. Light `--quoin-warning` goes from `oklch(0.65 0.16 65)` to `oklch(0.6 0.16 65)`, the rule of a warning callout against its wash from 2.84:1 to 3.40:1 (dark stays at 7.82:1). `--quoin-input`, the border of the outline button, goes from `oklch(0.922 0 0)` (1.26:1 on the page) to `oklch(0.62 0 0)` (3.64:1) in light, and from `oklch(1 0 0 / 15%)` to the opaque `oklch(0.56 0 0)` (4.25:1 on the page, 3.85:1 on a popover) in dark. A host that sets these tokens keeps its own values.
- The coverage gate in CI now also covers the canvas and the `useQuoin` and `useLabels` hooks, with line thresholds of 95 percent on `src/view`, 97 on `src/blocks`, 98 on `src/ui`, 98 on `src/context.tsx` (`useQuoin`) and 98 on `src/i18n` (`useLabels`), next to the engine's 90.
- The build runs each output chunk through Rollup's tree shaking after esbuild, which merges a chunk's imports and drops arguments no caller passes: the main entry goes from 155,039 to 152,741 B gzip and `quoin-editor/headless` from 70,129 to 69,824 B, and the main entry with any feature entry is about 2.2 KB smaller. The `'use client'` directive is on the same files as before, and the engine, view, diff, docx and yjs entries still carry none. The sourcemaps leave out a segment that maps to the same place as the one before it on its line, which keeps the place a greatest lower bound lookup finds, the one browsers and Node's `SourceMap.findEntry` make, and keeps the tarball about 1 MB packed; a least upper bound lookup or a list of every generated position for a source place can differ. The build fails on mappings that hold a character that is not a base64 digit.

### Fixed
- The attributes an extension's block decoration puts on its block's element are filtered to the names that start with `data-` or `aria-`: a decoration with `style`, `className`, an event handler or `dangerouslySetInnerHTML` no longer reaches the element, and can no longer make React throw.
- A renderer that throws while drawing its block no longer unmounts the whole canvas: that block draws a fallback named by the new `blockError` label (`Block could not be drawn`) in its own element, the other blocks keep working, the error goes to `onError` when one is given, and React reports it as it does any caught error, and the block is drawn again when its data changes. `EditorView` takes `blockErrorLabel` and `onBlockError` for the same.
- ArrowUp and ArrowDown pass over a text block whose renderer threw, rather than putting the caret in a block that has no text to hold it.

## 1.0.2 (2026-10-27)

### Fixed
- A task's checkbox and an embed's frame are never left with an empty or blank name. In the canvas, a `task` label that is empty or only white space names the checkbox `Task`, and a `frameTitle` label that returns one titles the frame with its provider's name, or with its page's address when the provider has no name. `toHTML`, `QuoinView` and `QuoinDiff` treat a `taskLabel`, an `emptyTask` label, a `frameTitle` or a provider name of only white space as empty too, rather than writing it as the name.
- With `quoin-editor/yjs`, a collaborator's change to a block's type reads only that block again from the shared document, rather than the whole document, as does a collaborator's change to the rows or columns of a table, or any other change that only puts in or takes out the start of a region: at 20,000 blocks a type change takes about 8 ms, against about 75 ms before, close to the 5 ms of a collaborator's typing. A block that concurrent edits left out of shape still reads the whole document, as before.
- With `quoin-editor/yjs`, the caret stays on its character when a collaborator's change reads blocks of the shared document again, such as turning the paragraph above it into a code block: it was put back by the layout from before the change and could jump within its block or into another one.
- With `quoin-editor/yjs`, a change another writer makes to the `id` in a block's marker in the shared `Y.Text` is read: the editor takes the document as the text now reads, where it kept showing the block under its old id.
- With `quoin-editor/yjs`, content in the shared `Y.Text` that the `Y.Text` API never writes, such as values put in through `Y.Array` on the same name, counts as one skipped embed per value, rather than being dropped, so the positions the editor holds match those of Yjs.

### Known limits
- In the canvas, a task's text box still takes a `task` label that is empty or only white space as its name.

## 1.0.1 (2026-10-26)

### Added
- `toDocx` takes an optional `baseUrl`, the address of the page the document comes from: a link or a file whose address is a relative path, such as `/files/a.pdf` or `notes/a.pdf`, is linked to that address read against it, rather than written as its text. A network path (`//host/x`, `\\host\share`, `/\host`) and a fragment such as `#top` stay text. A base that is not an absolute `http` or `https` address is ignored, a user and password in it are left out of the links, and an empty link stays text.
- `commentsExtension` takes an optional `initialLayout: 'wide' | 'narrow'`, the layout drawn on the server and in the first render before the canvas is measured, so a server-rendered wide canvas no longer shifts by 236 px as it hydrates. The default stays `'narrow'`.

### Changed
- `Transaction` and `ViewController` keep their private state in native private fields, so a proxy around one of them, such as Vue's `reactive` or Valtio's `proxy`, cannot read it and its methods throw: wrap the object that holds them, not these instances.
- The transaction that moves the caret to where text is dropped has the `drop` origin, rather than `command`.
- Docs: chains merge the meta of every part, so a key one part set is seen on the whole chain (extensions page).
- Docs: two clients can hold a table's alignment as no `align` or as `align: [null, null]`, which the editor and `QuoinDiff` treat as equal; a host comparing saved JSON should normalise `align` (collaboration page).
- Docs: typing into a block whose region another edit took out can bring along text waiting before it, which then shows one block higher on every client (collaboration page).
- Docs: edits a headless editor makes while unmounted stay local and are not sent when it connects again (collaboration page).
- Docs: the `onError` of `yjsCollaboration` is the adapter's own, apart from the canvas's; pass both the same handler (collaboration page).

### Fixed
- Under a collaboration, `editor.chain().undo().run()` and `editor.chain().redo().run()` undo and redo when the chain holds nothing else, rather than doing nothing. A chain that holds other commands as well still does nothing.
- A canvas rendered on the server, as with `react-dom/server`, leaves out a code token's `color` that holds what could leave the declaration or load a resource (any of `;` `{` `}` `\` `"` `'` `<` `>` `!`, a `/*`, or `url(`, `image(`, `image-set(` or `expression(`), rather than writing a value such as `red;background-image:url(...)` into the page as it is, and the canvas in the browser leaves out the same values. Other colours, such as `var(--name, #fff)`, `hsl(var(--primary))`, `color-mix()` and `light-dark()`, are drawn by the canvas as in 1.0, and now by `QuoinView` too, which uses the same rule.
- `toHTML`, `QuoinView` and `QuoinDiff` no longer write an empty accessible name: an empty `taskLabel` names a task with no text `Task` (in `QuoinDiff`, the `emptyTask` label, and `Task` when that is empty too), and a frame whose `frameTitle` is empty is titled with its provider's name, or with its page's address when the provider has no name.
- `toDocx` writes a link to an `http` or `https` address with no host, such as `http:foo` or `http://?x`, as its text, as it does other targets Word cannot open, rather than as a hyperlink.
- With presence, a long collaborator name at the end of a line is cut off where the avatars' gutter begins, rather than over the avatars.
- With presence, a collaborator's caret near the side of a wide table, and its name, are cut off at the table's side as the table's text is, rather than drawn whole past it.
- With presence, a collaborator's caret, and with `quoin-editor/ai` an answer, in a scroller that sits inside another box that clips what overflows, such as a table in a custom block, is clipped by both, rather than only by the nearest one.
- With presence, a collaborator's caret in a wide table moves with the table as it scrolls, rather than a frame behind it.
- With `quoin-editor/ai`, the room kept under a block for its answer no longer adds to the block's bottom padding or to the row gap of a flex or grid canvas under a block another block follows: the answer takes that space first, and the room makes up only the rest. Padding the block paints, with a bottom border or a background, is left to the block.
- With `quoin-editor/ai`, an answer growing above the part of the page being read no longer pushes that text down in a browser without scroll anchoring, such as Safari, or on a page that turns scroll anchoring off, smooth `scroll-behavior` or not, and in a canvas that scrolls itself.
- With `quoin-editor/comments`, a thread just resolved or deleted no longer comes back for a moment when your store sets new copies of threads that have not changed before it records the resolution. It comes back once your store, having resolved or removed it, reopens it.
- With `quoin-editor/comments`, a selection your code sets, as a command or an AI answer does, no longer closes a thread a click opened, "Text removed" included: only the writer's own caret moves close it, an undo, a redo and a drop included.
- With `quoin-editor/comments`, a thread a click opened closes once the writer moves the caret out of its text, rather than staying open over the lines they go on to type.
- A canvas drawn inside another canvas's tree owns its own text, menus and popovers: focus in them no longer counts as focus in the outer canvas, which kept the inner canvas's presence, comments and AI from seeing it as their own and let the outer canvas's go on as if focused.
- With `quoin-editor/yjs`, a row two people add to a table at the same moment, followed by a move of the table and a new column, no longer has one client write cell text at the wrong place, which split it across cells for the others.
- With `quoin-editor/yjs`, deleting a table while someone adds or removes one of its rows or columns no longer leaves hidden regions in the line after it, over which Enter threw: the cell text shows at the end of that line.
- Presence on a second editor given a `yjsCollaboration` that already serves one, which stays unconnected, no longer writes to the awareness: unmounting it no longer takes the person and their selection out while the first canvas is still mounted.
- An editor that disconnects from a `yjsCollaboration` and connects again within a frame, as StrictMode or a quick remount does, keeps what it can undo and redo. A collaboration left disconnected longer lets its undo history go, as in 1.0.
- `yjsCollaboration` reports to its `onError` a change from the shared document that does not apply to the editor, as the error applying it raised, before the editor takes the document as the shared text reads, rather than recovering in silence.
- A block that a collaborator's change leaves selected as a whole comes into view with the writer's next change, rather than only once the selection leaves it and comes back.
- A collaborator's caret move drawn in the same render as a change from your code, such as a command that selects a block below the fold, no longer keeps that change from scrolling it into view. A collaborator's change to the document still scrolls nothing.
- A table's row or column menu stays open while a collaborator types in its own row or column. It still closes when a change from elsewhere moves that row or column.
- Two people changing one block's type at the same moment no longer hide the block's text: text left in a region the winning type does not have shows in that type's own region.
- A caret in a block that a new `blocks` array changes on both sides of it stays on its character, rather than moving by the length of the later change.

### Known limits
- A task's checkbox and an embed's frame in the canvas still get no name when a host's `task` or `frameTitle` label is empty or blank, and a `taskLabel` or `frameTitle` of spaces only gives `toHTML`, `QuoinView` and `QuoinDiff` a blank name.
- With presence, a collaborator's caret can stay off its character after a style change that reflows the text without resizing its block, until the next change, scroll or resize.
- With `quoin-editor/yjs`, a table cell whose region concurrent row and column edits took out cannot be selected or typed into until the table is rewritten, as by adding or removing a row or a column. This is as in 1.0.0.

## 1.0.0 (2026-10-23)

Quoin 1.0 replaces the 0.4 canvas, a card per block with a textarea opened to edit it, by an editor of its own: an engine with no dependency, a view that types into the page in place, and a canvas UI on top. A 0.4 document loads as it is, and the 0.4 `BlockCanvas` props keep their names. [MIGRATION.md](MIGRATION.md) lists what a 0.4 host changes.

### Added
- `quoin-editor/engine`: the editing engine alone, with no React, no DOM and no `'use client'` banner. A document model of blocks with inline regions, steps, transactions and history, commands (`editor.commands`, `editor.chain()`), input and paste rules, and a markdown codec that reads a 0.4 document as it is and writes back only the blocks that were edited. Also `toMarkdown`, `fromMarkdown`, `toHTML`, `toPlainText`, `fromHTML`, `diffBlocks` and `countDoc`.
- `quoin-editor/headless`: the engine and its editable view, with no canvas UI: `useQuoinEditor`, `EditorView`, `EditableRegion` and `ViewController`. Each text region is typed into in place, with IME composition, native caret movement, selections across blocks and the clipboard handled by the view.
- `quoin-editor`: `BlockCanvas` rebuilt on the engine. Paragraphs, headings, bullet, numbered and task lists, quotes, callouts, toggles and dividers are typed in place, with live formatting from markdown shortcuts (`**bold**`, `# `, `- `, `> ` and the rest). Code, image and file blocks are drawn and edited inside the canvas. The canvas adds a slash menu, a bubble toolbar for formatting and links, a link popover, a gutter with a drag handle and a "+" that adds a block below, a block menu (Turn into, Color, Duplicate, Copy, Copy link to block, Move up, Move down, Delete) reached from the handle, a right click on the gutter or Mod+/, drag and drop with a drop line, text and background colours, text alignment, a toolbar for touch screens and a keyboard shortcuts dialog (Mod+Shift+/).
- `BlockCanvas` props `extensions`, `highlight`, `autoFocus` (off by default), `placeholder`, `labels` and `blockLink`, and a ref whose `QuoinEditorHandle` gives the `editor`, the `controller`, `focus()` and `toMarkdown()`.
- `defineExtension` for extensions of your own: blocks, marks, atoms, commands, keymaps, input and paste rules, plugins, decorations, transaction hooks, and a `ui` field (`ExtensionUI`) that adds slash items, bubble items, block menu items, block renderers and overlays to the canvas.
- `QuoinLabels`, `englishLabels`, `resolveLabels` and `useLabels`: every string the canvas shows or speaks, English by default and replaced key by key through `labels`.
- `CodeHighlighter` and `CodeToken`, for the `highlight` prop that colours code blocks.
- The optional `indent` field of `QuoinBlock`, the nesting depth of list items and of the blocks inside a toggle.
- The engine reads and writes the `DIVIDER`, `TOGGLE`, `TABLE`, `EMBED`, `BOOKMARK`, `MATH` and `TOC` block types, beside the five 0.4 types.
- Opt-in features, each an entry of its own that a page loads only when it imports it:
  - `quoin-editor/table`: tables typed cell by cell, with row and column menus, column widths and cell ranges.
  - `quoin-editor/embed`: embeds framed from YouTube, Vimeo, Loom, Figma, CodePen, Spotify and SoundCloud, and bookmark cards, with an `unfurl` option of your own.
  - `quoin-editor/math`: math blocks and formulas in a line, drawn by your `renderMath`, such as KaTeX.
  - `quoin-editor/toc`: a table of contents block that follows the headings.
  - `quoin-editor/mention`: `@` mentions, found by your own `search`.
  - `quoin-editor/emoji`: a `:` menu and an emoji picker, whose data loads the first time one opens.
  - `quoin-editor/find`: find and replace.
  - `quoin-editor/stats`: word and character counts, a limit, focus mode and typography rules.
  - `quoin-editor/catalogue`: `catalogue()`, every feature above at once.
- Platform entries:
  - `quoin-editor/yjs`: real-time co-editing through a Yjs document and your own provider, with an undo of your own changes only. `yjs` is an optional peer dependency.
  - `quoin-editor/presence`: collaborators' selections, carets and avatars.
  - `quoin-editor/comments`: comment threads anchored to text, kept in your store.
  - `quoin-editor/ai`: answers of your model streamed into the document; Quoin never calls a model itself.
  - `quoin-editor/view`: `QuoinView`, read-only output with no hooks, for a server component.
  - `quoin-editor/diff`: `QuoinDiff`, the changes between two versions of a document, block by block and word by word.
  - `quoin-editor/docx`: `toDocx`, a Word document written in a browser, a worker or Node.

### Changed
- Text blocks are typed in place instead of in a textarea that a click opens. Undo and redo work across the whole document, and the caret moves from block to block with the arrows.
- A new text block holds one line: a paragraph, a heading, a list item, a task or a quote. A 0.4 `MARKDOWN` block holding several paragraphs is kept as it is until it is first edited; it is then split into one block per line, the first keeping its id and the others taking ids derived from it (`<id>-2`, `<id>-3` and on), each written back as the canonical markdown of its line. A table in it becomes a `TABLE` block and an image alone on its line an `IMAGE` block.
- Nested list items keep their depth in `indent` rather than in leading spaces of their markdown.
- An image's `caption` and a callout's `body` are inline markdown, typed in place like a paragraph.
- The core blocks write new optional keys into `data` once a writer uses what they hold: `align`, `color` and `background` on `MARKDOWN`, `icon` on `CALLOUT`, `url`, `align` and `widthPercent` on `IMAGE`, and `mime` on `FILE`, beside `indent` on the block itself. Every 0.4 key keeps its name and meaning.
- `QuoinConfig`, which `useQuoin()` returns, gains `highlight` and the required `controller` and `labels`. `QuoinProvider` fills them in, so only a `QuoinConfig` built by hand, such as a test double, needs them.
- A structural copy of the document coming back is recognised as an echo within the last 256 changes the canvas reported, instead of 64.
- `onDelete` also reports whole blocks removed by typing over a selected block or pasting over selected blocks. A line that Backspace or Delete merges into its neighbour is still not reported.
- `defineBlock` takes any icon component that accepts a class name and `aria-hidden`, not only a lucide one. A custom block shows its `preview` at rest; its `editor` opens on a double click, its Edit button or Enter on the selected block, and Escape closes it. A definition for `DIVIDER` draws everywhere, and one for `MARKDOWN`, `CALLOUT` or `TOGGLE` only on a read-only canvas, which warns in development when the canvas is editable.
- `quoin-editor/headless` exports the view and the engine, and `formatShortcut` is exported from the main entry only. The main entry re-exports everything in `quoin-editor/headless`.
- A canvas given a collaboration extension is uncontrolled while the shared document is connected: it ignores any `blocks` array it did not emit, and warns in development.
- The stylesheet declares `color-scheme` in light and dark, and reads new tokens: `--quoin-selection`, the text and background colours `--quoin-color-*` and `--quoin-bg-*`, `--quoin-comment`, `--quoin-comment-active` and `--quoin-comment-edge`, `--quoin-diff-inserted` and `--quoin-diff-deleted`, and `--quoin-link`. Every 0.4 token keeps its name.
- English callout tone names are written in lower case in the tone chip and its menu.
- One build with code splitting serves every entry, in ESM and CommonJS, and each entry is held to a gzip budget in CI.
- The tarball is about 1 MB packed, under 5 MB unpacked: the sourcemaps leave out `sourcesContent` and name their sources relative to the map. They still map each line to its file and line under `src/`. Every entry is exported, and the package publishes `dist`, the README, the license, this changelog and MIGRATION.md.
- `@radix-ui/react-context-menu` is a new dependency, for the block menu on a right click.

### Removed
- The 0.4 textarea helpers, from both `quoin-editor` and `quoin-editor/headless`: `applyEdit` and `Edit`, `lineAt`, `toggleLinePrefix` and `LinePrefix`, `continueList`, `indentList`, `wrapSelection`, `linkPaste` and `WrapKind`, `insertCommand` and `InsertableCommand`, `shouldOpenPalette`, `caretRect` and `CaretRect`, and `useMarkdownKeymap`. Engine commands do their work; MIGRATION.md maps each one.
- `TEXT_COMMANDS` and `TextCommand`: the slash menu's items come from the canvas and from extensions.
- `useBlockList`, with `BlockList` and `UndoToken`: the editor's own commands and history cover it.
- `useAutoGrow`: nothing is drawn in a textarea any more.
- `formatShortcut` from `quoin-editor/headless` (it stays in `quoin-editor`).
- The dependencies `@dnd-kit/core`, `@dnd-kit/modifiers`, `@dnd-kit/sortable` and `@dnd-kit/utilities` (the canvas drags blocks itself), `cmdk` (the slash menu is the canvas's own), `tailwind-merge`, `class-variance-authority`, `@radix-ui/react-label` and `@radix-ui/react-select`.

### Fixed
0.4.1 fixed F-01, F-03, F-04, F-05, F-06, F-07, F-08, F-10, F-16, F-18, F-19, F-24, F-25, F-27, F-39 and F-40, listed under 0.4.1 below. 1.0 closes these; findings it only partly addresses are under Known gaps:
- F-02 [ARCH-1, CQ-12]: the card and textarea model is gone. Text is typed in place on one engine, with one history for the whole document and the caret moving across blocks.
- F-09 [CQ-4, PERF-1]: a keystroke re-renders the one block it changes, since each block shell is memoised on its block (`src/view/react/BlockShell.tsx`). `e2e/tests/headless/performance.spec.ts` holds typing in a 1,000 block document to a p95 of 16 ms on a development machine, and to a ratio against a small document in CI.
- F-13 [PKG-4]: the README no longer calls the headless entry safe for a server component; it carries a `'use client'` banner, as the main entry does. `quoin-editor/engine`, `/view`, `/diff`, `/docx` and `/yjs` carry none. `npm run check:directives` checks the banner of each entry, and the consumer check renders the view, the diff and the Word export in plain Node.
- F-15 [TEST-1]: CI runs Playwright on Chromium, Firefox and WebKit, typechecks the packed package and resolves each of its entries on React 18 and 19, renders the server entries in plain Node, and the release workflow runs the consumer check before publishing.
- F-17 [A11Y-1]: Mod+Shift+Arrow and the block menu move a block one place, and every move, by keyboard or by drag, is announced with its new position (`e2e/tests/canvas/shortcuts.spec.ts`, `drag.spec.ts`).
- F-21 [A11Y-8]: the slash menu is a combobox with `aria-activedescendant` from the moment it opens, and its result count is announced.
- F-22 [A11Y-9]: the slash menu opens from the text typed, not from a key press, so a virtual keyboard or dictation opens it too.
- F-23 [A11Y-10]: an upload in flight no longer disables the focused file input, and one status region, mounted from the start, announces its progress.
- F-26 [CQ-11]: `BlockCanvas.tsx` and `BlockCard.tsx` are gone; the canvas file wires the engine, the view and the UI in 159 lines.
- F-28 [CQ-14]: one suggestion menu serves the slash menu and every other menu typed in the text, and the shortcuts dialog reads one table, which `scripts/keyboard-docs.test.ts` checks against the keymaps: the dialog lists only keys the code binds, and every key the canvas's own keymaps bind.
- F-29 [CQ-15, PKG-5]: the `badge`, `label` and `select` primitives are gone, with `@radix-ui/react-label` and `@radix-ui/react-select`.
- F-31 [CQ-17]: `toggleLinePrefix` is gone with the textarea helpers.
- F-32 [CQ-18, PKG-3]: one build with code splitting, so `quoin-editor` and `quoin-editor/headless` share each export, which `src/index.test.ts` checks against the built files.
- F-34 [A11Y-7]: the editor is one tab stop, held by the block the selection is in. The gutter's controls are left out of the tab order, Mod+/ opens the block menu from the text, and the arrows move between blocks.
- F-35 [A11Y-12]: every block menu item is named by the text it shows (`src/gutter/BlockMenu.test.tsx`).
- F-36 [A11Y-14]: the canvas no longer takes focus on mount unless `autoFocus` is set.
- F-37 [A11Y-16]: nothing animates or scrolls smoothly when the reader asks for reduced motion (`e2e/tests/canvas/reader-settings.spec.ts`).
- F-38 [A11Y-17]: on a touch screen the gutter shows one 44 px handle beside the block being edited, and a toolbar above the keyboard carries the editing tools.
- F-41 [A11Y-21]: the shortcuts dialog lists the canvas's keyboard model, the keyboard docs page adds the keys of the opt-in features, and the Accessibility docs page names what each test suite checks and what it does not.

### Security
- `toDocx` links a hyperlink only when its address is an absolute `http`, `https`, `mailto` or `tel` one; any other address, relative ones included, is written as plain text, since Word reads a relative address against the file's folder and a `\\host\share` address as a network share.
- `QuoinView` and `QuoinDiff` write the colour of a `highlight` token into a `style` attribute only when it is one colour value (a hex colour, a keyword, a colour function or a custom property), so a token cannot add a declaration of its own.

### Known gaps
Findings of #73 that 1.0 addresses only in part. Each part still open stays open in [#73](https://github.com/AmineSeboui/quoin-editor/issues/73); none has a follow-up issue yet.
- F-11 [API-1]. Fixed: extensions add commands, keymaps, input and paste rules, plugins and canvas UI through `defineExtension`, and `BlockCanvas` takes a ref. Remains: a block's `preview` still cannot write its data, and `BlockEditorProps` gained no `blockId`, `index` or `onRemove`.
- F-12 [PKG-2]. Fixed: dnd-kit, cmdk, tailwind-merge and class-variance-authority are gone, features beyond the core blocks are entries of their own, and `npm run check:size` holds every entry to a budget. Remains: the build turns tree shaking off, since Rollup would strip the `'use client'` banners, and leaves it to the host's bundler.
- F-14 [API-4, A11Y-15]. Fixed: `QuoinView` renders a document on a server, with real headings, lists and links, the canvas draws text formatted instead of raw markdown, and `toHTML` and `QuoinView` draw an image as a `figure` with `width`, `height`, `loading="lazy"` and its caption, and a file as a link. Remains: an empty alt still marks an image decorative silently, with no choice to make it so on purpose.
- F-20 [A11Y-6]. Fixed: a callout's tone is in its accessible name ("Callout, warning"), and `toHTML` writes a callout as `<aside role="note" data-tone>`, so colour is no longer the only cue. Remains: the light `--quoin-warning` keeps its 0.4 value, so the warning callout's rule keeps the contrast the review measured, 2.84:1 against its wash.
- F-30 [CQ-16]. Fixed: ESLint with typescript-eslint and react-hooks runs in CI, with a coverage gate of 90 percent of lines on the engine. Remains: no coverage threshold on the canvas or the hooks.
- F-33 [API-3]. Fixed: `icon` accepts any component. Remains: `initialData` stays optional when the data has required fields, and a definition has no `parse` or `migrate`.
- F-42 [A11Y-22]. Fixed: `color-scheme` is declared in light and dark. Remains: `--quoin-input` keeps its 0.4 values, which the review measured at 1.26:1 in light and 1.47:1 in dark for field borders.

## 0.4.2 (2026-10-15)

A metadata-only patch. The code is the same as 0.4.1 and nothing in the public API changes.

### Changed
- The repository moved to `AmineSeboui/quoin-editor`, so the `repository`, `homepage` and `bugs` fields of the package, and the README badges and links, point at the new repository and its documentation site, `https://amineseboui.github.io/quoin-editor`.
- This version is published with npm provenance from the new repository. The provenance of earlier versions still names the former repository, which no longer exists.

## 0.4.1 (2026-10-12)

A patch release that fixes the data-loss, accessibility and React 18 problems found in a review of 0.4.0. Nothing is removed from the public API.

### Fixed
- `useAutosave` saves the newest edit when its component unmounts, and when the page is hidden or closed (`pagehide`, or the tab turning hidden), instead of dropping up to one debounce interval of typing (F-01).
- `useAutosave` keeps one save in flight. Edits made while it runs are sent in a single follow-up save with the newest payload, so an older payload can no longer land last (F-05).
- A save that fails after `useAutosave` has unmounted no longer schedules retries nobody can stop (F-06).
- A save that fails for good no longer retries forever: retries stop after `maxRetries` (default 8) or when `isRetryable` says no, `status` becomes `failed` and `error` holds the reason. A success clears the error and any pending backoff (F-05).
- An image block records its `storageKey` as soon as the upload finishes, before the picture is measured. With overlapping uploads the last pick wins, and a late measurement never overwrites a newer image. Replacing an image drops the previous image's width and height, so a picture that cannot be measured is never stored with another picture's size (F-07).
- `UploadField` waits for an async `onUploaded` and reports its rejection through `onError`, once. The "Image attached" text no longer carries a check mark that screen readers read out (F-25).
- The markdown surface and the empty-document starter ignore keys that belong to an IME composition. Committing a candidate with Enter no longer continues a list, and Backspace, Tab and `/` inside a composition no longer exit a list, indent or open the palette (F-08).
- On macOS the shortcuts use Command, so Ctrl+B, Ctrl+E and Ctrl+K keep their system text meanings. Elsewhere they use Ctrl, as before (F-27).
- A lagging host that echoes the canvas back no longer rewinds it. An array the canvas emitted is recognised however late it comes back, so the limit of 64 unacknowledged emissions is gone, and a structural copy of one of the last 64 counts as its echo. Stores that clone the document on the way through, such as Redux, Zustand or a server round trip, keep every keystroke while they are within 64 edits (F-10).
- Keyboard focus is visible on buttons, inputs, textareas, selects, the dialog close button, the markdown surface and the starter: a solid 2 px outline in `--quoin-ring`, which reaches 3:1 against the page and popover in light and dark, and which Windows forced colours mode keeps (F-04, F-18).
- A highlighted row in a menu, the slash palette or a select carries an inset bar as well as a background, and the Delete label and shortcut hints reach 4.5:1 on it (F-19, F-40).
- React 18 works: `Button`, `Input` and `Textarea` forward refs, so the refs that focus return, the drag handle and the menu triggers rely on are no longer dropped, and layout effects no longer run during server rendering. CI now checks the packed package on React 18 and 19 (F-03).
- Inserting a block focuses and scrolls to it inside its own canvas, so two canvases on one page no longer interfere (F-16).
- The last inserted block no longer reopens, and takes focus, when `readOnly` is toggled or the host undoes a change (F-24).
- Inserting a block from the slash palette closes the source block's editor, so one editor is open at a time (F-39).

### Changed
- `useAutosave` gains the `'failed'` status, the `maxRetries`, `isRetryable` and `flushOnHide` options, and `error` and `flush()` on its result. When `save` resolves `{ ok: false }`, that value is the `error`.
- `UploadFieldProps.onUploaded` may return a promise.
- `useAutoGrow` is typed to return `React.RefObject<T>`, so the ref it returns is accepted by React 18 and 19 types.
- Default tokens: light `--quoin-ring` is darker, dark `--quoin-ring` is lighter, and light `--quoin-destructive` and `--quoin-muted-foreground` are slightly darker. A host that maps `--quoin-ring` to a pale colour should give it one that reaches 3:1.
- A host that does not echo `onChange` and restores a copy of a state from its last 64 edits now sees it ignored as a late echo. Remount the canvas with a React `key` to force the reset.
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
- Builds under Tailwind v3 hosts.

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
