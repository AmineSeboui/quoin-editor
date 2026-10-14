import { reconcileChildren } from './reconcile';
import type { RenderSpec } from './render-spec';
import { createWrappers, unwrap, wrapperDepth, wrapperEntries } from './wrappers';
import { segmentSignature, type Segment } from './segments';
import { textDiff } from './text-diff';

const TEXT = 'text';
const BREAK = 'break';

function textPiece(doc: Document, value: string, from: number): RenderSpec {
  return {
    sig: TEXT,
    create: () => doc.createTextNode(value),
    // Assigning data collapses a range inside the node to its start; an edit moves only the points after it.
    refresh(node) {
      const target = node as Text;
      const edit = textDiff(target.data, value);
      if (edit !== null) target.replaceData(edit.from, edit.to - edit.from, edit.insert);
      return true;
    },
    describe: (node, out) => void out.push({ node, from, to: from + value.length, kind: 'text' }),
  };
}

function breakPiece(doc: Document, from: number): RenderSpec {
  return {
    sig: BREAK,
    create() {
      const element = doc.createElement('br');
      element.setAttribute('data-quoin-break', '');
      return element;
    },
    describe: (node, out) => void out.push({ node, from, to: from + 1, kind: 'break' }),
  };
}

export function fillerSpec(doc: Document, at: number): RenderSpec {
  return {
    sig: 'filler',
    create() {
      const element = doc.createElement('br');
      element.setAttribute('data-quoin-filler', '');
      return element;
    },
    describe: (node, out) => void out.push({ node, from: at, to: at, kind: 'filler' }),
  };
}

function textPieces(value: string, from: number, doc: Document): RenderSpec[] {
  const pieces: RenderSpec[] = [];
  let at = from;
  value.split('\n').forEach((part, index) => {
    if (index > 0) pieces.push(breakPiece(doc, at++));
    if (part) {
      pieces.push(textPiece(doc, part, at));
      at += part.length;
    }
  });
  return pieces;
}

// Kept as one element so the browser's IME state and spellcheck marks survive while only the text nodes inside change.
function wrappedText(segment: Extract<Segment, { kind: 'text' }>, doc: Document): RenderSpec {
  const { marks, decorations, text, from } = segment;
  const depth = wrapperDepth(marks, decorations);
  const pieces = textPieces(text, from, doc);
  return {
    sig: segmentSignature(segment),
    create() {
      const wrappers = createWrappers(marks, decorations, doc);
      reconcileChildren(wrappers[depth - 1], pieces);
      return wrappers[0];
    },
    refresh(node) {
      const chain = unwrap(node, depth);
      if (!chain) return false;
      reconcileChildren(chain.wrappers[depth - 1], pieces);
      return true;
    },
    describe(node, out) {
      const { wrappers } = unwrap(node, depth) as { wrappers: Element[] };
      out.push(...wrapperEntries(wrappers, from, from + text.length));
      const children = Array.from(wrappers[depth - 1].childNodes);
      pieces.forEach((piece, index) => piece.describe(children[index], out));
    },
  };
}

export function textSpecs(segment: Extract<Segment, { kind: 'text' }>, doc: Document): RenderSpec[] {
  return wrapperDepth(segment.marks, segment.decorations) === 0
    ? textPieces(segment.text, segment.from, doc)
    : [wrappedText(segment, doc)];
}
