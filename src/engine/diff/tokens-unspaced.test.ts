import { afterEach, describe, expect, it, vi } from 'vitest';
import { text } from '../model/inline';
import type { Inline } from '../model/types';
import { diffInline } from './diff-inline';
import { tokenize } from './tokens';

const texts = (inline: Inline) => tokenize(inline).map((token) => (token.kind === 'text' ? token.text : token.type));

const CAT = '猫';
const DOG = '犬';
const japanese = (animal: string) => `私は${animal}が好きです。`;
const APPLE = '苹果';
const BANANA = '香蕉';
const chinese = (fruit: string) => `我喜欢吃${fruit}`;

const withoutSegmenter = () => vi.stubGlobal('Intl', Object.assign(Object.create(Intl), { Segmenter: undefined }));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('tokenize text written without spaces', () => {
  it('splits a Japanese sentence into its words', () => {
    expect(texts([text(japanese(CAT))])).toEqual([
      '私',
      'は',
      CAT,
      'が',
      '好き',
      'です',
      '。',
    ]);
  });

  it('marks only the changed word of a Japanese or Chinese sentence', () => {
    expect(diffInline([text(japanese(CAT))], [text(japanese(DOG))])).toEqual([
      { op: 'equal', inline: [text('私は')] },
      { op: 'delete', inline: [text(CAT)] },
      { op: 'insert', inline: [text(DOG)] },
      { op: 'equal', inline: [text('が好きです。')] },
    ]);
    expect(diffInline([text(chinese(APPLE))], [text(chinese(BANANA))])).toEqual([
      { op: 'equal', inline: [text('我喜欢吃')] },
      { op: 'delete', inline: [text(APPLE)] },
      { op: 'insert', inline: [text(BANANA)] },
    ]);
  });

  it('keeps words of spaced scripts as they were', () => {
    expect(texts([text('don’t stop café мир')])).toEqual([
      'don',
      '’',
      't',
      ' ',
      'stop',
      ' ',
      'café',
      ' ',
      'мир',
    ]);
  });

  it('keeps a run without spaces as one word where the runtime cannot segment words', () => {
    withoutSegmenter();
    expect(texts([text(japanese(CAT))])).toEqual([`私は${CAT}が好きです`, '。']);
    expect(diffInline([text(chinese(APPLE))], [text(chinese(BANANA))])).toEqual([
      { op: 'delete', inline: [text(chinese(APPLE))] },
      { op: 'insert', inline: [text(chinese(BANANA))] },
    ]);
  });
});
