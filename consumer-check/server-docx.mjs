import { readFileSync, writeFileSync } from 'node:fs';
import { toDocx } from 'quoin-editor/docx';

const errors = [];
if (typeof window !== 'undefined' || typeof document !== 'undefined') errors.push('This process has a DOM.');

const blocks = [
  { id: 'title', type: 'MARKDOWN', data: { markdown: '# Exported without a browser' } },
  { id: 'item', type: 'MARKDOWN', data: { markdown: '- A [link](https://quoin.dev) and **bold** text' } },
  { id: 'code', type: 'CODE', data: { language: 'ts', code: 'const answer = 42;' } },
  { id: 'table', type: 'TABLE', data: { rows: [['Name', 'Role'], ['Ada', 'Author']], header: true } },
];

const blob = await toDocx(blocks, { title: 'Consumer check' });
writeFileSync('consumer.docx', new Uint8Array(await blob.arrayBuffer()));
const written = readFileSync('consumer.docx');
if (written.subarray(0, 2).toString('latin1') !== 'PK') errors.push('The written file is no zip archive.');
if (blob.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') errors.push(`Blob type ${blob.type}.`);
if (written.length < 1000) errors.push(`The written file has ${written.length} bytes only.`);
if (errors.length > 0) {
  process.stderr.write(`${errors.join('\n')}\n`);
  process.exit(1);
}
