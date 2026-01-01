# FormalDoc

[中文文档](./README_zh.md)

**FormalDoc** converts AI-generated text into properly formatted Chinese government document (公文) Word files.

Paste content from 豆包, 千问, DeepSeek, Kimi, ChatGPT, or any AI tool, and generate a formal Word document in one click.

## Demo

Try it now: [formaldoc.vercel.app](https://formaldoc.vercel.app)

## Why FormalDoc?

### Simple

Just paste and click. Rich text from AI chatbots is **automatically converted to Markdown** - no manual formatting needed. Headings, lists, and tables are preserved.

### Fast

Generate Word documents **instantly in your browser**. No server processing, no waiting for uploads or downloads.

### Zero Config

**公文 format (GB/T 9704-2012) is pre-configured** with correct fonts, sizes, and spacing. No setup required - just paste and generate.

### Offline & Private

**All processing happens locally in your browser**. No data is ever sent to any server. Works offline after first load. Your documents never leave your device.

### Editable Output

Generated DOCX files use **proper Word styles (样式)**, not hard-coded formatting. You can easily modify the document in Word - change a style and all matching content updates automatically.

## How It Works

1. Copy text from AI (豆包, 千问, DeepSeek, Kimi, ChatGPT, etc.)
2. Paste into FormalDoc (rich text auto-converts to Markdown)
3. Click "下载Word文档"
4. Open in Word and edit as needed

## Features

- **Smart Paste**: Auto-converts HTML to Markdown when pasting from AI chatbots
- **Quote Conversion**: One-click convert English quotes to Chinese quotes ("..." → "...")
- **Customizable Styles**: Adjust fonts, sizes for title, headings, body text, etc.
- **Mobile Friendly**: Works on phones and tablets

## Supported Markdown

| Markdown | Word Style |
|----------|-----------|
| `# Title` | 公文标题 (22pt 宋体, bold, centered) |
| `## Heading` | 一级标题 (16pt 黑体) |
| `### Heading` | 二级标题 (16pt 楷体) |
| `#### Heading` | 三级标题 (16pt 仿宋, bold) |
| `##### Heading` | 四级标题 (16pt 仿宋, bold) |
| Paragraphs | 正文 (16pt 仿宋, 2-char indent) |
| Lists | 列表项 (with proper nesting) |
| Tables | 表格 (centered content) |
| `**bold**` | 粗体 |
| `*italic*` | 斜体 |

## Tech Stack

- React 19 + TypeScript + Vite
- [docx](https://docx.js.org/) for Word document generation
- [remark](https://github.com/remarkjs/remark) + [remark-gfm](https://github.com/remarkjs/remark-gfm) for Markdown parsing
- [Turndown](https://github.com/mixmark-io/turndown) for HTML to Markdown conversion

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Lint and format
npm run lint
npm run format
```

## License

Apache-2.0

---

**FormalDoc** - AI文字 → 公文Word
