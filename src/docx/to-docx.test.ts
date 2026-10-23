// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { FIXTURE_PNG } from '../../e2e/app/fixture-png';
import { everyBlockDocument } from '../view-static/test-support/every-block-document';
import { textOf } from './test-support/unzip';
import { exportDocument, xmlError } from './test-support/word-document';

const png = () => Promise.resolve(Uint8Array.from(Buffer.from(FIXTURE_PNG.base64, 'base64')));
const options = { resolveAssetUrl: (key: string) => `https://assets.test/${key}`, fetchAsset: png, title: 'Every <block>' };

const WORD = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

describe('toDocx', () => {
  it('runs in a process with no DOM', () => {
    expect(typeof document).toBe('undefined');
    expect(typeof window).toBe('undefined');
  });

  it('writes a Word document with every part it needs', async () => {
    const doc = await exportDocument(everyBlockDocument, options);
    expect(doc.blob.type).toBe(WORD);
    expect([...doc.entries.keys()]).toEqual([
      '[Content_Types].xml',
      '_rels/.rels',
      'docProps/core.xml',
      'word/document.xml',
      'word/styles.xml',
      'word/numbering.xml',
      'word/_rels/document.xml.rels',
      'word/media/image1.png',
      'word/media/image2.png',
    ]);
    expect([...doc.entries.get('word/media/image1.png')!.data]).toEqual([...(await png())]);
  });

  it('writes every XML part well-formed, with its declaration', async () => {
    const { entries } = await exportDocument(everyBlockDocument, options);
    const parts = [...entries.keys()].filter((name) => /\.(?:xml|rels)$/.test(name));
    expect(parts).toHaveLength(7);
    for (const name of parts) {
      const xml = textOf(entries, name);
      expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'), name).toBe(true);
      expect(xmlError(xml), name).toBeNull();
    }
  });

  it('declares the type of every part and of the pictures, and relates the parts to each other', async () => {
    const { entries } = await exportDocument(everyBlockDocument, options);
    const types = textOf(entries, '[Content_Types].xml');
    expect(types).toContain('<Default Extension="png" ContentType="image/png"/>');
    for (const part of ['/word/document.xml', '/word/styles.xml', '/word/numbering.xml', '/docProps/core.xml']) {
      expect(types).toContain(`PartName="${part}"`);
    }
    const rels = textOf(entries, '_rels/.rels');
    expect(rels).toContain('Target="word/document.xml"');
    expect(rels).toContain('Target="docProps/core.xml"');
    const documentRels = textOf(entries, 'word/_rels/document.xml.rels');
    expect(documentRels).toContain('Target="styles.xml"');
    expect(documentRels).toContain('Target="numbering.xml"');
    expect(documentRels).toContain('Target="media/image1.png"');
  });

  it('writes the title, escaped, into the document properties', async () => {
    const { entries } = await exportDocument(everyBlockDocument, options);
    expect(textOf(entries, 'docProps/core.xml')).toContain('<dc:title>Every &lt;block&gt;</dc:title>');
    const untitled = await exportDocument([]);
    expect(textOf(untitled.entries, 'docProps/core.xml')).not.toContain('dc:title');
  });

  it('writes an empty document as one empty paragraph, which Word needs', async () => {
    const doc = await exportDocument([]);
    expect(doc.paragraphs.map(({ text }) => text)).toEqual(['']);
    expect(doc.body.lastElementChild?.tagName).toBe('w:sectPr');
  });

  it('writes the same archive for the same document', async () => {
    const first = await exportDocument(everyBlockDocument, options);
    const second = await exportDocument(everyBlockDocument, options);
    expect(new Uint8Array(await first.blob.arrayBuffer())).toEqual(new Uint8Array(await second.blob.arrayBuffer()));
  });
});
