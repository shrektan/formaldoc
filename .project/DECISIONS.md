# Decision Log

<!-- Format: Date | Decision | Context | Rationale -->
<!-- Newest first. Max 200 lines. -->

## 2026-10 | Independent DocModel v1 entry point

DocModel generation is a Node-only path independent of Markdown templates. Paragraph layout
lives in named styles; paragraph properties are limited to style, numbering, and section
structure. The renderer uses docx for content/media/relationships, then patches only required
XML parts for character indentation, exact styles, numbering instances, and structural cleanup.
Character indentation also includes twip values computed from its owning paragraph style font size
for LibreOffice. Numbering levels with indentation must bind that style. Floating images specify
horizontal and vertical reference frames separately, allowing stamps to follow signing paragraphs.
Single-image paragraphs use a dedicated single-spaced style, while oversized text can use atLeast
line spacing. Punctuation compression is an explicit optional document setting; omitting it preserves
the writer default, and false explicitly writes doNotCompress.
Numbering instances explicitly override every defined level start, preventing counter leakage
when several parts share an abstract definition. Per-level restart triggers are explicit in the
contract; the writer maps them to Word's one-based lvlRestart (0 means never restart).
TOC results and page references are supplied by the recognizer; the generator does not infer them.
The Node wrapper loads the Markdown generator and DOM polyfill only when converting Markdown,
so DocModel-only use does not pay the existing Markdown engine memory cost.

## 2025-02 | Restore functional tool UI from January design

Reverted to the January UI design for the web tool interface after exploring
alternatives. The original design better served user workflow.

## 2025-01 | Client-side only architecture

All document processing happens in the browser. No server component.
**Why**: Privacy (documents never leave user's device), offline capability,
zero infrastructure cost.

## 2025-01 | Native Word equations over images

LaTeX formulas convert to OMML (Office Math Markup) rather than rendered images.
**Why**: Editable in Word, proper scaling, smaller file size.

## 2025-01 | Word styles over direct formatting

Documents use Word named styles (Title, Heading 1, Body Text) rather than
inline formatting.
**Why**: Users can globally restyle documents in Word by modifying the style.
Professional document workflow requires this.

## 2025-01 | Template system with 8 presets

Rather than a single output format, created a template registry with
Chinese (cn-gov, cn-general, cn-academic, cn-report) and
English (en-standard, en-business, en-academic, en-legal) presets.
**Why**: Different contexts demand different formatting. cn-gov follows GB/T 9704.
