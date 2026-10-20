import { blockByType } from '../registry';
import { coreBlocks } from './core';
import { fileAttrs } from './file/file-upload';
import type { IntrinsicSize } from './intrinsic-size';
import type {
  MarkdownBlockData,
  CalloutBlockData,
  CodeBlockData,
  ImageBlockData,
  FileBlockData,
} from './data';

/** Fails to compile unless the runtime key list is exactly the declared type's keys, in
 *  either direction: a field added to the type without the list, or the reverse. */
type Exact<Declared extends string, Listed extends string> = [Declared] extends [Listed]
  ? [Listed] extends [Declared]
    ? true
    : never
  : never;

const KEYS = {
  MARKDOWN: ['markdown'],
  CALLOUT: ['tone', 'body'],
  CODE: ['language', 'code'],
  IMAGE: ['storageKey', 'alt', 'caption', 'width', 'height', 'url', 'align', 'widthPercent'],
  FILE: ['storageKey', 'filename', 'size', 'mime'],
} as const;

type _M = Exact<keyof MarkdownBlockData, (typeof KEYS.MARKDOWN)[number]>;
type _C = Exact<keyof CalloutBlockData, (typeof KEYS.CALLOUT)[number]>;
type _O = Exact<keyof CodeBlockData, (typeof KEYS.CODE)[number]>;
type _I = Exact<keyof ImageBlockData, (typeof KEYS.IMAGE)[number]>;
type _F = Exact<keyof FileBlockData, (typeof KEYS.FILE)[number]>;
const _assert: [_M, _C, _O, _I, _F] = [true, true, true, true, true];

/** The image block writes a measured size onto the block, so those names are part of the shape. */
type _S = keyof IntrinsicSize extends keyof ImageBlockData ? true : never;
const _spread: _S = true;

describe('core block data shapes', () => {
  it.each(Object.keys(KEYS) as (keyof typeof KEYS)[])(
    '%s seeds only declared fields',
    (type) => {
      const seed = blockByType(coreBlocks, type)?.initialData?.() ?? {};
      expect(Object.keys(seed).sort()).toEqual(
        Object.keys(seed).filter((k) => (KEYS[type] as readonly string[]).includes(k)).sort(),
      );
      expect(Object.keys(seed).length).toBeGreaterThan(0);
    },
  );

  it('FILE gets only declared fields from an upload', () => {
    const file = new File(['%PDF'], 'notes.pdf', { type: 'application/pdf' });
    const attrs = fileAttrs(file, { storageKey: 'k', filename: 'notes.pdf', size: 4, assetId: 'a1' });
    expect(Object.keys(attrs).filter((key) => !(KEYS.FILE as readonly string[]).includes(key))).toEqual([]);
  });
});
