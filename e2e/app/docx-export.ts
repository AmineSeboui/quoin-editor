import { toDocx } from 'quoin-editor/docx';
import { everyBlock } from './every-block-doc';
import { fixtureDataUrl } from './fixture-png';

window.__quoinDocx = async () => {
  const blob = await toDocx(everyBlock, { title: 'Every block', resolveAssetUrl: () => fixtureDataUrl });
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return { size: blob.size, type: blob.type, head: [...bytes.subarray(0, 4)], bytes: [...bytes] };
};
