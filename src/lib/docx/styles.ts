import { convertMillimetersToTwip, IStylesOptions } from 'docx';

/**
 * GB/T 9704-2012 Chinese Government Document Format Specifications
 * Font specifications for party and government official documents
 */

// Font family definitions for Chinese documents
export const GB_FONTS = {
  // Body text: 仿宋体 (FangSong)
  FANGSONG: {
    ascii: 'FangSong',
    eastAsia: 'FangSong',
    hAnsi: 'FangSong',
  },
  // Document title: 小标宋体 (XiaoBiaoSong) - fallback to SimSun
  XIAOBIAOSONG: {
    ascii: 'STXiaobiaoSong',
    eastAsia: 'STXiaobiaoSong',
    hAnsi: 'STXiaobiaoSong',
  },
  // Heading Level 1: 黑体 (SimHei)
  SIMHEI: {
    ascii: 'SimHei',
    eastAsia: 'SimHei',
    hAnsi: 'SimHei',
  },
  // Heading Level 2: 楷体 (KaiTi)
  KAITI: {
    ascii: 'KaiTi',
    eastAsia: 'KaiTi',
    hAnsi: 'KaiTi',
  },
};

// Chinese font sizes (in half-points, Word uses half-points internally)
// 号数 (hao) is Chinese font size system
export const GB_FONT_SIZES = {
  SIZE_2HAO: 44,  // 2号 = 22pt = 44 half-points (for title)
  SIZE_3HAO: 32,  // 3号 ≈ 16pt = 32 half-points (for body and headings)
};

// A4 page dimensions and margins per GB/T 9704-2012
export const GB_PAGE = {
  // A4: 210mm × 297mm
  WIDTH: convertMillimetersToTwip(210),
  HEIGHT: convertMillimetersToTwip(297),

  // Margins as specified in the standard
  MARGIN_TOP: convertMillimetersToTwip(37),    // 天头 (top margin)
  MARGIN_LEFT: convertMillimetersToTwip(28),   // 订口 (left/binding margin)
  MARGIN_BOTTOM: convertMillimetersToTwip(35), // Derived: 297 - 37 - 225 = 35mm
  MARGIN_RIGHT: convertMillimetersToTwip(26),  // Derived: 210 - 28 - 156 = 26mm
};

// Line spacing: 22 lines in 225mm body height
// 225mm / 22 ≈ 10.23mm per line
const LINE_SPACING = convertMillimetersToTwip(10.23);

// Two-character indent (approximately 8.4mm for 3号 font)
const TWO_CHAR_INDENT = convertMillimetersToTwip(8.4);

/**
 * Creates Word document styles following GB/T 9704-2012 specifications
 * These styles can be modified by users in Word's "Styles" pane
 */
export function createDocumentStyles(): IStylesOptions {
  return {
    paragraphStyles: [
      // Normal body text - 3号仿宋体
      {
        id: 'Normal',
        name: 'Normal',
        run: {
          font: GB_FONTS.FANGSONG,
          size: GB_FONT_SIZES.SIZE_3HAO,
        },
        paragraph: {
          spacing: {
            line: LINE_SPACING,
            before: 0,
            after: 0,
          },
          indent: {
            firstLine: TWO_CHAR_INDENT, // 每个自然段左空二字
          },
        },
      },

      // Document Title - 2号小标宋体, centered
      {
        id: 'Title',
        name: 'Title',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: {
          font: GB_FONTS.XIAOBIAOSONG,
          size: GB_FONT_SIZES.SIZE_2HAO,
          bold: true,
        },
        paragraph: {
          alignment: 'center',
          spacing: {
            before: convertMillimetersToTwip(10),
            after: convertMillimetersToTwip(10),
            line: LINE_SPACING,
          },
          indent: {
            firstLine: 0, // No indent for title
          },
        },
      },

      // Heading 1 - 一、二、三、 style (3号黑体)
      {
        id: 'Heading1',
        name: 'Heading 1',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: {
          font: GB_FONTS.SIMHEI,
          size: GB_FONT_SIZES.SIZE_3HAO,
        },
        paragraph: {
          spacing: {
            before: convertMillimetersToTwip(5),
            after: convertMillimetersToTwip(2),
            line: LINE_SPACING,
          },
          indent: {
            firstLine: 0, // Heading markers typically not indented
          },
        },
      },

      // Heading 2 - （一）（二）（三） style (3号楷体)
      {
        id: 'Heading2',
        name: 'Heading 2',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: {
          font: GB_FONTS.KAITI,
          size: GB_FONT_SIZES.SIZE_3HAO,
        },
        paragraph: {
          spacing: {
            before: convertMillimetersToTwip(3),
            after: convertMillimetersToTwip(2),
            line: LINE_SPACING,
          },
          indent: {
            firstLine: TWO_CHAR_INDENT,
          },
        },
      },

      // Heading 3 - 1. 2. 3. style (3号仿宋体, bold)
      {
        id: 'Heading3',
        name: 'Heading 3',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: {
          font: GB_FONTS.FANGSONG,
          size: GB_FONT_SIZES.SIZE_3HAO,
          bold: true,
        },
        paragraph: {
          spacing: {
            before: convertMillimetersToTwip(2),
            after: convertMillimetersToTwip(1),
            line: LINE_SPACING,
          },
          indent: {
            firstLine: TWO_CHAR_INDENT,
          },
        },
      },

      // Heading 4 - （1）（2）（3） style (3号仿宋体)
      {
        id: 'Heading4',
        name: 'Heading 4',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: {
          font: GB_FONTS.FANGSONG,
          size: GB_FONT_SIZES.SIZE_3HAO,
        },
        paragraph: {
          spacing: {
            before: convertMillimetersToTwip(1),
            after: convertMillimetersToTwip(1),
            line: LINE_SPACING,
          },
          indent: {
            firstLine: TWO_CHAR_INDENT,
          },
        },
      },

      // List Paragraph style for bullet/numbered lists
      {
        id: 'ListParagraph',
        name: 'List Paragraph',
        basedOn: 'Normal',
        quickFormat: true,
        run: {
          font: GB_FONTS.FANGSONG,
          size: GB_FONT_SIZES.SIZE_3HAO,
        },
        paragraph: {
          spacing: {
            line: LINE_SPACING,
          },
          indent: {
            left: TWO_CHAR_INDENT,
            hanging: convertMillimetersToTwip(4.2), // Hanging indent for bullet
            firstLine: 0,
          },
        },
      },
    ],
  };
}
