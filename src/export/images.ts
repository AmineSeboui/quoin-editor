import { type FetchAsset, fetchBytes } from './fetch-asset';
import { imageFormat, type ImageFormat } from './image-size';

export type LoadedImage = ImageFormat & { readonly data: Uint8Array };

export type ImageLoading = { readonly fetchAsset?: FetchAsset; readonly timeout: number; readonly concurrency: number };

async function load(url: string, loading: ImageLoading): Promise<LoadedImage | null> {
  const data = await fetchBytes(url, loading.fetchAsset, loading.timeout);
  const format = data && imageFormat(data);
  return format ? { ...format, data } : null;
}

/** Each picture of `urls` Word can show, fetched once each, at most `concurrency` at a time; null for any that failed. */
export async function loadImages(urls: Iterable<string>, loading: ImageLoading): Promise<Map<string, LoadedImage | null>> {
  const queue = [...new Set(urls)];
  const loaded = new Map<string, LoadedImage | null>();
  const worker = async () => {
    for (let url = queue.shift(); url !== undefined; url = queue.shift()) loaded.set(url, await load(url, loading));
  };
  const workers = Math.min(Math.max(1, Math.floor(loading.concurrency) || 1), queue.length);
  await Promise.all(Array.from({ length: workers }, worker));
  return loaded;
}
