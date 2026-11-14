import { toPdf } from 'quoin-editor/pdf';
import { everyBlock } from './every-block-doc';
import { fixtureDataUrl } from './fixture-png';

window.__quoinPdf = async () => {
  const problems: unknown[] = [];
  const blob = await toPdf(everyBlock, {
    title: 'Every block',
    resolveAssetUrl: () => fixtureDataUrl,
    onProblem: (problem) => problems.push(problem),
  });
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return { size: blob.size, type: blob.type, bytes: [...bytes], problems };
};
