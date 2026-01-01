import { Document, Packer } from 'docx';
import { parseMarkdown } from '../markdown/parser';
import { convertMdastToDocx } from './converter';
import { createDocumentStyles, GB_PAGE } from './styles';

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

  // Step 3: Create document with styles and page settings
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
            },
          },
        },
        children: paragraphs,
      },
    ],
  });

  // Step 4: Generate and return blob
  const blob = await Packer.toBlob(doc);
  return blob;
}
