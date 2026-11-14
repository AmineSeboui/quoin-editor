import type { QuoinBlock } from '../../engine/model/quoin-block';
import { toPdf, type PdfOptions, type PdfProblem } from '../index';
import { pageContent, pageText, type PageContent } from './page-content';
import { PdfName, PdfString, type PdfDict, type PdfValue } from './parse-pdf';
import { readPdf, type PdfFile } from './read-pdf';

export type PdfLink = { readonly rect: number[]; readonly uri?: string; readonly page?: number; readonly top?: number };

export type ExportedPdf = {
  readonly blob: Blob;
  readonly file: PdfFile;
  readonly bytes: Uint8Array;
  readonly pages: PageContent[];
  readonly text: string;
  readonly links: PdfLink[][];
  readonly problems: PdfProblem[];
  /** The font of each resource name of the first page, by its base font name. */
  fonts(): Map<string, PdfDict>;
  /** The text of the shows whose text includes `text`, with where they are. */
  shows(text: string): PageContent['shows'];
};

const latin1 = (value: PdfValue | undefined) => (value instanceof PdfString ? new TextDecoder('latin1').decode(value.bytes) : undefined);

function linksOf(file: PdfFile, page: PdfDict): PdfLink[] {
  const pageIds = file.pages.map((each) => [...file.objects].find(([, entry]) => entry.value === each)?.[0]);
  return ((page.Annots as PdfValue[] | undefined) ?? []).map((ref) => {
    const annot = file.dict(ref);
    const rect = (annot.Rect as number[]).map(Number);
    const action = annot.A ? file.dict(annot.A) : undefined;
    if (action) return { rect, uri: latin1(action.URI) };
    const [target, , , top] = annot.Dest as PdfValue[];
    return { rect, page: pageIds.indexOf((target as { id: number }).id), top: Number(top) };
  });
}

/** Exports blocks and reads the file back: its pages, what each draws, its links and the problems it reported. */
export async function exportPdf(blocks: readonly QuoinBlock[], options: PdfOptions = {}): Promise<ExportedPdf> {
  const problems: PdfProblem[] = [];
  const blob = await toPdf(blocks, { ...options, onProblem: (problem) => problems.push(problem) });
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const file = readPdf(bytes);
  const pages = file.pages.map((_, index) => pageContent(file, index));
  return {
    blob,
    file,
    bytes,
    pages,
    text: file.pages.map((_, index) => pageText(file, index)).join('\n'),
    links: file.pages.map((page) => linksOf(file, page)),
    problems,
    fonts() {
      const fonts = file.dict(file.dict(file.pages[0].Resources).Font);
      return new Map(Object.values(fonts).map((ref) => [(file.dict(ref).BaseFont as PdfName).name, file.dict(ref)]));
    },
    shows: (text) => pages.flatMap((page) => page.shows.filter((show) => show.text.includes(text))),
  };
}

export { PdfName };
