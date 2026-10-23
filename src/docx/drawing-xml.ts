import { optionalNumber } from '../engine/blocks/data-fields';
import type { BlockAttrs } from '../engine/model/types';
import type { PlacedImage } from './docx-context';
import { xmlElement } from './xml';

const EMU_PER_PIXEL = 9525;
const EMU_PER_TWIP = 635;
export const PAGE_TEXT_WIDTH = 9026;
const PAGE_WIDTH_EMU = PAGE_TEXT_WIDTH * EMU_PER_TWIP;
const DEFAULT_SIZE = { width: 480, height: 360 };

const PICTURE = 'http://schemas.openxmlformats.org/drawingml/2006/picture';
const DRAWING = 'http://schemas.openxmlformats.org/drawingml/2006/main';

function pixelSize({ image }: PlacedImage, attrs: BlockAttrs) {
  if (image.width && image.height) return { width: image.width, height: image.height };
  const width = optionalNumber(attrs.width);
  const height = optionalNumber(attrs.height);
  return width && height && width > 0 && height > 0 ? { width, height } : DEFAULT_SIZE;
}

// A width percent sizes the picture to that share of the text width; otherwise it keeps its own size, down to fit.
function extent(place: PlacedImage, attrs: BlockAttrs): { cx: number; cy: number } {
  const { width, height } = pixelSize(place, attrs);
  const percent = optionalNumber(attrs.widthPercent);
  const own = width * EMU_PER_PIXEL;
  const share = percent && percent > 0 && percent <= 100 ? (PAGE_WIDTH_EMU * percent) / 100 : undefined;
  const cx = Math.round(share ?? Math.min(own, PAGE_WIDTH_EMU));
  return { cx, cy: Math.round((cx * height) / width) };
}

/** A run drawing a picture inline, described by its alt text. */
export function drawingXml(place: PlacedImage, attrs: BlockAttrs, alt: string, id: number): string {
  const { cx, cy } = extent(place, attrs);
  const size = { cx, cy };
  const picture = xmlElement(
    'pic:pic',
    { 'xmlns:pic': PICTURE },
    xmlElement('pic:nvPicPr', {}, xmlElement('pic:cNvPr', { id, name: place.name }) + xmlElement('pic:cNvPicPr')) +
      xmlElement('pic:blipFill', {}, xmlElement('a:blip', { 'r:embed': place.rId }) + '<a:stretch><a:fillRect/></a:stretch>') +
      xmlElement(
        'pic:spPr',
        {},
        xmlElement('a:xfrm', {}, xmlElement('a:off', { x: 0, y: 0 }) + xmlElement('a:ext', size)) +
          '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>',
      ),
  );
  const inline = xmlElement(
    'wp:inline',
    { distT: 0, distB: 0, distL: 0, distR: 0 },
    xmlElement('wp:extent', size) +
      xmlElement('wp:docPr', { id, name: `Picture ${id}`, descr: alt || undefined }) +
      xmlElement('a:graphic', { 'xmlns:a': DRAWING }, xmlElement('a:graphicData', { uri: PICTURE }, picture)),
  );
  return xmlElement('w:r', {}, xmlElement('w:drawing', {}, inline));
}
