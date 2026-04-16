# Changelog

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
