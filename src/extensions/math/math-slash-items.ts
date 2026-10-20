import { Radical, Sigma } from 'lucide-react';
import { insertBlockToWrite } from '../../blocks/insert-blocks';
import type { EditorState } from '../../engine';
import { blockById } from '../../engine/model/doc';
import { inlineText, marksAt } from '../../engine/model/inline';
import { hasMark } from '../../engine/model/marks';
import type { SlashItem } from '../ui-types';
import type { MathLabels } from './math-labels';
import { openMath } from './math-target';

const KEYWORDS = ['math', 'latex', 'formula', 'katex'];

function caretInCode({ doc, selection }: EditorState): boolean {
  if (selection?.kind !== 'text') return false;
  const { block, region, offset } = selection.head;
  const inline = blockById(doc, block)?.regions[region] ?? [];
  return hasMark(marksAt(inline, offset, () => true), 'code');
}

/**
 * Block equation, which inserts a math block and opens its editor, and Inline equation, which opens the editor at the
 * caret and writes the formula there once a LaTeX is stored.
 */
export const mathSlashItems = (labels: MathLabels): SlashItem[] => [
  {
    id: 'block-equation',
    title: labels.blockEquation,
    description: labels.blockEquationDescription,
    group: 'advanced',
    icon: Sigma,
    keywords: [...KEYWORDS, '$$'],
    command: () => insertBlockToWrite({ type: 'MATH', attrs: { latex: '' } }, true),
  },
  {
    id: 'inline-equation',
    title: labels.inlineEquation,
    description: labels.inlineEquationDescription,
    group: 'advanced',
    icon: Radical,
    keywords: [...KEYWORDS, '$'],
    available: (state) => !caretInCode(state),
    run({ controller, range }) {
      const inline = blockById(controller.editor.state.doc, range.block)?.regions[range.region] ?? [];
      const { block, region, from } = range;
      openMath(controller, { kind: 'insert', block, region, offset: from, text: inlineText(inline) });
    },
  },
];
