import { Paragraph, TextRun, IRunOptions } from 'docx';
import type { Root, Content, Heading, Paragraph as MdParagraph, List, ListItem, PhrasingContent } from 'mdast';

/**
 * Maps markdown heading depth to Word style IDs
 * # H1 → Title (document title)
 * ## H2 → Heading1 (一、)
 * ### H3 → Heading2 (（一）)
 * #### H4 → Heading3 (1.)
 */
const HEADING_STYLE_MAP: Record<number, string> = {
  1: 'Title',
  2: 'Heading1',
  3: 'Heading2',
  4: 'Heading3',
};

/**
 * Converts an mdast AST to an array of docx Paragraph elements
 */
export function convertMdastToDocx(mdast: Root): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  for (const node of mdast.children) {
    const converted = convertNode(node);
    paragraphs.push(...converted);
  }

  return paragraphs;
}

/**
 * Converts a single mdast node to docx Paragraph(s)
 */
function convertNode(node: Content): Paragraph[] {
  switch (node.type) {
    case 'heading':
      return [convertHeading(node)];
    case 'paragraph':
      return [convertParagraph(node)];
    case 'list':
      return convertList(node);
    default:
      // For unsupported nodes, return empty (or could add fallback)
      return [];
  }
}

/**
 * Converts a heading node to a docx Paragraph with appropriate style
 */
function convertHeading(node: Heading): Paragraph {
  const styleId = HEADING_STYLE_MAP[node.depth] || 'Normal';
  const runs = convertPhrasingContent(node.children);

  return new Paragraph({
    style: styleId,
    children: runs,
  });
}

/**
 * Converts a paragraph node to a docx Paragraph
 */
function convertParagraph(node: MdParagraph): Paragraph {
  const runs = convertPhrasingContent(node.children);

  return new Paragraph({
    style: 'Normal',
    children: runs,
  });
}

/**
 * Converts a list node to multiple docx Paragraphs
 */
function convertList(node: List): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const isOrdered = node.ordered ?? false;
  const startNum = node.start ?? 1;

  node.children.forEach((item, index) => {
    const itemParagraphs = convertListItem(item, isOrdered, startNum + index);
    paragraphs.push(...itemParagraphs);
  });

  return paragraphs;
}

/**
 * Converts a list item to docx Paragraph(s)
 * List items can contain multiple paragraphs or nested lists
 */
function convertListItem(item: ListItem, isOrdered: boolean, number: number): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const prefix = isOrdered ? `${number}. ` : '• ';

  // Process each child of the list item
  item.children.forEach((child, childIndex) => {
    if (child.type === 'paragraph') {
      const runs = convertPhrasingContent(child.children);

      // Add prefix only to the first paragraph
      if (childIndex === 0) {
        runs.unshift(new TextRun({ text: prefix }));
      }

      paragraphs.push(new Paragraph({
        style: 'ListParagraph',
        children: runs,
      }));
    } else if (child.type === 'list') {
      // Handle nested lists (convert with indentation)
      const nestedParagraphs = convertList(child);
      paragraphs.push(...nestedParagraphs);
    }
  });

  return paragraphs;
}

/**
 * Converts an array of phrasing content (inline elements) to TextRun array
 */
function convertPhrasingContent(nodes: PhrasingContent[]): TextRun[] {
  const runs: TextRun[] = [];

  for (const node of nodes) {
    runs.push(...convertPhrasingNode(node));
  }

  return runs;
}

/**
 * Converts a single phrasing content node to TextRun(s)
 */
function convertPhrasingNode(node: PhrasingContent): TextRun[] {
  switch (node.type) {
    case 'text':
      return [new TextRun({ text: node.value })];

    case 'strong':
      return convertStyledContent(node.children, { bold: true });

    case 'emphasis':
      return convertStyledContent(node.children, { italics: true });

    case 'inlineCode':
      // Render inline code as monospace (could customize font)
      return [new TextRun({ text: node.value })];

    default:
      // For other inline elements, try to extract text
      if ('children' in node && Array.isArray(node.children)) {
        return convertPhrasingContent(node.children as PhrasingContent[]);
      }
      if ('value' in node && typeof node.value === 'string') {
        return [new TextRun({ text: node.value })];
      }
      return [];
  }
}

/**
 * Converts phrasing content with additional styling (bold, italic)
 */
function convertStyledContent(nodes: PhrasingContent[], style: Partial<IRunOptions>): TextRun[] {
  const runs: TextRun[] = [];

  for (const node of nodes) {
    if (node.type === 'text') {
      runs.push(new TextRun({ text: node.value, ...style }));
    } else if (node.type === 'strong') {
      // Nested strong inside emphasis
      runs.push(...convertStyledContent(node.children, { ...style, bold: true }));
    } else if (node.type === 'emphasis') {
      // Nested emphasis inside strong
      runs.push(...convertStyledContent(node.children, { ...style, italics: true }));
    } else if ('children' in node && Array.isArray(node.children)) {
      runs.push(...convertStyledContent(node.children as PhrasingContent[], style));
    } else if ('value' in node && typeof node.value === 'string') {
      runs.push(new TextRun({ text: node.value, ...style }));
    }
  }

  return runs;
}
