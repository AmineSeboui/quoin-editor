/** Reads the picture at an address; the export aborts `signal` once it stops waiting. */
export type FetchAsset = (url: string, init: { signal: AbortSignal }) => Promise<Response | Blob | ArrayBuffer | Uint8Array>;

async function bytesOf(answer: Response | Blob | ArrayBuffer | Uint8Array): Promise<Uint8Array> {
  if (answer instanceof Uint8Array) return answer;
  if (answer instanceof ArrayBuffer) return new Uint8Array(answer);
  if ('ok' in answer && !answer.ok) throw new Error(`status ${answer.status}`);
  return new Uint8Array(await answer.arrayBuffer());
}

const defaultFetch: FetchAsset = (url, init) => fetch(url, init);

/** The longest wait a timer can hold, about 24.8 days; a longer, infinite, negative or NaN timeout waits this long. */
const LONGEST_WAIT = 2_147_483_647;

const waitOf = (timeout: number) => (timeout >= 0 && timeout <= LONGEST_WAIT ? timeout : LONGEST_WAIT);

/** The bytes at `url`, or null when the fetch fails or takes longer than `timeout` milliseconds. */
export async function fetchBytes(
  url: string,
  fetchAsset: FetchAsset = defaultFetch,
  timeout: number,
): Promise<Uint8Array | null> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve(null);
    }, waitOf(timeout));
  });
  const read = (async () => bytesOf(await fetchAsset(url, { signal: controller.signal })))();
  try {
    return await Promise.race([read, expired]);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    read.catch(() => undefined);
  }
}
