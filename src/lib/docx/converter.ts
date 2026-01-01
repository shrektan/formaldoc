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
} from 'docx';
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

      paragraphs.push(
        new Paragraph({
          style: 'ListParagraph',
          children: runs,
        })
      );
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
 */
function convertTableCell(
  cell: MdTableCell,
  isHeader: boolean,
  alignment: string | null
): TableCell {
  // Get alignment for the cell
  const docxAlignment =
    alignment === 'left'
      ? AlignmentType.LEFT
      : alignment === 'right'
        ? AlignmentType.RIGHT
        : AlignmentType.CENTER;

  // Convert cell content - apply bold style for headers
  const runs = isHeader
    ? convertStyledContent(cell.children as PhrasingContent[], { bold: true })
    : convertPhrasingContent(cell.children as PhrasingContent[]);

  return new TableCell({
    children: [
      new Paragraph({
        style: isHeader ? 'TableCaption' : 'TableText',
        alignment: docxAlignment,
        children: runs,
      }),
    ],
  });
}
