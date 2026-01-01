import { Document, Packer, Footer, Paragraph, TextRun, PageNumber, AlignmentType } from 'docx';
import { parseMarkdown } from '../markdown/parser';
import { convertMdastToDocx } from './converter';
import { createDocumentStyles, createFooterFont, getFooterSize, GB_PAGE } from './styles';
import type { StyleSettings } from '../../types/styles';

/**
 * Creates footer with centered page number using custom styles
 * Format: "- 1 -", "- 2 -", etc.
 */
function createFooter(settings: StyleSettings): Footer {
  const footerFont = createFooterFont(settings);
  const footerSize = getFooterSize(settings);

  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: '- ',
            font: footerFont,
            size: footerSize,
          }),
          new TextRun({
            children: [PageNumber.CURRENT],
            font: footerFont,
            size: footerSize,
          }),
          new TextRun({
            text: ' -',
            font: footerFont,
            size: footerSize,
          }),
        ],
      }),
    ],
  });
}

/**
 * Generates a Word document (.docx) from markdown text
 * @param markdown - The markdown text to convert
 * @param settings - Style settings for the document
 * @returns A Blob containing the generated .docx file
 */
export async function generateDocx(markdown: string, settings: StyleSettings): Promise<Blob> {
  // Step 1: Parse markdown to AST
  const mdast = parseMarkdown(markdown);

  // Step 2: Convert AST to docx paragraphs
  const paragraphs = convertMdastToDocx(mdast);

  // Step 3: Create footer with custom styles
  const footer = createFooter(settings);

  // Step 4: Create document with styles and page settings
  const doc = new Document({
    styles: createDocumentStyles(settings),
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
