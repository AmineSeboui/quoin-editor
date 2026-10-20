import type { EngineBlock, Schema } from '../engine';
import { blockPlainText } from '../engine/render/block-plain-text';
import { languageName } from '../blocks/code/code-languages';
import { hasPicture } from '../blocks/image/image-source';
import { str } from '../blocks/str';
import { blockTypeLabel } from '../gutter/block-type-label';
import type { QuoinLabels } from '../i18n/labels';
import type { AnyBlockDefinition } from '../registry';

const LONGEST = 80;

function firstLine(text: string): string {
  const characters = [...text.split('\n', 1)[0].trim()];
  return characters.length > LONGEST ? `${characters.slice(0, LONGEST - 1).join('')}\u2026` : characters.join('');
}

/**
 * What the canvas calls a block selected as a whole, in a few words: an image by its alt text, a code block by its
 * language, and any other block by the first line of its text, or else by its type.
 */
export const selectedBlockLabel =
  (labels: QuoinLabels, definitions: AnyBlockDefinition[]) =>
  (block: EngineBlock, schema: Schema): string => {
    const { attrs } = block;
    if (block.type === 'IMAGE') return hasPicture(attrs) ? str(attrs.alt) || labels.imageNoAlt : labels.emptyImage;
    if (block.type === 'CODE') {
      const language = str(attrs.language);
      return labels.codeBlockName(languageName(language) ?? (language || labels.plainText));
    }
    return firstLine(blockPlainText(block, schema)) || blockTypeLabel(labels, block, definitions);
  };
