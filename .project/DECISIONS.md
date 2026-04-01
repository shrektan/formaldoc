# Decision Log

<!-- Format: Date | Decision | Context | Rationale -->
<!-- Newest first. Max 200 lines. -->

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
