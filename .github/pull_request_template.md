## What this changes

<!-- What it fixes or adds, and why. Link the issue it closes, if any. -->

## How it was checked

<!-- The tests added or changed, and anything checked by hand: browsers, screen readers, React 18. -->

## Checklist

- [ ] A test was written first, seen failing, and now passes.
- [ ] `npm run lint && npm run typecheck && npm run test:coverage && npm run build && npm run check:css && npm run check:directives && npm run check:size` passes.
- [ ] `npm run check:consumer` and `QUOIN_REACT=18 npm run check:consumer` pass, if an export, a type or a sample changed.
- [ ] The Playwright specs this touches pass.
- [ ] CHANGELOG.md has a line, if a user of the package would notice the change.
- [ ] The commit subjects follow Conventional Commits.
