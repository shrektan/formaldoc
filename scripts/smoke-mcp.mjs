import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';

const transport = new StdioClientTransport({
  command: 'node',
  args: ['/Users/shrektan/dev/formaldoc/mcp/dist/mcp/server.js'],
  cwd: '/Users/shrektan/dev/formaldoc',
  stderr: 'pipe',
});

if (transport.stderr) {
  transport.stderr.on('data', (chunk) => {
    process.stderr.write(chunk);
  });
}

const client = new Client(
  {
    name: 'formaldoc-smoke-test',
    version: '1.0.0',
  },
  {
    capabilities: {},
  }
);

async function main() {
  const sandboxDir = await mkdtemp(join(tmpdir(), 'formaldoc-mcp-'));

  try {
    await client.connect(transport);

    const { tools } = await client.listTools();
    const textTool = tools.find((tool) => tool.name === 'convert_markdown_text_to_docx');
    const fileTool = tools.find((tool) => tool.name === 'convert_markdown_file_to_docx');

    assert(textTool, 'convert_markdown_text_to_docx tool is missing');
    assert(fileTool, 'convert_markdown_file_to_docx tool is missing');

    const textToolProperties = textTool.inputSchema.properties ?? {};
    const fileToolProperties = fileTool.inputSchema.properties ?? {};

    assert('filename' in textToolProperties, 'text tool schema must expose filename alias');
    assert('filename' in fileToolProperties, 'file tool schema must expose filename alias');

    const markdownFile = join(sandboxDir, 'sample.md');
    await writeFile(markdownFile, '# 测试文档\n\n这是一段中文内容。', 'utf8');

    const textResult = await client.callTool(
      {
        name: 'convert_markdown_text_to_docx',
        arguments: {
          content: '# 测试文档\n\n这是一段中文内容。',
          filename: 'text-export',
        },
      },
      CallToolResultSchema
    );

    assert.notEqual(textResult.isError, true, 'text export should succeed');
    assert(
      textResult.content.some((item) => item.type === 'resource_link'),
      'text export must return a resource_link block'
    );

    const textStructured = textResult.structuredContent;
    assert.equal(textStructured.template, 'cn-gov', 'Chinese markdown should default to cn-gov');
    assert(
      textStructured.outputPath.endsWith('text-export.docx'),
      `expected outputPath to end with text-export.docx, got ${textStructured.outputPath}`
    );

    const fileResult = await client.callTool(
      {
        name: 'convert_markdown_file_to_docx',
        arguments: {
          inputPath: markdownFile,
          filename: 'file-export',
        },
      },
      CallToolResultSchema
    );

    assert.notEqual(fileResult.isError, true, 'file export should succeed');
    assert(
      fileResult.content.some((item) => item.type === 'resource_link'),
      'file export must return a resource_link block'
    );

    const fileStructured = fileResult.structuredContent;
    assert.equal(fileStructured.template, 'cn-gov', 'Chinese file should default to cn-gov');
    assert(
      fileStructured.outputPath.endsWith('file-export.docx'),
      `expected outputPath to end with file-export.docx, got ${fileStructured.outputPath}`
    );

    console.log('FormalDoc MCP smoke test passed.');
  } finally {
    await client.close().catch(() => {});
    await transport.close().catch(() => {});
    await rm(sandboxDir, { recursive: true, force: true }).catch(() => {});
  }
}

main().catch((error) => {
  console.error('FormalDoc MCP smoke test failed.');
  console.error(error);
  process.exit(1);
});
