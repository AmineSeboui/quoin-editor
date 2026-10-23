import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = resolve(import.meta.dirname, '..', '..', 'src');
const STYLES = ['ui/tokens.css', 'view-static/static-links.css', 'diff/diff.css']
  .map((file) => readFileSync(resolve(src, file), 'utf8'))
  .join('\n');

// The host sets its page colours and nothing else: links keep the browser's own colours unless Quoin's styles set them.
const PAGE_COLOURS = 'body { background: var(--quoin-background); color: var(--quoin-foreground); }';

export type Theme = 'light' | 'dark';

/** A host page with Quoin's stylesheet for static markup, in a theme, around server-rendered markup. */
export const staticPage = (title: string, body: string, theme: Theme) =>
  `<!doctype html><html lang="en" class="${theme}"><head><meta charset="utf-8"><title>${title}</title>` +
  `<style>${STYLES}\n${PAGE_COLOURS}</style></head><body><main>${body}</main></body></html>`;
