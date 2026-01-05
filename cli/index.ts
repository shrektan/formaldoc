#!/usr/bin/env bun
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
 *   -s, --styles <file>     Custom styles JSON file
 *   -h, --help              Show help message
 *   -v, --version           Show version number
 *   --stdin                 Read markdown from stdin
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, basename, dirname, extname, join } from 'node:path';
import { initDomPolyfill } from './dom-polyfill';

// Initialize DOM polyfill before importing conversion modules
initDomPolyfill();

// Import conversion modules after DOM polyfill is initialized
import { generateDocxBuffer } from '../src/lib/docx/generator';
import { DEFAULT_STYLES } from '../src/lib/styles/defaults';
import type { StyleSettings } from '../src/types/styles';

const VERSION = '1.2.2';

interface CliOptions {
  input?: string;
  output?: string;
  styles?: string;
  help: boolean;
  version: boolean;
  stdin: boolean;
}

function printHelp(): void {
  console.log(`
FormalDoc CLI v${VERSION}
Convert Markdown to formal Word documents (GB/T 9704-2012 format)

USAGE:
  formaldoc <input.md> [options]
  cat file.md | formaldoc --stdin -o output.docx

ARGUMENTS:
  <input.md>              Input markdown file

OPTIONS:
  -o, --output <file>     Output file path (default: input with .docx extension)
  -s, --styles <file>     Custom styles JSON file
  -h, --help              Show this help message
  -v, --version           Show version number
  --stdin                 Read markdown from stdin (requires -o)

EXAMPLES:
  formaldoc document.md                    # Output: document.docx
  formaldoc document.md -o report.docx     # Output: report.docx
  formaldoc document.md -s custom.json     # Use custom styles
  cat doc.md | formaldoc --stdin -o out.docx

STYLE SETTINGS:
  Create a JSON file with style overrides. Example:
  {
    "title": { "font": "宋体", "size": 22, "bold": true, "center": true },
    "bodyText": { "font": "仿宋", "size": 16, "indent": true }
  }

  Available fonts: 宋体, 黑体, 楷体, 仿宋
  Style keys: title, heading1-4, bodyText, listItem, tableHeader, tableCell, pageFooter
`);
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
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
    } else if (arg === '--stdin') {
      options.stdin = true;
    } else if (arg === '-o' || arg === '--output') {
      i++;
      options.output = args[i];
    } else if (arg === '-s' || arg === '--styles') {
      i++;
      options.styles = args[i];
    } else if (!arg.startsWith('-') && !options.input) {
      options.input = arg;
    }

    i++;
  }

  return options;
}

function loadStyles(stylesPath: string | undefined): StyleSettings {
  if (!stylesPath) {
    return DEFAULT_STYLES;
  }

  const fullPath = resolve(stylesPath);
  if (!existsSync(fullPath)) {
    console.error(`Error: Styles file not found: ${fullPath}`);
    process.exit(1);
  }

  try {
    const content = readFileSync(fullPath, 'utf-8');
    const customStyles = JSON.parse(content);
    // Merge with defaults
    return { ...DEFAULT_STYLES, ...customStyles };
  } catch (error) {
    console.error(`Error: Failed to parse styles file: ${error}`);
    process.exit(1);
  }
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
  const styles = loadStyles(options.styles);

  try {
    console.log(`Converting markdown to docx...`);
    const buffer = await generateDocxBuffer(markdown, styles);
    writeFileSync(outputPath, buffer);
    console.log(`Successfully created: ${outputPath}`);
  } catch (error) {
    console.error(`Error: Conversion failed: ${error}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`Fatal error: ${error}`);
  process.exit(1);
});
