import { afterEach, describe, expect, it, vi } from 'vitest';
import { text } from '../model/inline';
import type { Inline } from '../model/types';
import { diffInline } from './diff-inline';
import { tokenize } from './tokens';

const texts = (inline: Inline) => tokenize(inline).map((token) => (token.kind === 'text' ? token.text : token.type));

const CAT = '\u732B';
const DOG = '\u72AC';
const japanese = (animal: string) => `\u79C1\u306F${animal}\u304C\u597D\u304D\u3067\u3059\u3002`;
const APPLE = '\u82F9\u679C';
const BANANA = '\u9999\u8549';
const chinese = (fruit: string) => `\u6211\u559C\u6B22\u5403${fruit}`;

const withoutSegmenter = () => vi.stubGlobal('Intl', Object.assign(Object.create(Intl), { Segmenter: undefined }));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('tokenize text written without spaces', () => {
  it('splits a Japanese sentence into its words', () => {
    const tokens = texts([text(japanese(CAT))]);
    expect(tokens.length).toBeGreaterThan(3);
    expect(tokens).toContain(CAT);
    expect(tokens.join('')).toBe(japanese(CAT));
  });

  it('marks only the changed word of a Japanese or Chinese sentence', () => {
    expect(diffInline([text(japanese(CAT))], [text(japanese(DOG))])).toEqual([
      { op: 'equal', inline: [text('\u79C1\u306F')] },
      { op: 'delete', inline: [text(CAT)] },
      { op: 'insert', inline: [text(DOG)] },
      { op: 'equal', inline: [text('\u304C\u597D\u304D\u3067\u3059\u3002')] },
    ]);
    expect(diffInline([text(chinese(APPLE))], [text(chinese(BANANA))])).toEqual([
      { op: 'equal', inline: [text('\u6211\u559C\u6B22\u5403')] },
      { op: 'delete', inline: [text(APPLE)] },
      { op: 'insert', inline: [text(BANANA)] },
    ]);
  });

  it('keeps words of spaced scripts as they were', () => {
    expect(texts([text('don\u2019t stop caf\u00E9 \u043C\u0438\u0440')])).toEqual([
      'don',
      '\u2019',
      't',
      ' ',
      'stop',
      ' ',
      'caf\u00E9',
      ' ',
      '\u043C\u0438\u0440',
    ]);
  });

  it('segments only runs of scripts written without spaces', async () => {
    class Refusing {
      segment(): never {
        throw new Error('segmented');
      }
    }
    vi.stubGlobal('Intl', Object.assign(Object.create(Intl), { Segmenter: Refusing }));
    vi.resetModules();
    const fresh = await import('./tokens');
    expect(fresh.tokenize([text('plain caf\u00E9 \u043C\u0438\u0440 \uD55C\uAD6D\uC5B4')])).toHaveLength(7);
  });

  it('keeps a run without spaces as one word where the runtime cannot segment words', () => {
    withoutSegmenter();
    expect(texts([text(japanese(CAT))])).toEqual([`\u79C1\u306F${CAT}\u304C\u597D\u304D\u3067\u3059`, '\u3002']);
    expect(diffInline([text(chinese(APPLE))], [text(chinese(BANANA))])).toEqual([
      { op: 'delete', inline: [text(chinese(APPLE))] },
      { op: 'insert', inline: [text(chinese(BANANA))] },
    ]);
  });
});
