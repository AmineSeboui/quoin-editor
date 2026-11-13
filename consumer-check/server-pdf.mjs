import { readFileSync, writeFileSync } from 'node:fs';
import { toPdf } from 'quoin-editor/pdf';

const errors = [];
if (typeof window !== 'undefined' || typeof document !== 'undefined') errors.push('This process has a DOM.');

const blocks = [
  { id: 'title', type: 'MARKDOWN', data: { markdown: '# Exported without a browser' } },
  { id: 'item', type: 'MARKDOWN', data: { markdown: '- A [link](https://quoin.dev) and **bold** text' } },
  { id: 'code', type: 'CODE', data: { language: 'ts', code: 'const answer = 42;' } },
  { id: 'table', type: 'TABLE', data: { rows: [['Name', 'Role'], ['Ada', 'Author']], header: true } },
];

const problems = [];
const blob = await toPdf(blocks, { title: 'Consumer check', onProblem: (problem) => problems.push(problem) });
writeFileSync('consumer.pdf', new Uint8Array(await blob.arrayBuffer()));
const written = readFileSync('consumer.pdf');
if (written.subarray(0, 8).toString('latin1') !== '%PDF-1.7') errors.push('The written file is no PDF.');
if (!written.subarray(-6).toString('latin1').startsWith('%%EOF')) errors.push('The written file has no end of file marker.');
if (blob.type !== 'application/pdf') errors.push(`Blob type ${blob.type}.`);
if (written.length < 1000) errors.push(`The written file has ${written.length} bytes only.`);
if (problems.length > 0) errors.push(`Problems reported: ${JSON.stringify(problems)}.`);
if (errors.length > 0) {
  process.stderr.write(`${errors.join('\n')}\n`);
  process.exit(1);
}
