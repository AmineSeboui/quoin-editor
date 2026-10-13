import { equalInline, normalizeInline } from '../../model/inline';
import type { Inline } from '../../model/types';
import type { InlineCodec, SerializeInlineOptions } from '../../schema/types';
import { parseInline } from './parse-inline';
import { renderInline } from './render-inline';

export function serializeInline(inline: Inline, options: SerializeInlineOptions = {}): string {
  const nodes = normalizeInline(inline);
  const base = {
    escapeLineStart: options.escapeLineStart ?? false,
    escapePipes: options.escapePipes ?? false,
    hardBreak: options.hardBreak ?? 'backslash',
  } as const;
  const pretty = renderInline(nodes, { ...base, strict: false });
  return equalInline(parseInline(pretty), nodes) ? pretty : renderInline(nodes, { ...base, strict: true });
}

export const inlineCodec: InlineCodec = { parse: parseInline, serialize: serializeInline };
