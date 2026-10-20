import { act } from '@testing-library/react';
import { coreBlocks } from '../blocks/core';
import { mountCanvas } from '../blocks/void/test-canvas';
import { englishLabels } from '../i18n/english-labels';
import type { AnyBlockDefinition } from '../registry';
import type { QuoinLabels } from '../i18n/labels';
import type { BlockPreviewProps, QuoinBlock, UploadFn } from '../types';

const MARK = '\u00a7';

// Every label replaced by its own name behind a mark, so any word left once the marked names are taken out is English
// that the labels cannot change.
function sentinelLabels(): QuoinLabels {
  const entries = Object.entries(englishLabels).map(([key, value]) => {
    if (typeof value === 'string') return [key, `${MARK}${key}`];
    if (typeof value === 'function') return [key, (...args: unknown[]) => `${MARK}${key}(${args.join(',')})`];
    return [key, Object.fromEntries(Object.keys(value).map((name) => [name, `${MARK}${key}.${name}`]))];
  });
  return Object.fromEntries(entries) as QuoinLabels;
}

const NAMED = ['aria-label', 'title', 'placeholder', 'alt', 'aria-placeholder', 'aria-roledescription'];

const MARKED = /\u00a7[\w.]+/g;

const isEnglish = (value: string | null) => value !== null && /[A-Za-z]{2,}/.test(value.replace(MARKED, ''));

function englishOnPage(): string[] {
  const found: string[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    if (isEnglish(node.textContent)) found.push(`text "${node.textContent}"`);
  }
  for (const element of document.body.querySelectorAll('*')) {
    for (const name of NAMED) {
      const value = element.getAttribute(name);
      if (isEnglish(value)) found.push(`${name}="${value}"`);
    }
  }
  return found;
}

const media: QuoinBlock[] = [
  { id: 'i0', type: 'IMAGE', data: { storageKey: '', alt: '' } },
  { id: 'i1', type: 'IMAGE', data: { storageKey: 'k1', alt: '~1' } },
  { id: 'f0', type: 'FILE', data: { storageKey: '', filename: '' } },
  { id: 'f1', type: 'FILE', data: { storageKey: 'k2', filename: '~2' } },
  { id: 'c0', type: 'CODE', data: { language: '', code: '' } },
  { id: 'c1', type: 'CODE', data: { language: '~3', code: '~4' } },
];

const upload: UploadFn = async () => ({ storageKey: 'k', filename: '~5', size: 1 });

describe('a canvas whose every label the host replaced', () => {
  it('shows and speaks no English in the image, file and code blocks, at rest or edited', () => {
    const { nodeSelect, press } = mountCanvas(media, { labels: sentinelLabels(), upload, blockTypes: coreBlocks });
    const seen = new Set(englishOnPage());
    for (const id of ['i1', 'f1', 'c1']) {
      nodeSelect(id);
      press('Enter');
      for (const english of englishOnPage()) seen.add(`${id}: ${english}`);
      press('Escape');
    }
    expect([...seen]).toEqual([]);
  });

  it('says no English where uploads are not configured, in the field or to onError', () => {
    const onError = vi.fn();
    const canvas = { labels: sentinelLabels(), onError, blockTypes: coreBlocks };
    const { nodeSelect, press, handle } = mountCanvas(media, canvas);
    nodeSelect('i0');
    press('Enter');
    expect(englishOnPage()).toEqual([]);
    act(() => handle().controller.onFiles?.([new File(['x'], 'x.png', { type: 'image/png' })], null));
    expect(onError).toHaveBeenCalledWith(new Error(`${MARK}uploadsUnavailable`));
  });

  it('shows no English in the core text previews a read-only canvas draws through a host definition', () => {
    const empty: QuoinBlock[] = [
      { id: 'm', type: 'MARKDOWN', data: { markdown: '' } },
      { id: 'n', type: 'CALLOUT', data: { tone: 'info', body: '' } },
    ];
    const wrapped = coreBlocks.map((definition): AnyBlockDefinition => {
      const { preview: Preview } = definition;
      return Preview ? { ...definition, preview: (props: BlockPreviewProps) => <Preview {...props} /> } : definition;
    });
    mountCanvas(empty, { labels: sentinelLabels(), blockTypes: wrapped, readOnly: true });
    expect(document.body.textContent).toContain(`${MARK}emptyMarkdown`);
    expect(document.body.textContent).toContain(`${MARK}emptyCallout`);
    expect(englishOnPage()).toEqual([]);
  });
});
