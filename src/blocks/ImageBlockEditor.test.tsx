import { useState } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuoinProvider } from '../context';
import type { UploadFn, UploadResult } from '../types';
import { ImageBlockEditor } from './ImageBlockEditor';
import { intrinsicSize } from './intrinsic-size';
import type { IntrinsicSize } from './intrinsic-size';

vi.mock('./intrinsic-size');

const picker = vi.hoisted(() => ({
  onUploaded: undefined as ((result: UploadResult) => void | Promise<void>) | undefined,
}));

vi.mock('../upload/UploadField', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../upload/UploadField')>();
  return {
    UploadField: (props: React.ComponentProps<typeof actual.UploadField>) => {
      picker.onUploaded = props.onUploaded;
      return <actual.UploadField {...props} />;
    },
  };
});

type Data = Record<string, unknown>;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

const settled = (...pending: Promise<void>[]) => act(async () => { await Promise.all(pending); });

const result = (storageKey: string): UploadResult => ({ storageKey, filename: `${storageKey}.png`, size: 1 });

function setup(upload?: UploadFn, initial: Data = { storageKey: '', alt: '', caption: '' }) {
  const writes: Data[] = [];
  function Harness() {
    const [data, setData] = useState<Data>(initial);
    return (
      <ImageBlockEditor
        data={data}
        onChange={(next) => {
          writes.push(next);
          setData(next);
        }}
      />
    );
  }
  render(
    <QuoinProvider value={{ blockTypes: [], upload, resolveAssetUrl: (key) => `/cdn/${key}` }}>
      <Harness />
    </QuoinProvider>,
  );
  return { writes, last: () => writes[writes.length - 1] };
}

const measuring = () => {
  const pending = new Map<string, ReturnType<typeof deferred<IntrinsicSize | null>>>();
  vi.mocked(intrinsicSize).mockImplementation((src) => {
    const entry = deferred<IntrinsicSize | null>();
    pending.set(src, entry);
    return entry.promise;
  });
  return (key: string, size: IntrinsicSize | null) => pending.get(`/cdn/${key}`)!.resolve(size);
};

describe('ImageBlockEditor', () => {
  it('records the key as soon as the upload resolves, then adds the measured size', async () => {
    const user = userEvent.setup();
    const finishMeasuring = measuring();
    const { writes, last } = setup(vi.fn().mockResolvedValue(result('a')));
    await user.upload(screen.getByLabelText('Upload image'), new File(['x'], 'a.png', { type: 'image/png' }));
    await waitFor(() => expect(last()).toMatchObject({ storageKey: 'a' }));
    expect(last()).not.toHaveProperty('width');
    finishMeasuring('a', { width: 40, height: 30 });
    await waitFor(() => expect(last()).toMatchObject({ storageKey: 'a', width: 40, height: 30 }));
    expect(writes).toHaveLength(2);
  });

  it('ends with the second key and its size when the measurements finish out of order', async () => {
    const finishMeasuring = measuring();
    const { last } = setup();
    let first!: Promise<void>;
    let second!: Promise<void>;
    act(() => {
      first = Promise.resolve(picker.onUploaded!(result('a')));
      second = Promise.resolve(picker.onUploaded!(result('b')));
    });
    finishMeasuring('b', { width: 20, height: 10 });
    await settled(second);
    finishMeasuring('a', { width: 99, height: 99 });
    await settled(first);
    expect(last()).toMatchObject({ storageKey: 'b', width: 20, height: 10 });
  });

  it('never lets a slow measurement for the first key overwrite the second', async () => {
    const finishMeasuring = measuring();
    const { writes, last } = setup();
    let first!: Promise<void>;
    let second!: Promise<void>;
    act(() => {
      first = Promise.resolve(picker.onUploaded!(result('a')));
      second = Promise.resolve(picker.onUploaded!(result('b')));
    });
    finishMeasuring('a', { width: 99, height: 99 });
    await settled(first);
    expect(writes.filter((w) => w.width === 99)).toEqual([]);
    expect(last()).toMatchObject({ storageKey: 'b' });
    finishMeasuring('b', { width: 20, height: 10 });
    await settled(second);
    expect(last()).toMatchObject({ storageKey: 'b', width: 20, height: 10 });
  });

  it('keeps alt text typed while the measurement is still running', async () => {
    const user = userEvent.setup();
    const finishMeasuring = measuring();
    const { last } = setup();
    let pending!: Promise<void>;
    act(() => {
      pending = Promise.resolve(picker.onUploaded!(result('a')));
    });
    await user.type(screen.getByLabelText('Image alt text'), 'A cat');
    finishMeasuring('a', { width: 40, height: 30 });
    await settled(pending);
    expect(last()).toMatchObject({ storageKey: 'a', alt: 'A cat', width: 40, height: 30 });
  });

  it('drops the previous size when a replacement cannot be measured', async () => {
    const finishMeasuring = measuring();
    const { writes, last } = setup(undefined, { storageKey: 'old', alt: 'A cat', caption: '', width: 40, height: 30 });
    let pending!: Promise<void>;
    act(() => {
      pending = Promise.resolve(picker.onUploaded!(result('a')));
    });
    expect(writes[0]).toEqual({ storageKey: 'a', alt: 'A cat', caption: '' });
    finishMeasuring('a', null);
    await settled(pending);
    expect(last()).toEqual({ storageKey: 'a', alt: 'A cat', caption: '' });
  });

  it('says the image is attached in plain text', async () => {
    vi.mocked(intrinsicSize).mockResolvedValue(null);
    setup();
    expect(screen.queryByText(/image attached/i)).toBeNull();
    act(() => {
      void picker.onUploaded!(result('a'));
    });
    expect(await screen.findByText('Image attached')).toBeInTheDocument();
  });
});
