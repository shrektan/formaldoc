#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  convertMarkdownToDocxFile,
  ensureDocxExtension,
  getAvailableTemplateSummaries,
  toFileUri,
} from '../src/lib/node/docx.js';

const SERVER_VERSION = '1.14.6';

const server = new McpServer(
  {
    name: 'formaldoc',
    version: SERVER_VERSION,
  },
  {
    capabilities: {
      logging: {},
    },
  }
);

const convertOutputSchema = {
  outputPath: z.string(),
  template: z.string(),
  fileSize: z.number(),
  title: z.string().nullable(),
  sourcePath: z.string().nullable(),
};

async function resolveTemplateSelection(template?: string): Promise<string | null> {
  if (template?.trim()) {
    return template.trim();
  }

  const templates = getAvailableTemplateSummaries();
  const result = await server.server.elicitInput({
    mode: 'form',
    message: 'Choose a FormalDoc template before generating the DOCX file.',
    requestedSchema: {
      type: 'object',
      properties: {
        template: {
          type: 'string',
          title: 'Template',
          description: 'Select the formatting template to use for DOCX export.',
          oneOf: templates.map((item) => ({
            const: item.id,
            title: `${item.id} - ${item.name}`,
            description: item.description || item.descriptionEn,
          })),
        },
      },
      required: ['template'],
    },
  });

  if (result.action !== 'accept' || !result.content?.template) {
    return null;
  }

  return String(result.content.template);
}

async function createDocxResult(params: {
  markdown?: string;
  inputPath?: string;
  template?: string;
  outputPath?: string;
  fileName?: string;
}) {
  const selectedTemplate = await resolveTemplateSelection(params.template);
  if (!selectedTemplate) {
    return {
      isError: true,
      content: [
        {
          type: 'text' as const,
          text: 'DOCX generation cancelled because no template was selected.',
        },
      ],
    };
  }

  const result = await convertMarkdownToDocxFile({
    markdown: params.markdown,
    inputPath: params.inputPath,
    templateName: selectedTemplate,
    outputPath: params.outputPath ? ensureDocxExtension(params.outputPath) : undefined,
    fileName: params.fileName,
  });

  return {
    content: [
      {
        type: 'text' as const,
        text: `Created DOCX at ${result.outputPath} using template ${result.templateName}.`,
      },
      {
        type: 'resource' as const,
        resource: {
          uri: toFileUri(result.outputPath),
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          blob: result.buffer.toString('base64'),
        },
      },
    ],
    structuredContent: {
      outputPath: result.outputPath,
      template: result.templateName,
      fileSize: result.fileSize,
      title: result.title,
      sourcePath: result.sourcePath,
    },
  };
}

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
  'convert_markdown_text_to_docx',
  {
    title: 'Convert Markdown Text to DOCX',
    description:
      'Convert Markdown text passed directly in the tool call into a formatted .docx file. Use this only when the markdown is not already stored in a local file.',
    inputSchema: {
      content: z.string().min(1).describe('Markdown content to convert into a Word document.'),
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
        .describe(
          'Optional file name to use when outputPath is omitted. The .docx extension is added automatically.'
        ),
    },
    outputSchema: convertOutputSchema,
    annotations: {
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  async ({ content, template, outputPath, fileName }) => {
    try {
      return await createDocxResult({
        markdown: content,
        template,
        outputPath,
        fileName,
      });
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

server.registerTool(
  'convert_markdown_file_to_docx',
  {
    title: 'Convert Markdown File to DOCX',
    description:
      'Convert an existing local Markdown or text file into a formatted .docx file. Prefer this tool when the markdown already exists on disk to avoid sending large text through the chat.',
    inputSchema: {
      inputPath: z
        .string()
        .min(1)
        .describe('Path to an existing Markdown or text file on the local machine.'),
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
        .describe(
          'Optional file name to use when outputPath is omitted. The .docx extension is added automatically.'
        ),
    },
    outputSchema: convertOutputSchema,
    annotations: {
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  async ({ inputPath, template, outputPath, fileName }) => {
    try {
      return await createDocxResult({
        inputPath,
        template,
        outputPath,
        fileName,
      });
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
