// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FIXTURE_PNG } from '../../e2e/app/fixture-png';
import type { QuoinBlock } from '../engine/model/quoin-block';
import { exportDocument } from './test-support/word-document';

const EMU_PER_PIXEL = 9525;
const PAGE_WIDTH_EMU = 9026 * 635;

const fixture = () => Uint8Array.from(Buffer.from(FIXTURE_PNG.base64, 'base64'));

function pngHeader(width: number, height: number): Uint8Array {
  const bytes = fixture().slice(0, 33);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}

const image = (id: string, data: Record<string, unknown>): QuoinBlock => ({ id, type: 'IMAGE', data: { alt: `alt ${id}`, ...data } });

const extents = (xml: string) => [...xml.matchAll(/<wp:extent cx="(\d+)" cy="(\d+)"\/>/g)].map(([, cx, cy]) => [Number(cx), Number(cy)]);

afterEach(() => vi.unstubAllGlobals());

describe('the pictures of a Word document', () => {
  it('fetch the resolved address and draw the picture at its own size, described by its alt text', async () => {
    const fetchAsset = vi.fn(() => Promise.resolve(fixture()));
    const doc = await exportDocument([image('a', { storageKey: 'cover.png', caption: 'The *cover*', align: 'center' })], {
      resolveAssetUrl: (key) => `https://assets.test/${key}`,
      fetchAsset,
    });
    expect(fetchAsset).toHaveBeenCalledWith('https://assets.test/cover.png', expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(extents(doc.xml)).toEqual([[40 * EMU_PER_PIXEL, 30 * EMU_PER_PIXEL]]);
    expect(doc.xml).toContain('descr="alt a"');
    const [picture, caption] = doc.paragraphs;
    expect(picture.align).toBe('center');
    expect(picture.element.getElementsByTagName('a:blip')[0].getAttribute('r:embed')).toBe(
      doc.relationships.find((rel) => rel.getAttribute('Target') === 'media/image1.png')?.getAttribute('Id'),
    );
    expect(caption).toMatchObject({ style: 'Caption', text: 'The cover' });
    expect(caption.runs[1].props).toEqual({ i: '' });
  });

  it('scale a picture wider than the page down to the page, and to its width percent', async () => {
    const fetchAsset = (url: string) => Promise.resolve(url.endsWith('wide') ? pngHeader(4000, 1000) : pngHeader(200, 100));
    const doc = await exportDocument([image('w', { url: 'https://a.test/wide' }), image('p', { url: 'https://a.test/half', widthPercent: 50 })], {
      fetchAsset,
    });
    expect(extents(doc.xml)).toEqual([
      [PAGE_WIDTH_EMU, Math.round(PAGE_WIDTH_EMU / 4)],
      [PAGE_WIDTH_EMU / 2, Math.round(PAGE_WIDTH_EMU / 4)],
    ]);
  });

  it('draw a picture whose size it cannot read at a default size', async () => {
    const doc = await exportDocument([image('j', { url: 'https://a.test/j' })], {
      fetchAsset: () => Promise.resolve(Uint8Array.from([0xff, 0xd8, 0xff, 0xd9])),
    });
    expect(extents(doc.xml)).toEqual([[480 * EMU_PER_PIXEL, 360 * EMU_PER_PIXEL]]);
    expect(doc.entries.has('word/media/image1.jpeg')).toBe(true);
  });

  it('write the alt text in place of a picture that fails, is no picture, or has an unsafe address', async () => {
    const fetchAsset = vi.fn((url: string) => {
      if (url.endsWith('reject')) return Promise.reject(new Error('offline'));
      if (url.endsWith('missing')) return Promise.resolve(new Response('no', { status: 404 }));
      return Promise.resolve(new Blob(['<svg/>']));
    });
    const doc = await exportDocument(
      [
        image('r', { url: 'https://a.test/reject' }),
        image('m', { url: 'https://a.test/missing' }),
        image('s', { url: 'https://a.test/svg' }),
        image('u', { url: 'javascript:alert(1)' }),
        image('e', { url: 'https://a.test/reject-too', alt: '' }),
      ],
      { fetchAsset },
    );
    expect(doc.paragraphs.map(({ text }) => text)).toEqual(['alt r', 'alt m', 'alt s', 'alt u']);
    expect([...doc.entries.keys()].filter((name) => name.startsWith('word/media/'))).toEqual([]);
    expect(fetchAsset).toHaveBeenCalledTimes(4);
  });

  it('read the bytes of a response, a blob or a buffer', async () => {
    const answers = [new Response(fixture()), new Blob([fixture()]), fixture().buffer];
    const doc = await exportDocument(
      answers.map((_, at) => image(`i${at}`, { url: `https://a.test/${at}` })),
      { fetchAsset: (url) => Promise.resolve(answers[Number(url.slice(-1))]) },
    );
    expect(extents(doc.xml)).toHaveLength(3);
  });

  it('give up on a picture after the timeout, writing its alt text, and abort its fetch', async () => {
    let signal: AbortSignal | undefined;
    const doc = await exportDocument([image('slow', { url: 'https://a.test/slow' })], {
      imageTimeout: 20,
      fetchAsset: (_url, init) => {
        signal = init.signal;
        return new Promise(() => {});
      },
    });
    expect(doc.paragraphs.map(({ text }) => text)).toEqual(['alt slow']);
    expect(signal?.aborted).toBe(true);
  });

  it.each([Infinity, Number.NaN, -5, 2 ** 40])('wait for a picture with an imageTimeout of %s instead of giving up at once', async (imageTimeout) => {
    const fetchAsset = () => new Promise<Uint8Array>((resolve) => setTimeout(() => resolve(fixture()), 30));
    const doc = await exportDocument([image('late', { url: 'https://a.test/late' })], { imageTimeout, fetchAsset });
    expect(extents(doc.xml)).toHaveLength(1);
  });

  it('fetch at most a few pictures at a time', async () => {
    let inFlight = 0;
    let most = 0;
    const fetchAsset = async () => {
      inFlight++;
      most = Math.max(most, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight--;
      return fixture();
    };
    const blocks = Array.from({ length: 12 }, (_, at) => image(`i${at}`, { url: `https://a.test/${at}` }));
    const doc = await exportDocument(blocks, { fetchAsset });
    expect(most).toBe(4);
    expect(extents(doc.xml)).toHaveLength(12);
    most = 0;
    await exportDocument(blocks, { fetchAsset, imageConcurrency: 2 });
    expect(most).toBe(2);
  });

  it('fetch through the global fetch when the host gives no fetchAsset', async () => {
    const fetch = vi.fn(() => Promise.resolve(new Response(fixture())));
    vi.stubGlobal('fetch', fetch);
    const doc = await exportDocument([image('g', { url: 'https://a.test/g.png' })]);
    expect(fetch).toHaveBeenCalledWith('https://a.test/g.png', expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(extents(doc.xml)).toHaveLength(1);
  });

  it('fetch a picture used twice once', async () => {
    const fetchAsset = vi.fn(() => Promise.resolve(fixture()));
    const doc = await exportDocument([image('a', { url: 'https://a.test/same' }), image('b', { url: 'https://a.test/same' })], { fetchAsset });
    expect(fetchAsset).toHaveBeenCalledTimes(1);
    expect(extents(doc.xml)).toHaveLength(2);
    expect([...doc.entries.keys()].filter((name) => name.startsWith('word/media/'))).toEqual(['word/media/image1.png']);
  });
});
