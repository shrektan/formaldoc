# FormalDoc

[中文文档](./README_zh.md)

**FormalDoc** converts AI-generated text (Markdown) into properly formatted Chinese government document (公文) Word files.

Paste content from 豆包, 千问, DeepSeek, Kimi, ChatGPT, or any AI tool, and generate a formal Word document in one click.

## Demo

Try it now: [formaldoc.vercel.app](https://formaldoc.vercel.app)

## Features

- **Markdown to Word**: Supports headings, paragraphs, lists, tables, bold, italic
- **公文 Format**: Follows GB/T 9704-2012 Chinese government document standards
- **Smart Paste**: Auto-converts HTML to Markdown when pasting from AI chatbots (preserves headings)
- **Quote Conversion**: One-click convert English quotes to Chinese quotes ("..." → "...")
- **Customizable Styles**: Adjust fonts, sizes for title, headings, body text, etc.
- **Mobile Friendly**: Works on phones and tablets
- **Works Offline**: No server required, works without internet after first load
- **Privacy First**: All processing happens in browser, no data uploaded

## How It Works

1. Copy text from AI (豆包, 千问, DeepSeek, Kimi, ChatGPT, etc.)
2. Paste into FormalDoc (headings are automatically preserved)
3. Click "生成公文文档"
4. Download your formatted Word document

## Supported Markdown

| Markdown | 公文 Style |
|----------|-----------|
| `# Title` | 公文标题 (22pt 宋体, bold, centered) |
| `## Heading` | 一级标题 (16pt 黑体) |
| `### Heading` | 二级标题 (16pt 楷体) |
| `#### Heading` | 三级标题 (16pt 仿宋, bold) |
| `##### Heading` | 四级标题 (16pt 仿宋, bold) |
| Paragraphs | 正文 (16pt 仿宋, 2-char indent) |
| Lists | 列表项 |
| Tables | 表格 |
| `**bold**` | 粗体 |
| `*italic*` | 斜体 |

## Tech Stack

- React 19 + TypeScript + Vite
- [docx](https://docx.js.org/) for Word document generation
- [remark](https://github.com/remarkjs/remark) for Markdown parsing

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

## Privacy

All processing happens **in the browser**.

- No content is uploaded
- No data is stored
- No server-side processing

Your documents never leave your device.

## License

Apache-2.0

---

**FormalDoc** - AI文字 → 公文Word
