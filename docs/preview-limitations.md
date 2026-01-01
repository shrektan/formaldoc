# Preview Feature Limitations

This memo documents why we chose not to implement DOCX preview or PDF export features.

## Why We Removed DOCX Preview

### Font Rendering Issues

Browser-based DOCX preview relies on system fonts. The `docx-preview` library converts DOCX to HTML and renders it in the browser, but:

- Chinese fonts (仿宋, 楷体, 黑体, 宋体) may not be installed on the user's system
- There is no free/open-source equivalent for 仿宋 (FangSong)
- Preview displayed incorrect fonts (only 宋体 fallback), misleading users about the actual document appearance

### Technical Constraints

- `docx-preview` renders DOCX as HTML using available system fonts
- Cannot embed proprietary Chinese fonts in browser
- Web font alternatives (Noto Sans, Source Han) are not exact matches for government document standards
- The preview would give users a false impression of the final document

## Why We Didn't Add PDF Export

### Font Embedding Required

Browser-based PDF libraries (jsPDF, pdfmake, @react-pdf/renderer) cannot reference system fonts by name. They require:

- Fonts must be embedded in the PDF file
- Full Chinese fonts are 8-16MB each
- Even with subsetting, CJK fonts are 50-200KB per font
- Total bundle size would increase significantly

### Font Subsetting Complexity

- Dynamic font subsetting requires HarfBuzz WASM (~750KB)
- Still need source font files to subset from
- 仿宋 is proprietary - no open-source version exists
- 楷体 (KaiTi) would need to use 宋体 as substitute

### PDF Font Name Reference Not Viable

We explored using font names without embedding (like DOCX does), but:

- Standard PDF viewers (Adobe Acrobat) reject non-embedded CIDFonts
- PDF/A compliance requires font embedding
- Cross-platform rendering becomes unreliable

## Decision

Focus solely on DOCX output where:

- Fonts are referenced by name (not embedded)
- User's Word application has correct fonts installed
- Document renders correctly on Chinese government systems
- File size remains small (~10KB for typical documents)

The target users (Chinese government workers) will have 仿宋, 楷体, 黑体, 宋体 installed on their Windows systems with Microsoft Office.
