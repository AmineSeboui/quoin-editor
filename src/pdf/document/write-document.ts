import type { Heading } from '../../engine/render/headings';
import { createObjectTable, flateStream, type ObjectTable } from '../file/object-table';
import { pdfFile } from '../file/pdf-file';
import { pdfArray, pdfDict, pdfRef, pdfText } from '../file/pdf-syntax';
import { fontObject } from '../font/font-objects';
import { imageObject } from '../image/image-object';
import type { PageGeometry, Pagination } from '../layout/paginate';
import { linkObject } from './link-object';
import { outlineObject } from './outline';

export type DocumentParts = {
  readonly pagination: Pagination;
  readonly geometry: PageGeometry;
  readonly headings: readonly Heading[];
  readonly title?: string;
};

async function resourcesObject({ resources }: Pagination, table: ObjectTable): Promise<number> {
  const fonts: Record<string, string> = {};
  for (const [face, name] of resources.fonts) fonts[name] = pdfRef(await fontObject(face, table));
  const images: Record<string, string> = {};
  for (const [image, name] of resources.images) images[name] = pdfRef(await imageObject(image, table));
  return table.add({
    value: pdfDict({ Font: pdfDict(fonts), XObject: resources.images.size > 0 ? pdfDict(images) : undefined }),
  });
}

/** The PDF of paginated pages: its catalog, page tree, resources, links, outline and properties. */
export async function writeDocument({ pagination, geometry, headings, title }: DocumentParts): Promise<Uint8Array> {
  const table = createObjectTable();
  const catalog = table.reserve();
  const tree = table.reserve();
  const resources = await resourcesObject(pagination, table);
  const pageIds = pagination.pages.map(() => table.reserve());
  const destination = (blockId: string) => {
    const anchor = pagination.anchors.get(blockId);
    return anchor && pdfArray([pdfRef(pageIds[anchor.page]), '/XYZ', 0, geometry.height - anchor.top, 'null']);
  };
  for (const [index, canvas] of pagination.pages.entries()) {
    const contents = table.add(await flateStream({}, new TextEncoder().encode(canvas.content())));
    const links = canvas.links.flatMap((area) => linkObject(area, destination) ?? []).map((link) => pdfRef(table.add(link)));
    const page = {
      Type: '/Page',
      Parent: pdfRef(tree),
      MediaBox: pdfArray([0, 0, geometry.width, geometry.height]),
      Resources: pdfRef(resources),
      Contents: pdfRef(contents),
      Annots: links.length > 0 ? pdfArray(links) : undefined,
    };
    table.set(pageIds[index], { value: pdfDict(page) });
  }
  table.set(tree, { value: pdfDict({ Type: '/Pages', Kids: pdfArray(pageIds.map(pdfRef)), Count: pageIds.length }) });
  const outline = outlineObject(headings, table, destination);
  const preferences = title ? pdfDict({ DisplayDocTitle: 'true' }) : undefined;
  table.set(catalog, { value: pdfDict({ Type: '/Catalog', Pages: pdfRef(tree), Outlines: outline && pdfRef(outline), ViewerPreferences: preferences }) });
  const info = table.add({ value: pdfDict({ Title: title ? pdfText(title) : undefined, Producer: pdfText('quoin-editor') }) });
  return pdfFile(table.objects(), { Root: pdfRef(catalog), Info: pdfRef(info) });
}
