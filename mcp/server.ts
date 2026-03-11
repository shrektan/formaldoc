#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
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

const autoExportInputSchema = z
  .object({
    content: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Markdown content for the current reply or artifact. Use this when the content exists only in the conversation.'
      ),
    inputPath: z
      .string()
      .optional()
      .describe(
        'Path to an existing local Markdown or text file. Prefer this over content when a file already exists to avoid sending large text through the chat.'
      ),
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
  })
  .refine((value) => Boolean(value.content?.trim() || value.inputPath?.trim()), {
    message: 'Provide either content or inputPath.',
  });

function describeTemplateChoice(templateId: string): string {
  switch (templateId) {
    case 'cn-gov':
      return '适合正式公文、通知、请示、函件。推荐中文正式文件优先使用。';
    case 'cn-general':
      return '适合通用中文材料、方案、普通商务文档。';
    case 'cn-academic':
      return '适合学位论文、课程论文、研究型文稿。';
    case 'cn-report':
      return '适合工作汇报、分析报告、总结复盘。';
    case 'en-standard':
      return '适合通用英文文档。推荐英文默认优先使用。';
    case 'en-business':
      return '适合英文商务汇报、proposal、企业材料。';
    case 'en-academic':
      return '适合英文论文、APA 风格、双倍行距材料。';
    case 'en-legal':
      return '适合合同、条款、法律文书。';
    default:
      return 'FormalDoc export template.';
  }
}

function formatTemplateTitle(
  item: ReturnType<typeof getAvailableTemplateSummaries>[number]
): string {
  const recommended = item.id === 'cn-gov' || item.id === 'en-standard' ? ' (Recommended)' : '';
  const displayName = item.category === 'chinese' ? item.name : item.nameEn;

  return `${displayName}${recommended}`;
}

interface TemplateSelection {
  template: string;
  autoSelectedReason: string | null;
}

async function loadMarkdownSample(params: {
  markdown?: string;
  inputPath?: string;
}): Promise<string | null> {
  if (params.markdown?.trim()) {
    return params.markdown.trim();
  }

  if (!params.inputPath?.trim()) {
    return null;
  }

  try {
    const sourcePath = resolve(process.cwd(), params.inputPath.trim());
    return (await readFile(sourcePath, 'utf-8')).trim() || null;
  } catch {
    return null;
  }
}

function chooseFallbackTemplate(markdownSample: string | null): TemplateSelection {
  if (markdownSample && /[\u3400-\u9fff]/.test(markdownSample)) {
    return {
      template: 'cn-gov',
      autoSelectedReason:
        'The client does not support template selection prompts, so FormalDoc auto-selected the recommended Chinese government template (cn-gov).',
    };
  }

  return {
    template: 'en-standard',
    autoSelectedReason:
      'The client does not support template selection prompts, so FormalDoc auto-selected the recommended English standard template (en-standard).',
  };
}

async function resolveTemplateSelection(params: {
  template?: string;
  markdown?: string;
  inputPath?: string;
}): Promise<TemplateSelection> {
  if (params.template?.trim()) {
    return {
      template: params.template.trim(),
      autoSelectedReason: null,
    };
  }

  const fallbackSelection = chooseFallbackTemplate(await loadMarkdownSample(params));
  const clientCapabilities = server.server.getClientCapabilities();
  if (!clientCapabilities?.elicitation?.form) {
    return fallbackSelection;
  }

  const templates = getAvailableTemplateSummaries();

  try {
    const result = await server.server.elicitInput({
      mode: 'form',
      message:
        'Choose a FormalDoc template before generating the DOCX file. Pick the recommended option unless you need a specific format.',
      requestedSchema: {
        type: 'object',
        properties: {
          template: {
            type: 'string',
            title: 'Template',
            description: 'Select the formatting template to use for DOCX export.',
            oneOf: templates.map((item) => ({
              const: item.id,
              title: formatTemplateTitle(item),
              description: `${describeTemplateChoice(item.id)} Internal ID: ${item.id}.`,
            })),
          },
        },
        required: ['template'],
      },
    });

    if (result.action !== 'accept' || !result.content?.template) {
      return fallbackSelection;
    }

    return {
      template: String(result.content.template),
      autoSelectedReason: null,
    };
  } catch {
    return fallbackSelection;
  }
}

async function createDocxResult(params: {
  markdown?: string;
  inputPath?: string;
  template?: string;
  outputPath?: string;
  fileName?: string;
}) {
  const templateSelection = await resolveTemplateSelection(params);

  const result = await convertMarkdownToDocxFile({
    markdown: params.markdown,
    inputPath: params.inputPath,
    templateName: templateSelection.template,
    outputPath: params.outputPath ? ensureDocxExtension(params.outputPath) : undefined,
    fileName: params.fileName,
  });

  return {
    content: [
      ...(templateSelection.autoSelectedReason
        ? [
            {
              type: 'text' as const,
              text: templateSelection.autoSelectedReason,
            },
          ]
        : []),
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
  'export_reply_to_docx',
  {
    title: 'Export Reply to DOCX',
    description:
      'Use this automatically when the user wants to turn the current reply, current markdown draft, or an existing markdown artifact into a .docx file. Before calling this tool without a template, first ask the user which FormalDoc template they want. If the user does not answer or says to use the default, call the tool without template and FormalDoc will choose a sensible default automatically. Prefer inputPath when a local markdown file already exists; otherwise pass the markdown reply as content.',
    inputSchema: autoExportInputSchema,
    outputSchema: convertOutputSchema,
    annotations: {
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  async ({ content, inputPath, template, outputPath, fileName }) => {
    try {
      return await createDocxResult({
        markdown: content,
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
      'Low-level text export tool. Convert Markdown text passed directly in the tool call into a formatted .docx file. If template is missing, first ask the user which template they want. If they do not answer or tell you to use the default, omit template and FormalDoc will auto-select one. Use this when you intentionally want text-based export and the markdown is not already stored in a local file.',
    inputSchema: {
      content: z.string().min(1).describe('Markdown content to convert into a Word document.'),
      template: z
        .string()
        .optional()
        .describe(
          'Optional template name such as cn-gov, cn-general, en-standard, or en-legal. Ask the user first when feasible; omit this field if they want the default.'
        ),
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
      'Low-level file export tool. Convert an existing local Markdown or text file into a formatted .docx file. If template is missing, first ask the user which template they want. If they do not answer or tell you to use the default, omit template and FormalDoc will auto-select one. Prefer this when the markdown already exists on disk and you want explicit file-based export.',
    inputSchema: {
      inputPath: z
        .string()
        .min(1)
        .describe('Path to an existing Markdown or text file on the local machine.'),
      template: z
        .string()
        .optional()
        .describe(
          'Optional template name such as cn-gov, cn-general, en-standard, or en-legal. Ask the user first when feasible; omit this field if they want the default.'
        ),
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
