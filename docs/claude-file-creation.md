# Claude File Creation Plan

FormalDoc should integrate with Claude code execution as a normal Node package instead of a local MCP server.

## Target Workflow

1. Claude writes or receives Markdown in the conversation.
2. Claude asks which template to use.
3. If the user does not specify one, Claude defaults to:
   - `cn-gov` for Chinese content
   - `en-standard` for English content
4. Claude installs the FormalDoc package in its code execution environment.
5. Claude generates `output.docx`.
6. Claude returns the generated `.docx` file directly in the chat.

## Package Surface

The package should expose:

- `convertMarkdownToDocx(options)` for generating a `Buffer`
- `convertMarkdownToDocxFile(options)` for writing a `.docx` file
- `formaldoc` CLI for file-based workflows

## Claude Instruction Sketch

When the user asks to export content to DOCX:

1. Ask which FormalDoc template they want.
2. If they do not answer, choose `cn-gov` for Chinese text and `en-standard` for English text.
3. Use code execution to install the package.
4. Generate a `.docx` file with the FormalDoc Node API or CLI.
5. Return the generated `.docx` file in the conversation.
