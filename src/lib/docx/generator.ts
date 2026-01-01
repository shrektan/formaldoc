import { Document, Packer, Footer, Paragraph, TextRun, PageNumber, AlignmentType } from 'docx';
import { parseMarkdown } from '../markdown/parser';
import { convertMdastToDocx } from './converter';
import { createDocumentStyles, GB_PAGE, FOOTER_FONT } from './styles';

/**
 * Creates the default footer with centered page number
 * Format: "- 1 -", "- 2 -", etc.
 */
function createDefaultFooter(): Footer {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: '- ',
            font: FOOTER_FONT,
            size: 24, // 12pt
          }),
          new TextRun({
            children: [PageNumber.CURRENT],
            font: FOOTER_FONT,
            size: 24,
          }),
          new TextRun({
            text: ' -',
            font: FOOTER_FONT,
            size: 24,
          }),
        ],
      }),
    ],
  });
}

/**
 * Generates a Word document (.docx) from markdown text
 * @param markdown - The markdown text to convert
 * @returns A Blob containing the generated .docx file
 */
export async function generateDocx(markdown: string): Promise<Blob> {
  // Step 1: Parse markdown to AST
  const mdast = parseMarkdown(markdown);

  // Step 2: Convert AST to docx paragraphs
  const paragraphs = convertMdastToDocx(mdast);

  // Step 3: Create footer
  const footer = createDefaultFooter();

  // Step 4: Create document with styles and page settings
  const doc = new Document({
    styles: createDocumentStyles(),
    sections: [
      {
        properties: {
          page: {
            size: {
              width: GB_PAGE.WIDTH,
              height: GB_PAGE.HEIGHT,
            },
            margin: {
              top: GB_PAGE.MARGIN_TOP,
              bottom: GB_PAGE.MARGIN_BOTTOM,
              left: GB_PAGE.MARGIN_LEFT,
              right: GB_PAGE.MARGIN_RIGHT,
              header: GB_PAGE.HEADER,
              footer: GB_PAGE.FOOTER,
            },
          },
        },
        footers: {
          default: footer,
        },
        children: paragraphs,
      },
    ],
  });

  // Step 5: Generate and return blob
  const blob = await Packer.toBlob(doc);
  return blob;
}
