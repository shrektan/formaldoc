# Claude Desktop Extension

FormalDoc can be packaged as a local Claude Desktop extension (`.mcpb`) so the app can install it with a single file.

## Build the bundle

```bash
npm install
npm run mcpb:pack
```

This creates:

- `.mcpb/bundle/` — the unpacked extension bundle
- `.mcpb/formaldoc.mcpb` — the installable Claude Desktop package

## Install in Claude Desktop

1. Open Claude Desktop.
2. Go to `Settings > Extensions > Advanced settings`.
3. Choose `Install Extension...`.
4. Select `.mcpb/formaldoc.mcpb`.

## What the extension provides

- `export_reply_to_docx`
- `list_docx_templates`
- `convert_markdown_text_to_docx`
- `convert_markdown_file_to_docx`

If `outputPath` is omitted, FormalDoc saves files to `~/Documents/FormalDoc Exports` by default.

`export_reply_to_docx` is the preferred high-level tool. Claude can use it when the user says things like "turn this reply into a docx" or "export this markdown artifact to Word" without the user naming a specific tool.
