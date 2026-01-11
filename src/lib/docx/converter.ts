import {
  Paragraph,
  TextRun,
  IRunOptions,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  VerticalAlign,
  type ParagraphChild,
} from 'docx';
import { latexToDocxMath } from '../math/latex-to-docx';
import type {
  Root,
  Content,
  Heading,
  Paragraph as MdParagraph,
  List,
  ListItem,
  PhrasingContent,
  Table as MdTable,
  TableRow as MdTableRow,
  TableCell as MdTableCell,
  Html,
  Blockquote,
} from 'mdast';

// Type for docx elements that can be in a section
type DocxElement = Paragraph | Table;

/**
 * Maps markdown heading depth to Word style IDs
 * # H1 → Title (公文标题)
 * ## H2 → Heading1 (一、二、三)
 * ### H3 → Heading2 (（一）（二）（三）)
 * #### H4 → Heading3 (1. 2. 3.)
 * ##### H5 → Heading4 (（1）（2）（3）)
 */
const HEADING_STYLE_MAP: Record<number, string> = {
  1: 'Title',
  2: 'Heading1',
  3: 'Heading2',
  4: 'Heading3',
  5: 'Heading4',
};

/**
 * Converts an mdast AST to an array of docx elements (Paragraphs and Tables)
 */
export function convertMdastToDocx(mdast: Root): DocxElement[] {
  const elements: DocxElement[] = [];

  for (const node of mdast.children) {
    const converted = convertNode(node);
    elements.push(...converted);
  }

  return elements;
}

/**
 * Math node type from remark-math
 */
interface MathNode {
  type: 'math';
  value: string;
  meta?: string | null;
}

/**
 * Converts a single mdast node to docx element(s)
 */
function convertNode(node: Content): DocxElement[] {
  switch (node.type) {
    case 'heading':
      return [convertHeading(node)];
    case 'paragraph':
      return [convertParagraph(node)];
    case 'list':
      return convertList(node);
    case 'table':
      return [convertTable(node as MdTable)];
    case 'html':
      return convertHtmlBlock(node as Html);
    case 'math':
      return [convertMath(node as unknown as MathNode)];
    case 'blockquote':
      return convertBlockquote(node as Blockquote);
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
    style: 'BodyText',
    children: runs,
  });
}

function convertHtmlBlock(node: Html): Paragraph[] {
  const lines = node.value.replace(/\r\n/g, '\n').split('\n');
  return lines.map((line) => {
    return new Paragraph({
      style: 'BodyText',
      children: [new TextRun({ text: line })],
    });
  });
}

// Blockquote left indent: approximately 1cm = 567 twips
const BLOCKQUOTE_INDENT = 567;

/**
 * Converts a blockquote node to docx Paragraph(s)
 * Blockquote content is indented from the left margin
 */
function convertBlockquote(node: Blockquote, level: number = 1): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const indent = BLOCKQUOTE_INDENT * level;

  for (const child of node.children) {
    if (child.type === 'paragraph') {
      const runs = convertPhrasingContent(child.children);
      paragraphs.push(
        new Paragraph({
          style: 'BodyText',
          children: runs,
          indent: {
            left: indent,
            firstLine: 0, // No first line indent for blockquotes
          },
        })
      );
    } else if (child.type === 'blockquote') {
      // Nested blockquote - recurse with increased level
      const nested = convertBlockquote(child, level + 1);
      paragraphs.push(...nested);
    } else if (child.type === 'list') {
      // Lists inside blockquotes - convert and adjust indent
      const listParagraphs = convertBlockquoteList(child, indent);
      paragraphs.push(...listParagraphs);
    }
  }

  return paragraphs;
}

/**
 * Converts a list inside a blockquote with additional left indent
 */
function convertBlockquoteList(node: List, baseIndent: number, level: number = 0): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const isOrdered = node.ordered ?? false;
  const startNum = node.start ?? 1;

  node.children.forEach((item, index) => {
    const itemParagraphs = convertBlockquoteListItem(
      item,
      isOrdered,
      startNum + index,
      baseIndent,
      level
    );
    paragraphs.push(...itemParagraphs);
  });

  return paragraphs;
}

/**
 * Converts a list item inside a blockquote
 */
function convertBlockquoteListItem(
  item: ListItem,
  isOrdered: boolean,
  number: number,
  baseIndent: number,
  level: number
): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const prefix = isOrdered ? `${number}. ` : '• ';

  item.children.forEach((child, childIndex) => {
    if (child.type === 'paragraph') {
      const runs = convertPhrasingContent(child.children);

      if (childIndex === 0) {
        runs.unshift(new TextRun({ text: prefix }));
      }

      paragraphs.push(
        new Paragraph({
          style: 'ListParagraph',
          children: runs,
          indent: {
            left: baseIndent,
            firstLine: LIST_INDENT_BASE + LIST_INDENT_BASE * level,
          },
        })
      );
    } else if (child.type === 'list') {
      const nestedParagraphs = convertBlockquoteList(child, baseIndent, level + 1);
      paragraphs.push(...nestedParagraphs);
    }
  });

  return paragraphs;
}

/**
 * Converts a math node to a centered paragraph with native Word equation
 * Uses LaTeX → MathML → OMML → docx Math pipeline
 */
function convertMath(node: MathNode): Paragraph {
  try {
    const mathObj = latexToDocxMath(node.value, true);

    return new Paragraph({
      style: 'Formula',
      children: [mathObj],
    });
  } catch (error) {
    // Fallback: render formula as plain text if conversion fails
    console.warn('Formula conversion failed, using text fallback:', error);
    return new Paragraph({
      style: 'Formula',
      children: [
        new TextRun({
          text: `[公式: ${node.value}]`,
          italics: true,
        }),
      ],
    });
  }
}

// Base indent for lists: 2 chars = 640 twips
const LIST_INDENT_BASE = 640;

/**
 * Converts a list node to multiple docx Paragraphs
 */
function convertList(node: List, level: number = 0): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const isOrdered = node.ordered ?? false;
  const startNum = node.start ?? 1;

  node.children.forEach((item, index) => {
    const itemParagraphs = convertListItem(item, isOrdered, startNum + index, level);
    paragraphs.push(...itemParagraphs);
  });

  return paragraphs;
}

/**
 * Converts a list item to docx Paragraph(s)
 * List items can contain multiple paragraphs or nested lists
 */
function convertListItem(
  item: ListItem,
  isOrdered: boolean,
  number: number,
  level: number
): Paragraph[] {
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

      // Level 0: use style's firstLine indent (首行缩进 2字符)
      // Level 1+: add additional firstLine indent for nesting
      paragraphs.push(
        new Paragraph({
          style: 'ListParagraph',
          children: runs,
          indent:
            level > 0 ? { firstLine: LIST_INDENT_BASE + LIST_INDENT_BASE * level } : undefined,
        })
      );
    } else if (child.type === 'list') {
      // Handle nested lists with increased indentation
      const nestedParagraphs = convertList(child, level + 1);
      paragraphs.push(...nestedParagraphs);
    }
  });

  return paragraphs;
}

/**
 * Converts an array of phrasing content (inline elements) to ParagraphChild array
 * Returns TextRun for text, Math for inline formulas
 */
function convertPhrasingContent(nodes: PhrasingContent[]): ParagraphChild[] {
  const runs: ParagraphChild[] = [];

  for (const node of nodes) {
    runs.push(...convertPhrasingNode(node));
  }

  return runs;
}

/**
 * Inline math node type from remark-math
 */
interface InlineMathNode {
  type: 'inlineMath';
  value: string;
}

/**
 * Converts a single phrasing content node to ParagraphChild(s)
 * Returns TextRun for text, Math for inline formulas
 */
function convertPhrasingNode(node: PhrasingContent): ParagraphChild[] {
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

    case 'inlineMath': {
      // Render inline math as native Word equation
      try {
        const mathObj = latexToDocxMath((node as unknown as InlineMathNode).value, false);
        return [mathObj];
      } catch {
        // Fallback to italic text if conversion fails
        return [new TextRun({ text: (node as unknown as InlineMathNode).value, italics: true })];
      }
    }

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

/**
 * Standard table border style
 */
const TABLE_BORDERS = {
  top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
  left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
  right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
  insideVertical: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
};

/**
 * Converts a markdown table to a docx Table
 */
function convertTable(node: MdTable): Table {
  const rows = node.children as MdTableRow[];
  const alignments = node.align || [];

  const tableRows = rows.map((row, rowIndex) => {
    const isHeader = rowIndex === 0;
    return convertTableRow(row, isHeader, alignments);
  });

  return new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    borders: TABLE_BORDERS,
    rows: tableRows,
  });
}

/**
 * Converts a markdown table row to a docx TableRow
 */
function convertTableRow(
  row: MdTableRow,
  isHeader: boolean,
  alignments: (string | null)[]
): TableRow {
  const cells = row.children as MdTableCell[];

  const tableCells = cells.map((cell, cellIndex) => {
    return convertTableCell(cell, isHeader, alignments[cellIndex]);
  });

  return new TableRow({
    tableHeader: isHeader,
    children: tableCells,
  });
}

/**
 * Converts a markdown table cell to a docx TableCell
 * Always centers content both horizontally and vertically for 公文 style
 */
function convertTableCell(
  cell: MdTableCell,
  isHeader: boolean,
  _alignment: string | null
): TableCell {
  // Convert cell content - apply bold style for headers
  const runs = isHeader
    ? convertStyledContent(cell.children as PhrasingContent[], { bold: true })
    : convertPhrasingContent(cell.children as PhrasingContent[]);

  return new TableCell({
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        style: isHeader ? 'TableCaption' : 'TableText',
        alignment: AlignmentType.CENTER,
        children: runs,
      }),
    ],
  });
}
