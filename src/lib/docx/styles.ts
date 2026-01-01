import { convertMillimetersToTwip, IStylesOptions, LineRuleType, AlignmentType } from 'docx';

/**
 * GB/T 9704-2012 Chinese Government Document Format Specifications
 * Based on user's extracted format specifications
 */

// Font family definitions for Chinese documents
const FONTS = {
  // Title font: 宋体-繁 / 宋体
  TITLE: {
    ascii: '宋体-繁',
    eastAsia: '宋体',
    hAnsi: '宋体-繁',
    cs: 'Times New Roman',
  },
  // Heading 1: 黑体
  HEITI: {
    ascii: '黑体',
    eastAsia: '黑体',
    hAnsi: '黑体',
    cs: '宋体',
  },
  // Heading 2: 仿宋 + 楷体 (eastAsia)
  HEADING2: {
    ascii: '仿宋',
    eastAsia: '楷体',
    hAnsi: '仿宋',
    cs: '宋体',
  },
  // Body text and Heading 3/4: 仿宋
  FANGSONG: {
    ascii: '仿宋',
    eastAsia: '仿宋',
    hAnsi: '仿宋',
    cs: '宋体',
  },
};

// Footer font: 仿宋 12pt (exported for use in generator)
export const FOOTER_FONT = {
  ascii: '仿宋',
  eastAsia: '仿宋',
  hAnsi: '仿宋',
};

// Font sizes in half-points (Word uses half-points)
const FONT_SIZES = {
  TITLE: 44, // 22pt for title
  BODY: 32, // 16pt for body and headings
  TABLE_TITLE: 28, // 14pt for table titles
  TABLE_TEXT: 24, // 12pt for table text
};

// Line spacing: 560 twips = 28pt (exact)
const LINE_SPACING_EXACT = 560;

// Two character indent: 2 chars × 16pt = 32pt = 640 twips
const TWO_CHAR_INDENT = 640;

// A4 page dimensions and margins per GB/T 9704-2012
export const GB_PAGE = {
  WIDTH: convertMillimetersToTwip(210),
  HEIGHT: convertMillimetersToTwip(297),
  MARGIN_TOP: convertMillimetersToTwip(37),
  MARGIN_LEFT: convertMillimetersToTwip(28),
  MARGIN_BOTTOM: convertMillimetersToTwip(35),
  MARGIN_RIGHT: convertMillimetersToTwip(26),
};

/**
 * Creates Word document styles following the user's format specifications
 * These styles appear in Word's "Styles" pane for easy editing
 */
export function createDocumentStyles(): IStylesOptions {
  return {
    paragraphStyles: [
      // Normal style (base for others)
      {
        id: 'Normal',
        name: 'Normal',
        run: {
          font: FONTS.FANGSONG,
          size: FONT_SIZES.BODY,
        },
        paragraph: {
          spacing: {
            line: LINE_SPACING_EXACT,
            lineRule: LineRuleType.EXACT,
          },
        },
      },

      // 公文标题 (Document Title)
      {
        id: 'Title',
        name: 'Title',
        basedOn: 'Normal',
        next: 'BodyText',
        quickFormat: true,
        run: {
          font: FONTS.TITLE,
          size: FONT_SIZES.TITLE,
          bold: true,
        },
        paragraph: {
          alignment: AlignmentType.CENTER,
          spacing: {
            before: 560,
            after: 560,
            line: LINE_SPACING_EXACT,
            lineRule: LineRuleType.EXACT,
          },
        },
      },

      // 公文一级标题 (Heading 1 - 一、二、三)
      {
        id: 'Heading1',
        name: 'Heading 1',
        basedOn: 'Normal',
        next: 'BodyText',
        quickFormat: true,
        run: {
          font: FONTS.HEITI,
          size: FONT_SIZES.BODY,
          bold: false,
        },
        paragraph: {
          spacing: {
            line: LINE_SPACING_EXACT,
            lineRule: LineRuleType.EXACT,
          },
          indent: {
            firstLine: TWO_CHAR_INDENT,
          },
          keepNext: true,
          keepLines: true,
        },
      },

      // 公文二级标题 (Heading 2 - （一）（二）（三）)
      {
        id: 'Heading2',
        name: 'Heading 2',
        basedOn: 'Normal',
        next: 'BodyText',
        quickFormat: true,
        run: {
          font: FONTS.HEADING2,
          size: FONT_SIZES.BODY,
        },
        paragraph: {
          spacing: {
            line: LINE_SPACING_EXACT,
            lineRule: LineRuleType.EXACT,
          },
          indent: {
            firstLine: TWO_CHAR_INDENT,
          },
          keepNext: true,
          keepLines: true,
        },
      },

      // 公文三级标题 (Heading 3 - 1. 2. 3.)
      {
        id: 'Heading3',
        name: 'Heading 3',
        basedOn: 'Normal',
        next: 'BodyText',
        quickFormat: true,
        run: {
          font: FONTS.FANGSONG,
          size: FONT_SIZES.BODY,
          bold: true,
        },
        paragraph: {
          spacing: {
            line: LINE_SPACING_EXACT,
            lineRule: LineRuleType.EXACT,
          },
          indent: {
            firstLine: TWO_CHAR_INDENT,
          },
        },
      },

      // 公文四级标题 (Heading 4 - （1）（2）（3）)
      {
        id: 'Heading4',
        name: 'Heading 4',
        basedOn: 'Normal',
        next: 'BodyText',
        quickFormat: true,
        run: {
          font: FONTS.FANGSONG,
          size: FONT_SIZES.BODY,
          bold: true,
        },
        paragraph: {
          spacing: {
            line: LINE_SPACING_EXACT,
            lineRule: LineRuleType.EXACT,
          },
          indent: {
            firstLine: TWO_CHAR_INDENT,
          },
        },
      },

      // 公文正文 (Body Text)
      {
        id: 'BodyText',
        name: 'Body Text',
        basedOn: 'Normal',
        quickFormat: true,
        run: {
          font: FONTS.FANGSONG,
          size: FONT_SIZES.BODY,
        },
        paragraph: {
          alignment: AlignmentType.BOTH,
          spacing: {
            line: LINE_SPACING_EXACT,
            lineRule: LineRuleType.EXACT,
          },
          indent: {
            firstLine: TWO_CHAR_INDENT,
          },
        },
      },

      // List Paragraph (for bullet/numbered lists)
      {
        id: 'ListParagraph',
        name: 'List Paragraph',
        basedOn: 'BodyText',
        quickFormat: true,
        run: {
          font: FONTS.FANGSONG,
          size: FONT_SIZES.BODY,
        },
        paragraph: {
          spacing: {
            line: LINE_SPACING_EXACT,
            lineRule: LineRuleType.EXACT,
          },
          indent: {
            firstLine: TWO_CHAR_INDENT,
          },
        },
      },

      // 表格标题 (Table Caption)
      {
        id: 'TableCaption',
        name: 'Caption',
        basedOn: 'BodyText',
        quickFormat: true,
        run: {
          font: FONTS.FANGSONG,
          size: FONT_SIZES.TABLE_TITLE,
          bold: true,
        },
        paragraph: {
          alignment: AlignmentType.CENTER,
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

      // 表格文字 (Table Text)
      {
        id: 'TableText',
        name: 'Table Text',
        basedOn: 'Normal',
        quickFormat: true,
        run: {
          font: FONTS.FANGSONG,
          size: FONT_SIZES.TABLE_TEXT,
        },
        paragraph: {
          alignment: AlignmentType.CENTER,
          spacing: {
            line: 240,
            lineRule: LineRuleType.AUTO,
          },
          indent: {
            firstLine: 0,
          },
        },
      },
    ],
  };
}
