import type { EditorState } from '../../engine';
import type { ViewController } from '../../view';
import { useEditorState } from '../../view/react/use-editor-state';
import { headings, type TocHeading } from './headings';

const selectHeadings = ({ doc, schema }: EditorState): readonly TocHeading[] => headings(doc, { schema });

const sameHeading = (a: TocHeading, b: TocHeading): boolean =>
  a.blockId === b.blockId && a.level === b.level && a.text === b.text;

const sameHeadings = (a: readonly TocHeading[], b: readonly TocHeading[]): boolean =>
  a.length === b.length && a.every((heading, index) => sameHeading(heading, b[index]));

/** The headings of the document, the same array for as long as none of them changes. */
export function useTocHeadings(controller: ViewController): readonly TocHeading[] {
  return useEditorState(controller, selectHeadings, sameHeadings);
}
