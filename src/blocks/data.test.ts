import codeSrc from './CodeBlockEditor.tsx?raw';
import imageSrc from './ImageBlockEditor.tsx?raw';
import fileSrc from './FileBlockEditor.tsx?raw';
import { blockByType } from '../registry';
import { coreBlocks } from './core';
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
  IMAGE: ['storageKey', 'alt', 'caption', 'width', 'height'],
  FILE: ['storageKey', 'filename', 'size'],
} as const;

type _M = Exact<keyof MarkdownBlockData, (typeof KEYS.MARKDOWN)[number]>;
type _C = Exact<keyof CalloutBlockData, (typeof KEYS.CALLOUT)[number]>;
type _O = Exact<keyof CodeBlockData, (typeof KEYS.CODE)[number]>;
type _I = Exact<keyof ImageBlockData, (typeof KEYS.IMAGE)[number]>;
type _F = Exact<keyof FileBlockData, (typeof KEYS.FILE)[number]>;
const _assert: [_M, _C, _O, _I, _F] = [true, true, true, true, true];

/** The image editor spreads a measured size onto the block, so those names are part of
 *  the shape without appearing as literal keys in the source scan below. */
type _S = keyof IntrinsicSize extends keyof ImageBlockData ? true : never;
const _spread: _S = true;

const EDITOR_SOURCE = {
  CODE: codeSrc,
  IMAGE: imageSrc,
  FILE: fileSrc,
} satisfies Partial<Record<keyof typeof KEYS, string>>;

/** The object spreads an editor may use when it writes. `...data`, `...latest.current` and
 *  `...patch` are the `set` helper's own plumbing and carry no new names; `...size` is the
 *  measured image size, held to `ImageBlockData` by the type assertion above; `...unsized` is
 *  the image block less a stale size. Anything else is a key this scan cannot see, so the test
 *  fails rather than quietly passing it. */
const KNOWN_SPREADS = ['...data', '...latest.current', '...patch', '...size', '...unsized'];

/** Every top-level key an editor writes, read off the source rather than by driving the
 *  component: an upload path and a Radix select are awkward to fire, and a key written
 *  down one branch is exactly the kind this has to catch. */
function writtenKeys(src: string): { keys: string[]; spreads: string[] } {
  const keys: string[] = [];
  const spreads: string[] = [];
  for (const call of ['set({', 'onChange({']) {
    let from = 0;
    for (;;) {
      const start = src.indexOf(call, from);
      if (start === -1) break;
      let depth = 0;
      let i = start + call.length - 1;
      for (; i < src.length; i += 1) {
        if (src[i] === '{') depth += 1;
        else if (src[i] === '}') {
          depth -= 1;
          if (depth === 0) break;
        }
      }
      const body = src.slice(start + call.length, i);
      // Only top-level entries: a nested object's keys belong to a value, not the block.
      let d = 0;
      let segment = '';
      for (const ch of body) {
        if (ch === '{' || ch === '(' || ch === '[') d += 1;
        if (ch === '}' || ch === ')' || ch === ']') d -= 1;
        if (ch === ',' && d === 0) {
          segment = '';
          continue;
        }
        segment += ch;
        if (ch === ':' && d === 0) {
          const name = segment.slice(0, -1).trim();
          if (/^[A-Za-z_$][\w$]*$/.test(name)) keys.push(name);
          segment = '';
        }
      }
      for (const m of body.matchAll(/\.\.\.[\w.$]+/g)) spreads.push(m[0]);
      from = i;
    }
  }
  return { keys: [...new Set(keys)], spreads: [...new Set(spreads)] };
}

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

  it.each(Object.keys(EDITOR_SOURCE) as (keyof typeof EDITOR_SOURCE)[])(
    'the %s editor writes only declared fields',
    (type) => {
      const { keys, spreads } = writtenKeys(EDITOR_SOURCE[type]);
      expect(keys.length).toBeGreaterThan(0);
      expect(keys.filter((k) => !(KEYS[type] as readonly string[]).includes(k))).toEqual([]);
      expect(spreads.filter((s) => !KNOWN_SPREADS.includes(s))).toEqual([]);
    },
  );
});
