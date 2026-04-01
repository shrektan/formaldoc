# Changelog

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
