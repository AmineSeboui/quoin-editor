import type { Page } from '@playwright/test';
import { blocks } from './editor';

export const allMarkdown = async (page: Page): Promise<string[]> =>
  (await blocks(page)).map((block) => String(block.data.markdown));

export const markdownOf = async (page: Page, id: string): Promise<string> =>
  String((await blocks(page)).find((block) => block.id === id)?.data.markdown);

// The 'empty' document is one block whose id the harness generates, so a spec on it has no id to address.
export const onlyMarkdown = async (page: Page): Promise<string> => (await allMarkdown(page))[0];

// For a document that mixes block types. A block that is not markdown has no `markdown` to read, and its own data is
// what the spec is asserting on, so this returns that instead of the string "undefined".
export const markdownOrData = async (page: Page): Promise<unknown[]> =>
  (await blocks(page)).map((block) => (block.type === 'MARKDOWN' ? block.data.markdown : block.data));
