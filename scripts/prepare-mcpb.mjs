import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');
const workspaceDir = join(rootDir, '.mcpb');
const bundleDir = join(workspaceDir, 'bundle');
const outputFile = join(workspaceDir, 'formaldoc.mcpb');

const runtimeDependencyKeys = [
  '@modelcontextprotocol/sdk',
  'docx',
  'jsdom',
  'katex',
  'mathml2omml',
  'remark-gfm',
  'remark-math',
  'remark-parse',
  'unified',
  'zod',
];

async function loadRootPackageJson() {
  const raw = await readFile(join(rootDir, 'package.json'), 'utf-8');
  return JSON.parse(raw);
}

function getRuntimeDependencies(rootPackageJson) {
  return Object.fromEntries(
    runtimeDependencyKeys.map((dependency) => [dependency, rootPackageJson.dependencies[dependency]])
  );
}

async function copyCompiledServer() {
  await cp(join(rootDir, 'mcp', 'dist', 'mcp', 'server.js'), join(bundleDir, 'server', 'index.js'));
  await cp(join(rootDir, 'mcp', 'dist', 'src'), join(bundleDir, 'src'), { recursive: true });
}

async function writeBundlePackageJson(rootPackageJson) {
  const bundlePackageJson = {
    name: 'formaldoc-claude-desktop-bundle',
    private: true,
    type: 'module',
    dependencies: getRuntimeDependencies(rootPackageJson),
  };

  await writeFile(
    join(bundleDir, 'package.json'),
    `${JSON.stringify(bundlePackageJson, null, 2)}\n`,
    'utf-8'
  );
}

async function writeManifest(rootPackageJson) {
  const manifest = {
    manifest_version: '0.4',
    name: 'formaldoc',
    display_name: 'FormalDoc',
    version: rootPackageJson.version,
    description: 'Convert Markdown into formatted DOCX files with FormalDoc templates.',
    long_description:
      'FormalDoc turns Markdown into polished .docx files using built-in Chinese and English templates, including formal Chinese public-document layouts.',
    author: {
      name: 'shrektan',
      url: 'https://github.com/shrektan',
    },
    repository: {
      type: 'git',
      url: 'https://github.com/shrektan/formaldoc',
    },
    homepage: 'https://github.com/shrektan/formaldoc',
    documentation: 'https://github.com/shrektan/formaldoc/blob/main/README_zh.md',
    support: 'https://github.com/shrektan/formaldoc/issues',
    icon: 'icon.png',
    server: {
      type: 'node',
      entry_point: 'server/index.js',
      mcp_config: {
        command: 'node',
        args: ['${__dirname}/server/index.js'],
        env: {},
      },
    },
    tools: [
      {
        name: 'export_reply_to_docx',
        description:
          'Automatically export the current reply, markdown draft, or local markdown artifact to DOCX.',
      },
      {
        name: 'list_docx_templates',
        description: 'List the available FormalDoc export templates.',
      },
      {
        name: 'convert_markdown_text_to_docx',
        description: 'Convert Markdown text into a formatted DOCX file on the local machine.',
      },
      {
        name: 'convert_markdown_file_to_docx',
        description: 'Convert a local Markdown file into a formatted DOCX file on the local machine.',
      },
    ],
    keywords: ['markdown', 'docx', 'word', 'formal-documents', 'mcp'],
    license: rootPackageJson.license,
    compatibility: {
      platforms: ['darwin', 'win32'],
      runtimes: {
        node: '>=18',
      },
    },
  };

  await writeFile(join(bundleDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf-8');
}

function installRuntimeDependencies() {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(npmCommand, ['install', '--omit=dev', '--ignore-scripts'], {
    cwd: bundleDir,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error('Failed to install runtime dependencies for the Claude Desktop bundle.');
  }
}

async function main() {
  const rootPackageJson = await loadRootPackageJson();

  await rm(workspaceDir, { recursive: true, force: true });
  await mkdir(join(bundleDir, 'server'), { recursive: true });

  await copyCompiledServer();
  await cp(join(rootDir, 'public', 'logo.png'), join(bundleDir, 'icon.png'));
  await writeBundlePackageJson(rootPackageJson);
  await writeManifest(rootPackageJson);
  installRuntimeDependencies();

  console.log(`Prepared Claude Desktop bundle at ${bundleDir}`);
  console.log(`Pack output path will be ${outputFile}`);
}

main().catch((error) => {
  console.error('Failed to prepare Claude Desktop bundle:', error);
  process.exit(1);
});
