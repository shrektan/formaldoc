import { writeFile } from 'node:fs/promises';
import { convertMarkdownToDocx } from 'formaldoc';

const markdown = process.argv[2];
const templateName = process.argv[3] || 'cn-gov';
const outputPath = process.argv[4] || 'output.docx';

if (!markdown) {
  console.error('Usage: node export-to-docx.mjs <markdown> [templateName] [outputPath]');
  process.exit(1);
}

const result = await convertMarkdownToDocx({
  markdown,
  templateName,
});

await writeFile(outputPath, result.buffer);
console.log(`Created ${outputPath} using template ${result.templateName}`);
