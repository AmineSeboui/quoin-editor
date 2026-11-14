import { nestHeadings, type HeadingNode } from '../../engine/render/heading-tree';
import type { Heading } from '../../engine/render/headings';
import type { ObjectTable } from '../file/object-table';
import { pdfDict, pdfRef, pdfText } from '../file/pdf-syntax';

type Destination = (blockId: string) => string | undefined;

type Level = { readonly first: number; readonly last: number; readonly total: number };

function writeLevel(nodes: readonly HeadingNode<Heading>[], parent: number, table: ObjectTable, destination: Destination): Level {
  const ids = nodes.map(() => table.reserve());
  let total = 0;
  nodes.forEach(({ heading, children }, at) => {
    const kids = children.length > 0 ? writeLevel(children, ids[at], table, destination) : undefined;
    total += 1 + (kids?.total ?? 0);
    const entries = {
      Title: pdfText(heading.text),
      Parent: pdfRef(parent),
      Prev: at > 0 ? pdfRef(ids[at - 1]) : undefined,
      Next: at < ids.length - 1 ? pdfRef(ids[at + 1]) : undefined,
      First: kids && pdfRef(kids.first),
      Last: kids && pdfRef(kids.last),
      Count: kids?.total,
      Dest: destination(heading.blockId),
    };
    table.set(ids[at], { value: pdfDict(entries) });
  });
  return { first: ids[0], last: ids[ids.length - 1], total };
}

/** The document outline a reader lists beside the pages, a bookmark for each heading nested as the headings are. */
export function outlineObject(headings: readonly Heading[], table: ObjectTable, destination: Destination): number | undefined {
  const nodes = nestHeadings(headings.filter(({ blockId }) => destination(blockId) !== undefined));
  if (nodes.length === 0) return undefined;
  const root = table.reserve();
  const { first, last, total } = writeLevel(nodes, root, table, destination);
  table.set(root, { value: pdfDict({ Type: '/Outlines', First: pdfRef(first), Last: pdfRef(last), Count: total }) });
  return root;
}
