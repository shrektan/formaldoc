#!/usr/bin/env node
/**
 * FormalDoc CLI - Convert Markdown to formal Word documents
 *
 * Usage:
 *   formaldoc <input.md> [output.docx]
 *   formaldoc --help
 *   formaldoc --version
 *
 * Options:
 *   -o, --output <file>     Output file path (default: input with .docx extension)
 *   -t, --template <name>   Template to use: cn-gov, en-standard (default: cn-gov)
 *   -s, --styles <file>     Custom styles JSON file
 *   -h, --help              Show help message
 *   -v, --version           Show version number
 *   --stdin                 Read markdown from stdin
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, basename, dirname, extname, join } from 'node:path';
import {
  convertMarkdownToDocxFile,
  DEFAULT_TEMPLATE,
  isValidTemplateName,
  parseDocModel,
  renderDocModelWithReport,
} from '../src/node.js';
import { convertQuotes } from '../src/lib/text-processing.js';
import type { StyleSettings } from '../src/types/styles.js';

const VERSION = '1.2.2';

interface CliOptions {
  input?: string;
  docmodel?: string;
  docmodelReport?: string;
  output?: string;
  template?: string;
  styles?: string;
  titleLevel?: number;
  quotes: boolean;
  help: boolean;
  version: boolean;
  stdin: boolean;
}

function printHelp(): void {
  console.log(`
FormalDoc CLI v${VERSION}
Convert Markdown to formal Word documents

USAGE:
  formaldoc <input.md> [options]
  formaldoc --docmodel <input.json> -o output.docx
  cat file.md | formaldoc --stdin -o output.docx

ARGUMENTS:
  <input.md>              Input markdown file

OPTIONS:
  --docmodel <file>       DocModel JSON input (exclusive with Markdown input)
  --docmodel-report <file> Write this render XML filtering report as JSON
  -o, --output <file>     Output file path (default: input with .docx extension)
  -t, --template <name>   Template to use (default: cn-gov)
  -s, --styles <file>     Custom styles JSON (applied on top of template)
  -l, --title-level <n>   Heading level to use as title (1-5, default: 1)
  --quotes                Convert English quotes to Chinese quotes ("..." → \u201C...\u201D)
  -h, --help              Show this help message
  -v, --version           Show version number
  --stdin                 Read markdown from stdin (requires -o)

TEMPLATES:
  cn-gov       Chinese Government format (GB/T 9704-2012)
               Fonts: 宋体, 黑体, 楷体, 仿宋
  en-standard  English Standard format
               Fonts: Times New Roman (body), Arial (headings)

EXAMPLES:
  formaldoc document.md                       # CN gov format (default)
  formaldoc document.md -t en-standard        # English format
  formaldoc document.md -l 2                  # Treat ## as title
  formaldoc document.md --quotes                  # Convert quotes first
  formaldoc document.md -t cn-gov -s custom.json  # CN gov + custom overrides
  cat doc.md | formaldoc --stdin -o out.docx

STYLE SETTINGS:
  Create a JSON file with style overrides. Example:
  {
    "title": { "font": "Arial", "size": 24, "bold": true, "center": true },
    "bodyText": { "font": "Times New Roman", "size": 12 }
  }

  Style keys: title, heading1-4, bodyText, listItem, tableHeader, tableCell, pageFooter
`);
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    quotes: false,
    help: false,
    version: false,
    stdin: false,
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === '-h' || arg === '--help') {
      options.help = true;
    } else if (arg === '-v' || arg === '--version') {
      options.version = true;
    } else if (arg === '--quotes') {
      options.quotes = true;
    } else if (arg === '--stdin') {
      options.stdin = true;
    } else if (arg === '--docmodel') {
      i++;
      if (!args[i] || args[i].startsWith('-') || options.docmodel) {
        throw new Error('--docmodel requires exactly one JSON file');
      }
      options.docmodel = args[i];
    } else if (arg === '--docmodel-report') {
      i++;
      if (!args[i] || args[i].startsWith('-') || options.docmodelReport) {
        throw new Error('--docmodel-report requires exactly one report path');
      }
      options.docmodelReport = args[i];
    } else if (arg === '-o' || arg === '--output') {
      i++;
      options.output = args[i];
    } else if (arg === '-t' || arg === '--template') {
      i++;
      options.template = args[i];
    } else if (arg === '-s' || arg === '--styles') {
      i++;
      options.styles = args[i];
    } else if (arg === '-l' || arg === '--title-level') {
      i++;
      const level = parseInt(args[i], 10);
      if (isNaN(level) || level < 1 || level > 5) {
        console.error('Error: --title-level must be a number between 1 and 5');
        process.exit(1);
      }
      options.titleLevel = level;
    } else if (!arg.startsWith('-') && !options.input) {
      options.input = arg;
    }

    i++;
  }

  return options;
}

function loadStyleOverrides(templateName: string | undefined, stylesPath: string | undefined) {
  let template = DEFAULT_TEMPLATE;
  if (templateName) {
    if (isValidTemplateName(templateName)) {
      template = templateName;
    } else {
      console.warn(
        `Warning: Unknown template "${templateName}", using default (${DEFAULT_TEMPLATE})`
      );
    }
  }
  let styleOverrides: Partial<StyleSettings> | undefined;

  // Apply custom styles on top if provided
  if (stylesPath) {
    const fullPath = resolve(stylesPath);
    if (!existsSync(fullPath)) {
      console.error(`Error: Styles file not found: ${fullPath}`);
      process.exit(1);
    }

    try {
      const content = readFileSync(fullPath, 'utf-8');
      const customStyles = JSON.parse(content);
      styleOverrides = customStyles;
    } catch (error) {
      console.error(`Error: Failed to parse styles file: ${error}`);
      process.exit(1);
    }
  }

  return {
    styleOverrides,
    template,
  };
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  if (options.version) {
    console.log(`formaldoc v${VERSION}`);
    process.exit(0);
  }

  if (options.docmodelReport && !options.docmodel)
    throw new Error('--docmodel-report requires --docmodel');

  if (options.docmodel) {
    if (options.input || options.stdin) {
      throw new Error('--docmodel is mutually exclusive with Markdown input and --stdin');
    }
    if (options.template || options.styles || options.titleLevel !== undefined || options.quotes) {
      throw new Error('--docmodel cannot be combined with Markdown formatting options');
    }
    const inputPath = resolve(options.docmodel);
    const outputPath = options.output
      ? resolve(options.output)
      : join(dirname(inputPath), `${basename(inputPath, extname(inputPath))}.docx`);
    const reportPath = options.docmodelReport ? resolve(options.docmodelReport) : undefined;
    if (reportPath === inputPath || reportPath === outputPath)
      throw new Error('--docmodel-report must differ from the input JSON and output DOCX paths');
    const model = parseDocModel(readFileSync(inputPath, 'utf-8'));
    const { buffer, report } = await renderDocModelWithReport(model);
    writeFileSync(outputPath, buffer);
    if (reportPath) writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    else if (report.xmlCharactersFiltered)
      console.warn(`Filtered ${report.xmlCharactersFiltered} XML 1.0 illegal characters.`);
    console.log(`Successfully created: ${outputPath}`);
    return;
  }

  // Determine input source
  let markdown: string;
  let defaultOutput: string;

  if (options.stdin) {
    if (!options.output) {
      console.error('Error: --stdin requires -o/--output to specify output file');
      process.exit(1);
    }
    markdown = await readStdin();
    defaultOutput = options.output;
  } else if (options.input) {
    const inputPath = resolve(options.input);
    if (!existsSync(inputPath)) {
      console.error(`Error: Input file not found: ${inputPath}`);
      process.exit(1);
    }
    markdown = readFileSync(inputPath, 'utf-8');
    // Default output: same directory, same name with .docx extension
    const inputDir = dirname(inputPath);
    const inputName = basename(inputPath, extname(inputPath));
    defaultOutput = join(inputDir, `${inputName}.docx`);
  } else {
    console.error('Error: No input file specified. Use --help for usage.');
    process.exit(1);
  }

  const outputPath = options.output ? resolve(options.output) : defaultOutput;
  const { styleOverrides, template } = loadStyleOverrides(options.template, options.styles);

  if (options.quotes) {
    const { text, count } = convertQuotes(markdown);
    markdown = text;
    if (count > 0) {
      console.log(`Converted ${count} quote pair(s) to Chinese quotes`);
    }
  }

  try {
    const templateLabel = template || DEFAULT_TEMPLATE;
    console.log(`Converting markdown to docx (template: ${templateLabel})...`);
    const result = await convertMarkdownToDocxFile({
      markdown,
      templateName: template,
      outputPath,
      styleOverrides,
      titleLevel: options.titleLevel,
    });
    console.log(`Successfully created: ${result.outputPath}`);
  } catch (error) {
    console.error(`Error: Conversion failed: ${error}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`Fatal error: ${error}`);
  process.exit(1);
});
