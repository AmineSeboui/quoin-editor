# Contributing to Quoin

Thank you for helping. Bug reports, block type ideas, docs fixes and pull requests are all welcome. Please follow the [code of conduct](CODE_OF_CONDUCT.md), and report a security problem privately as [SECURITY.md](SECURITY.md) explains, never in a public issue.

## Setup

You need Node 22 (the version CI runs) and npm.

```bash
git clone https://github.com/AmineSeboui/quoin-editor.git
cd quoin-editor
npm ci
npx playwright install chromium webkit firefox
```

The package lives at the root. `demo/` is the docs site and the live demo, a separate package with its own `npm ci`.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run build` | Builds every entry into `dist/`, in ESM and CommonJS, and the stylesheet |
| `npm run lint` | ESLint, and a check of what the engine may import |
| `npm run typecheck` | TypeScript over the sources and the Playwright specs |
| `npm test` | The Vitest suite, in jsdom |
| `npm run test:coverage` | The same, with the engine's coverage thresholds |
| `npm run test:e2e` | The Playwright suite, against a harness served by Vite |
| `npm run check:css` | Every rule of the built stylesheet is scoped to the editor |
| `npm run check:directives` | Client entries carry `'use client'`, server entries do not |
| `npm run check:size` | Each entry stays within its gzip budget |
| `npm run check:consumer` | Packs the package, installs it in a fresh project and typechecks every entry and every `ts` and `tsx` sample of the README, MIGRATION.md and the docs pages |

## Tests

Write the test first, see it fail, then make it pass, and keep it. Unit tests sit next to the code they test (`*.test.ts` or `*.test.tsx`); browser behaviour, such as typing, selection, the clipboard, drag and drop and axe scans, belongs in `e2e/tests`.

Playwright runs on Chromium, Firefox and WebKit in CI. To run one browser locally:

```bash
npx playwright test --project=chromium
```

Firefox, and the Linux builds of the other two, can be run in the Playwright image CI uses. From the repository root, with Docker running (use the image tag that matches the installed `@playwright/test`):

```bash
docker run --rm --ipc=host -v "$PWD":/src:ro \
  mcr.microsoft.com/playwright:v1.64.0-noble bash -lc '
    mkdir -p /work && cd /src &&
    tar --exclude=node_modules --exclude=dist --exclude=.git --exclude=demo \
      --exclude=playwright-report --exclude=test-results -cf - . | tar -xf - -C /work &&
    cd /work && npm ci --no-audit --no-fund && CI=true npx playwright test --project=firefox'
```

Add `--cpus=1` after `--ipc=host` to reproduce the timing of a CI runner. With `CI` set, the performance spec compares a large document with a small one rather than holding it to a fixed time, so it holds on a slow machine.

## Before you open a pull request

Run the gate CI runs:

```bash
npm run lint && npm run typecheck && npm run test:coverage && npm run build && npm run check:css && npm run check:directives && npm run check:size
npm run check:consumer
QUOIN_REACT=18 npm run check:consumer
```

`check:consumer` runs against React 19 by default, and `QUOIN_REACT=18` checks React 18. If you change what an entry exports, run `npm run sync:exports` and commit the updated `package.json`.

## Commits and pull requests

- Commit subjects follow [Conventional Commits](https://www.conventionalcommits.org/): `fix(view): keep the caret in place after a remote change`, `feat(table): ...`, `docs: ...`. A breaking change takes `!` after the type and says what breaks in the body.
- Keep a pull request to one change, and say in its description what it fixes and how you checked it.
- Add a line to [CHANGELOG.md](CHANGELOG.md) for anything a user of the package would notice, in the top section while it is unreleased, or under a new `## Unreleased` heading once it has a date.
- No AI attribution lines are required, or expected, in commits or pull requests: no `Co-Authored-By` trailer for a tool, no "generated with" footer. You are the author of what you submit.

## Code style

- Files stay small and do one thing, well under 300 lines.
- Comments are rare and explain why, never what the code already says, and name no ticket or issue.
- Every string the canvas shows or speaks comes from its labels, so a host can translate it.
- The engine (`src/engine`) has no runtime dependency and imports nothing from React or the rest of the package; `npm run lint` checks what it imports.
- Prose in docs, comments and messages avoids em and en dashes; typographic characters in code and tests are written as `\u` escapes.

## Licence

By contributing, you agree that your contribution is licensed under the [MIT licence](LICENSE) of the project.
