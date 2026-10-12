import type { Mark } from '../../model/types';
import { chooseDelimiter } from './emphasis-delimiter';
import { markTag, type Wrapper } from './html-marks';
import { linkClose } from './link-markdown';
import type { RenderOptions } from './render-options';

type EmphasisType = 'bold' | 'italic' | 'strike';

function isEmphasis(type: string): type is EmphasisType {
  return type === 'bold' || type === 'italic' || type === 'strike';
}

// A link to mention: whose text starts with @ would read back as a mention atom, so an empty tag pair keeps it a link.
function linkOpen(mark: Mark, inner: string): string {
  return mark.attrs?.href?.startsWith('mention:') && inner.startsWith('@') ? '[<u></u>' : '[';
}

export function wrapRange(mark: Mark, before: string, inner: string, after: string, options: RenderOptions): Wrapper {
  if (mark.type === 'link') return { open: linkOpen(mark, inner), close: linkClose(mark, options.escapePipes) };
  if (options.strict || !isEmphasis(mark.type)) return markTag(mark, options.escapePipes);
  const following = after === '\n' ? '\\' : after;
  const delimiter = chooseDelimiter(mark.type, before, inner, following);
  return delimiter ? { open: delimiter, close: delimiter } : markTag(mark, options.escapePipes);
}
