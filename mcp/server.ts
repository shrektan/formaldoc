#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import packageJson from '../package.json';
import {
  convertMarkdownToDocxFile,
  ensureDocxExtension,
  getAvailableTemplateSummaries,
} from '../src/lib/node/docx';

const server = new McpServer(
  {
    name: 'formaldoc',
    version: packageJson.version,
  },
  {
    capabilities: {
      logging: {},
    },
  }
);

server.registerTool(
  'list_docx_templates',
  {
    title: 'List FormalDoc Templates',
    description: 'List all available FormalDoc template presets for DOCX export.',
    outputSchema: {
      templates: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          nameEn: z.string(),
          description: z.string(),
          descriptionEn: z.string(),
          category: z.enum(['chinese', 'english']),
        })
      ),
    },
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
    },
  },
  async () => {
    const templates = getAvailableTemplateSummaries();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(templates, null, 2),
        },
      ],
      structuredContent: {
        templates,
      },
    };
  }
);

server.registerTool(
  'convert_to_docx',
  {
    title: 'Convert Markdown to DOCX',
    description:
      'Convert Markdown content into a formatted .docx file using a FormalDoc template. If outputPath is omitted, the file is saved under formaldoc-exports in the server working directory.',
    inputSchema: {
      content: z
        .string()
        .min(1)
        .describe('Markdown content to convert into a Word document.'),
      template: z
        .string()
        .optional()
        .describe('Optional template name such as cn-gov, cn-general, en-standard, or en-legal.'),
      outputPath: z
        .string()
        .optional()
        .describe('Optional absolute or relative output path for the generated .docx file.'),
      fileName: z
        .string()
        .optional()
        .describe('Optional file name to use when outputPath is omitted. The .docx extension is added automatically.'),
    },
    outputSchema: {
      outputPath: z.string(),
      template: z.string(),
      fileSize: z.number(),
      title: z.string().nullable(),
    },
    annotations: {
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  async ({ content, template, outputPath, fileName }) => {
    try {
      const result = await convertMarkdownToDocxFile({
        markdown: content,
        templateName: template,
        outputPath: outputPath ? ensureDocxExtension(outputPath) : undefined,
        fileName,
      });

      return {
        content: [
          {
            type: 'text',
            text: `Created DOCX at ${result.outputPath} using template ${result.templateName}.`,
          },
        ],
        structuredContent: {
          outputPath: result.outputPath,
          template: result.templateName,
          fileSize: result.fileSize,
          title: result.title,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown conversion error.';

      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Failed to create DOCX: ${message}`,
          },
        ],
      };
    }
  }
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('FormalDoc MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal MCP server error:', error);
  process.exit(1);
});
