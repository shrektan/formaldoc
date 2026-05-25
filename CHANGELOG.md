# Changelog

## [1.20.3] — 2026-05-25

### Fixed
- Inline `<br>` in Markdown is now honored as a Word line break in both unstyled and styled contexts (bold / italic / strike / styled table cells). Previously rendered as the literal string `<br>`, which broke the common pattern of using `<br>` inside Markdown table cells (where real newlines aren't allowed) — particularly noticeable when AI assistants emit `<br><br>` inside `**bold**` cells. Other inline HTML (`<sub>`, `<u>`, …) keeps its existing literal-text behavior

## [1.20.1] — 2026-05-25

### Fixed
- Editor textarea now fills the full container height — `.editor-container` switched to flex column and `.content-textarea` uses `flex: 1` with `display: block` instead of `height: 100%` on a default inline-block textarea, eliminating the unusable empty strip at the bottom of the textbox after pasting

## [1.19.3] — 2026-04-16

### Added
- CLI `--quotes` flag for English-to-Chinese quote conversion during markdown-to-docx conversion

### Changed
- cn-gov blockquote style: switched from 楷体 italic+shading to plain 仿宋 body-text style (no italic, no gray background, spacing-based separation)
- BlockQuote style in `styles.ts` now branches on `settings.blockquote.italic` for spacing and indent

### Fixed
- CJK emphasis flanking: insert Zero-Width Space between `**` delimiters and adjacent Unicode punctuation (`\p{P}`) so CommonMark flanking rules pass, then strip ZWS from AST text nodes
- `stripZws` now also cleans `url` fields on link/image AST nodes, preventing corrupted hyperlinks when URLs contain asterisks adjacent to punctuation
- `convertMdastToDocx` accepts `ConvertOptions.blockquotePlain` to toggle between plain and fancy blockquote rendering

### Deployment Notes
**Data impact**: None
**Manual operations**: None
**Environment changes**: None

## [1.18.0] — 2026-04-01

### Added
- Footnote support: Markdown footnotes (`[^1]`, `[^1]: content`) convert to native Word footnotes via `FootnoteReferenceRun` + `Document.footnotes` config
- Footnote conversion passes `footnoteMap` as parameter through call chain (no module-level mutable state)

### Changed
- ListParagraph and BlockQuote styles now have explicit justified alignment

### Deployment Notes
**Data impact**: None
**Manual operations**: None
**Environment changes**: None
