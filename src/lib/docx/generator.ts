import { Document, Packer, Footer, Paragraph, TextRun, PageNumber, AlignmentType } from 'docx';
import { parseMarkdown } from '../markdown/parser';
import { convertMdastToDocx } from './converter';
import { createDocumentStyles, createFooterFont, getFooterSize, GB_PAGE } from './styles';
import type { StyleSettings, DocumentSettings, PageNumberFormat } from '../../types/styles';

/**
 * Creates footer with centered page number using custom styles
 * Format depends on pageNumberFormat:
 * - 'dash': "- 1 -", "- 2 -" (Chinese government style)
 * - 'plain': "1", "2" (English style)
 */
function createFooter(
  settings: StyleSettings,
  pageNumberFormat: PageNumberFormat = 'dash'
): Footer {
  const footerFont = createFooterFont(settings);
  const footerSize = getFooterSize(settings);

  if (pageNumberFormat === 'plain') {
    // English style: just the page number
    return new Footer({
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              children: [PageNumber.CURRENT],
              font: footerFont,
              size: footerSize,
            }),
          ],
        }),
      ],
    });
  }

  // Chinese style: "- 1 -" format
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
 * Creates a Word Document object from markdown text
 * This is the core function that can be used by both browser and Node.js
 * @param markdown - The markdown text to convert
 * @param settings - Style settings for the document
 * @param documentSettings - Optional document-level settings (line spacing, margins, page numbers)
 * @returns A docx Document object
 */
export function createDocument(
  markdown: string,
  settings: StyleSettings,
  documentSettings?: DocumentSettings
): Document {
  // Step 1: Parse markdown to AST
  const mdast = parseMarkdown(markdown);

  // Step 2: Convert AST to docx paragraphs
  const paragraphs = convertMdastToDocx(mdast);

  // Step 3: Create footer with custom styles and format
  const pageNumberFormat = documentSettings?.pageNumberFormat ?? 'dash';
  const footer = createFooter(settings, pageNumberFormat);

  // Step 4: Get margins (use document settings or default to GB_PAGE)
  const margins = documentSettings?.margins ?? {
    top: GB_PAGE.MARGIN_TOP,
    bottom: GB_PAGE.MARGIN_BOTTOM,
    left: GB_PAGE.MARGIN_LEFT,
    right: GB_PAGE.MARGIN_RIGHT,
    header: GB_PAGE.HEADER,
    footer: GB_PAGE.FOOTER,
  };

  // Step 5: Create document with styles and page settings
  const doc = new Document({
    styles: createDocumentStyles(settings, documentSettings),
    sections: [
      {
        properties: {
          page: {
            size: {
              width: GB_PAGE.WIDTH,
              height: GB_PAGE.HEIGHT,
            },
            margin: {
              top: margins.top,
              bottom: margins.bottom,
              left: margins.left,
              right: margins.right,
              header: margins.header,
              footer: margins.footer,
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

  return doc;
}

/**
 * Generates a Word document (.docx) from markdown text (Browser version)
 * @param markdown - The markdown text to convert
 * @param settings - Style settings for the document
 * @param documentSettings - Optional document-level settings
 * @returns A Blob containing the generated .docx file
 */
export async function generateDocx(
  markdown: string,
  settings: StyleSettings,
  documentSettings?: DocumentSettings
): Promise<Blob> {
  const doc = createDocument(markdown, settings, documentSettings);
  const blob = await Packer.toBlob(doc);
  return blob;
}

/**
 * Generates a Word document (.docx) from markdown text (Node.js version)
 * @param markdown - The markdown text to convert
 * @param settings - Style settings for the document
 * @param documentSettings - Optional document-level settings
 * @returns A Buffer containing the generated .docx file
 */
export async function generateDocxBuffer(
  markdown: string,
  settings: StyleSettings,
  documentSettings?: DocumentSettings
): Promise<Buffer> {
  const doc = createDocument(markdown, settings, documentSettings);
  const buffer = await Packer.toBuffer(doc);
  return buffer;
}
