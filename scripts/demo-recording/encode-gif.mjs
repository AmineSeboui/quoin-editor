import { createRequire } from 'node:module';

const { GIFEncoder, applyPalette, quantize } = createRequire(import.meta.url)('gifenc');
const TRANSPARENT = 255;
const SAMPLED_FRAMES = 24;

const samePixels = (a, b) => a.length === b.length && Buffer.compare(Buffer.from(a.buffer, a.byteOffset, a.length), Buffer.from(b.buffer, b.byteOffset, b.length)) === 0;

/** Joins runs of identical frames into one frame shown for their summed delay. */
export function mergeStills(frames) {
  return frames.reduce((merged, frame) => {
    const last = merged.at(-1);
    if (last && samePixels(last.rgba, frame.rgba)) last.delay += frame.delay;
    else merged.push({ ...frame });
    return merged;
  }, []);
}

function sharedPalette(frames) {
  const step = Math.max(1, Math.floor(frames.length / SAMPLED_FRAMES));
  const sampled = frames.filter((_, index) => index % step === 0);
  const sample = new Uint8Array(sampled.reduce((size, { rgba }) => size + rgba.length, 0));
  sampled.reduce((offset, { rgba }) => (sample.set(rgba, offset), offset + rgba.length), 0);
  return quantize(sample, TRANSPARENT);
}

function hideUnchanged(index, rgba, previous) {
  for (let pixel = 0; pixel < index.length; pixel += 1) {
    const at = pixel * 4;
    if (rgba[at] === previous[at] && rgba[at + 1] === previous[at + 1] && rgba[at + 2] === previous[at + 2]) {
      index[pixel] = TRANSPARENT;
    }
  }
}

/**
 * Encodes RGBA frames, each with its delay in milliseconds, as a looping GIF with one shared palette.
 * Every frame after the first draws only the pixels that changed and leaves the rest of the previous frame in place.
 */
export function encodeGif(frames, width, height) {
  const stills = mergeStills(frames);
  const colours = sharedPalette(stills);
  const palette = [...colours, ...Array.from({ length: TRANSPARENT + 1 - colours.length }, () => [0, 0, 0])];
  const gif = GIFEncoder();
  stills.forEach(({ rgba, delay }, position) => {
    const index = applyPalette(rgba, colours);
    if (position > 0) hideUnchanged(index, rgba, stills[position - 1].rgba);
    gif.writeFrame(index, width, height, {
      palette: position === 0 ? palette : undefined,
      delay,
      repeat: 0,
      dispose: 1,
      transparent: position > 0,
      transparentIndex: TRANSPARENT,
    });
  });
  gif.finish();
  return { bytes: gif.bytes(), frames: stills.length, duration: stills.reduce((total, { delay }) => total + delay, 0) };
}
