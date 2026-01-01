import { IStylesOptions, LineRuleType, AlignmentType } from 'docx';
import type { StyleSettings, TextStyle, ChineseFont } from '../../types/styles';

/**
 * GB/T 9704-2012 Chinese Government Document Format Specifications
 */

// Line spacing: 560 twips = 28pt (exact)
const LINE_SPACING_EXACT = 560;

// Two character indent: 2 chars × 16pt = 32pt = 640 twips
const TWO_CHAR_INDENT = 640;

// A4 page dimensions and margins (all margins 2.54cm / 1 inch)
export const GB_PAGE = {
  WIDTH: 11906,
  HEIGHT: 16838,
  MARGIN_TOP: 1440,
  MARGIN_BOTTOM: 1440,
  MARGIN_LEFT: 1440,
  MARGIN_RIGHT: 1440,
  HEADER: 851,
  FOOTER: 992,
};

/**
 * Creates a font object from a Chinese font name
 */
function createFont(fontName: ChineseFont) {
  return {
    ascii: fontName,
    eastAsia: fontName,
    hAnsi: fontName,
    cs: '宋体',
  };
}

/**
 * Creates footer font object from style settings
 */
export function createFooterFont(settings: StyleSettings) {
  return createFont(settings.pageFooter.font);
}

/**
 * Gets footer font size in half-points from style settings
 */
export function getFooterSize(settings: StyleSettings): number {
  return settings.pageFooter.size * 2;
}

/**
 * Converts pt to half-points (Word uses half-points)
 */
function ptToHalfPoints(pt: number): number {
  return pt * 2;
}

/**
 * Creates Word document styles from user settings
 */
export function createDocumentStyles(settings: StyleSettings): IStylesOptions {
  const getIndent = (style: TextStyle) => (style.indent ? TWO_CHAR_INDENT : 0);
  const getAlignment = (style: TextStyle) =>
    style.center ? AlignmentType.CENTER : AlignmentType.BOTH;

  return {
    paragraphStyles: [
      // Normal style (base for others)
      {
        id: 'Normal',
        name: 'Normal',
        run: {
          font: createFont(settings.bodyText.font),
          size: ptToHalfPoints(settings.bodyText.size),
        },
        paragraph: {
          spacing: {
            line: LINE_SPACING_EXACT,
            lineRule: LineRuleType.EXACT,
          },
        },
      },

      // Title
      {
        id: 'Title',
        name: 'Title',
        basedOn: 'Normal',
        next: 'BodyText',
        quickFormat: true,
        run: {
          font: createFont(settings.title.font),
          size: ptToHalfPoints(settings.title.size),
          bold: settings.title.bold,
        },
        paragraph: {
          alignment: getAlignment(settings.title),
          spacing: {
            before: 560,
            after: 560,
            line: LINE_SPACING_EXACT,
            lineRule: LineRuleType.EXACT,
          },
        },
      },

      // Heading 1 - 大纲级别: 一级
      {
        id: 'Heading1',
        name: 'Heading 1',
        basedOn: 'Normal',
        next: 'BodyText',
        quickFormat: true,
        run: {
          font: createFont(settings.heading1.font),
          size: ptToHalfPoints(settings.heading1.size),
          bold: settings.heading1.bold,
        },
        paragraph: {
          outlineLevel: 0, // 一级
          spacing: {
            line: LINE_SPACING_EXACT,
            lineRule: LineRuleType.EXACT,
          },
          indent: {
            firstLine: getIndent(settings.heading1),
          },
          keepNext: true,
          keepLines: true,
        },
      },

      // Heading 2 - 大纲级别: 二级
      {
        id: 'Heading2',
        name: 'Heading 2',
        basedOn: 'Normal',
        next: 'BodyText',
        quickFormat: true,
        run: {
          font: createFont(settings.heading2.font),
          size: ptToHalfPoints(settings.heading2.size),
          bold: settings.heading2.bold,
        },
        paragraph: {
          outlineLevel: 1, // 二级
          spacing: {
            line: LINE_SPACING_EXACT,
            lineRule: LineRuleType.EXACT,
          },
          indent: {
            firstLine: getIndent(settings.heading2),
          },
          keepNext: true,
          keepLines: true,
        },
      },

      // Heading 3 - 大纲级别: 三级
      {
        id: 'Heading3',
        name: 'Heading 3',
        basedOn: 'Normal',
        next: 'BodyText',
        quickFormat: true,
        run: {
          font: createFont(settings.heading3.font),
          size: ptToHalfPoints(settings.heading3.size),
          bold: settings.heading3.bold,
        },
        paragraph: {
          outlineLevel: 2, // 三级
          spacing: {
            line: LINE_SPACING_EXACT,
            lineRule: LineRuleType.EXACT,
          },
          indent: {
            firstLine: getIndent(settings.heading3),
          },
          keepNext: true,
          keepLines: true,
        },
      },

      // Heading 4 - 大纲级别: 四级
      {
        id: 'Heading4',
        name: 'Heading 4',
        basedOn: 'Normal',
        next: 'BodyText',
        quickFormat: true,
        run: {
          font: createFont(settings.heading4.font),
          size: ptToHalfPoints(settings.heading4.size),
          bold: settings.heading4.bold,
        },
        paragraph: {
          outlineLevel: 3, // 四级
          spacing: {
            line: LINE_SPACING_EXACT,
            lineRule: LineRuleType.EXACT,
          },
          indent: {
            firstLine: getIndent(settings.heading4),
          },
          keepNext: true,
          keepLines: true,
        },
      },

      // Body Text
      {
        id: 'BodyText',
        name: 'Body Text',
        basedOn: 'Normal',
        quickFormat: true,
        run: {
          font: createFont(settings.bodyText.font),
          size: ptToHalfPoints(settings.bodyText.size),
        },
        paragraph: {
          alignment: AlignmentType.BOTH,
          spacing: {
            line: LINE_SPACING_EXACT,
            lineRule: LineRuleType.EXACT,
          },
          indent: {
            firstLine: getIndent(settings.bodyText),
          },
        },
      },

      // List Paragraph
      {
        id: 'ListParagraph',
        name: 'List Paragraph',
        basedOn: 'BodyText',
        quickFormat: true,
        run: {
          font: createFont(settings.listItem.font),
          size: ptToHalfPoints(settings.listItem.size),
        },
        paragraph: {
          spacing: {
            line: LINE_SPACING_EXACT,
            lineRule: LineRuleType.EXACT,
          },
          indent: {
            firstLine: getIndent(settings.listItem),
          },
        },
      },

      // Table Caption (Table Header) - always keepNext: true
      {
        id: 'TableCaption',
        name: 'Caption',
        basedOn: 'BodyText',
        quickFormat: true,
        run: {
          font: createFont(settings.tableHeader.font),
          size: ptToHalfPoints(settings.tableHeader.size),
          bold: settings.tableHeader.bold,
        },
        paragraph: {
          alignment: getAlignment(settings.tableHeader),
          spacing: {
            line: LINE_SPACING_EXACT,
            lineRule: LineRuleType.EXACT,
          },
          indent: {
            firstLine: 0,
          },
          keepNext: true,
        },
      },

      // Table Text
      {
        id: 'TableText',
        name: 'Table Text',
        basedOn: 'Normal',
        quickFormat: true,
        run: {
          font: createFont(settings.tableCell.font),
          size: ptToHalfPoints(settings.tableCell.size),
        },
        paragraph: {
          alignment: getAlignment(settings.tableCell),
          spacing: {
            line: LINE_SPACING_EXACT,
            lineRule: LineRuleType.EXACT,
          },
          indent: {
            firstLine: 0,
          },
        },
      },
    ],
  };
}
