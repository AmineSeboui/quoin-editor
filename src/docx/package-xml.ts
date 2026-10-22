import type { Media, Relationship } from './docx-context';
import { escapeXml, XML_DECLARATION, xmlElement } from './xml';

const RELATIONSHIPS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const OFFICE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const WORD = 'application/vnd.openxmlformats-officedocument.wordprocessingml';
const CORE_PROPERTIES = 'http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties';

const relationshipsXml = (items: readonly { Id: string; Type: string; Target: string; TargetMode?: string }[]) =>
  XML_DECLARATION +
  xmlElement('Relationships', { xmlns: RELATIONSHIPS }, items.map((item) => xmlElement('Relationship', item)).join(''));

/** The content type of every part, and of every kind of picture in the document. */
export function contentTypesXml(media: readonly Media[]): string {
  const pictures = [...new Map(media.map(({ extension, type }) => [extension, type]))];
  const defaults = [
    ['rels', 'application/vnd.openxmlformats-package.relationships+xml'],
    ['xml', 'application/xml'],
    ...pictures,
  ].map(([Extension, ContentType]) => xmlElement('Default', { Extension, ContentType }));
  const overrides = [
    ['/word/document.xml', `${WORD}.document.main+xml`],
    ['/word/styles.xml', `${WORD}.styles+xml`],
    ['/word/numbering.xml', `${WORD}.numbering+xml`],
    ['/docProps/core.xml', 'application/vnd.openxmlformats-package.core-properties+xml'],
  ].map(([PartName, ContentType]) => xmlElement('Override', { PartName, ContentType }));
  const types = 'http://schemas.openxmlformats.org/package/2006/content-types';
  return XML_DECLARATION + xmlElement('Types', { xmlns: types }, [...defaults, ...overrides].join(''));
}

export const packageRelationshipsXml = (): string =>
  relationshipsXml([
    { Id: 'rId1', Type: `${OFFICE}/officeDocument`, Target: 'word/document.xml' },
    { Id: 'rId2', Type: CORE_PROPERTIES, Target: 'docProps/core.xml' },
  ]);

/** The relationships of the main part: its styles and numbering, then each link and picture its body names. */
export const documentRelationshipsXml = (relationships: readonly Relationship[]): string =>
  relationshipsXml([
    { Id: 'rId1', Type: `${OFFICE}/styles`, Target: 'styles.xml' },
    { Id: 'rId2', Type: `${OFFICE}/numbering`, Target: 'numbering.xml' },
    ...relationships.map(({ id, kind, target }) => ({
      Id: id,
      Type: `${OFFICE}/${kind}`,
      Target: target,
      TargetMode: kind === 'hyperlink' ? 'External' : undefined,
    })),
  ]);

/** The document properties, with its title when it has one. */
export function corePropertiesXml(title: string | undefined): string {
  const attrs = {
    'xmlns:cp': 'http://schemas.openxmlformats.org/package/2006/metadata/core-properties',
    'xmlns:dc': 'http://purl.org/dc/elements/1.1/',
    'xmlns:dcterms': 'http://purl.org/dc/terms/',
  };
  const inner = title ? xmlElement('dc:title', {}, escapeXml(title)) : '';
  return XML_DECLARATION + xmlElement('cp:coreProperties', attrs, inner);
}
