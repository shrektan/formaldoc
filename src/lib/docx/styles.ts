import { IStylesOptions, LineRuleType, AlignmentType } from 'docx';
import type {
  StyleSettings,
  TextStyle,
  DocumentFont,
  ChineseFont,
  EnglishFont,
  DocumentSettings,
  LineSpacingConfig,
} from '../../types/styles';
import { CHINESE_FONTS, FONT_PAIRING } from '../../types/styles';

/**
 * GB/T 9704-2012 Chinese Government Document Format Specifications
 */

// Line spacing: 560 twips = 28pt (exact)
const LINE_SPACING_EXACT = 560;

// Two character indent calculation: 2 chars × font size (pt) × 20 twips/pt
const getTwoCharIndent = (fontSize: number) => fontSize * 2 * 20;

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
 * Check if a font is a Chinese font
 */
function isChineseFont(font: string): font is ChineseFont {
  return CHINESE_FONTS.includes(font as ChineseFont);
}

/**
 * Creates a font object from a font name with optional English font override
 * For Chinese fonts: uses Chinese font for eastAsia, English font for ascii/hAnsi
 * For English fonts: uses English font for ascii/hAnsi, falls back to 宋体 for eastAsia
 */
function createFont(fontName: DocumentFont, englishFont?: EnglishFont) {
  if (isChineseFont(fontName)) {
    // Chinese font with paired or explicit English font
    const english = englishFont ?? FONT_PAIRING[fontName];
    return {
      ascii: english, // Latin characters use English font
      eastAsia: fontName, // Chinese characters use Chinese font
      hAnsi: english, // Extended Latin characters use English font
      cs: english, // Complex scripts use English font
    };
  } else {
    // English font - use for ascii/hAnsi, fallback to 宋体 for eastAsia (Chinese characters)
    return {
      ascii: fontName,
      eastAsia: '宋体',
      hAnsi: fontName,
      cs: fontName,
    };
  }
}

/**
 * Creates footer font object from style settings
 */
export function createFooterFont(settings: StyleSettings) {
  return createFont(settings.pageFooter.font, settings.pageFooter.englishFont);
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
 * Default line spacing config (CN Government standard: 28pt exact)
 */
const DEFAULT_LINE_SPACING: LineSpacingConfig = {
  type: 'exact',
  value: LINE_SPACING_EXACT,
};

/**
 * Converts LineSpacingConfig to docx format
 */
function getLineSpacing(config: LineSpacingConfig) {
  return {
    line: config.value,
    lineRule: config.type === 'exact' ? LineRuleType.EXACT : LineRuleType.AUTO,
  };
}

/**
 * Creates Word document styles from user settings
 */
export function createDocumentStyles(
  settings: StyleSettings,
  documentSettings?: DocumentSettings
): IStylesOptions {
  const getIndent = (style: TextStyle) => (style.indent ? getTwoCharIndent(style.size) : 0);
  const getAlignment = (style: TextStyle) =>
    style.center ? AlignmentType.CENTER : AlignmentType.BOTH;

  // Use document settings or default to CN Government standard
  const lineSpacingConfig = documentSettings?.lineSpacing ?? DEFAULT_LINE_SPACING;
  const spacing = getLineSpacing(lineSpacingConfig);
  const spacingAfter = documentSettings?.spacingAfter ?? 0;

  return {
    paragraphStyles: [
      // Normal style (base for others)
      {
        id: 'Normal',
        name: 'Normal',
        run: {
          font: createFont(settings.bodyText.font, settings.bodyText.englishFont),
          size: ptToHalfPoints(settings.bodyText.size),
        },
        paragraph: {
          spacing: {
            after: spacingAfter,
            line: spacing.line,
            lineRule: spacing.lineRule,
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
          font: createFont(settings.title.font, settings.title.englishFont),
          size: ptToHalfPoints(settings.title.size),
          bold: settings.title.bold,
        },
        paragraph: {
          alignment: getAlignment(settings.title),
          spacing: {
            before: 560,
            after: 560,
            line: spacing.line,
            lineRule: spacing.lineRule,
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
          font: createFont(settings.heading1.font, settings.heading1.englishFont),
          size: ptToHalfPoints(settings.heading1.size),
          bold: settings.heading1.bold,
        },
        paragraph: {
          outlineLevel: 0, // 一级
          spacing: {
            after: spacingAfter,
            line: spacing.line,
            lineRule: spacing.lineRule,
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
          font: createFont(settings.heading2.font, settings.heading2.englishFont),
          size: ptToHalfPoints(settings.heading2.size),
          bold: settings.heading2.bold,
        },
        paragraph: {
          outlineLevel: 1, // 二级
          spacing: {
            after: spacingAfter,
            line: spacing.line,
            lineRule: spacing.lineRule,
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
          font: createFont(settings.heading3.font, settings.heading3.englishFont),
          size: ptToHalfPoints(settings.heading3.size),
          bold: settings.heading3.bold,
        },
        paragraph: {
          outlineLevel: 2, // 三级
          spacing: {
            after: spacingAfter,
            line: spacing.line,
            lineRule: spacing.lineRule,
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
          font: createFont(settings.heading4.font, settings.heading4.englishFont),
          size: ptToHalfPoints(settings.heading4.size),
          bold: settings.heading4.bold,
        },
        paragraph: {
          outlineLevel: 3, // 四级
          spacing: {
            after: spacingAfter,
            line: spacing.line,
            lineRule: spacing.lineRule,
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
          font: createFont(settings.bodyText.font, settings.bodyText.englishFont),
          size: ptToHalfPoints(settings.bodyText.size),
        },
        paragraph: {
          alignment: AlignmentType.BOTH,
          spacing: {
            after: spacingAfter,
            line: spacing.line,
            lineRule: spacing.lineRule,
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
          font: createFont(settings.listItem.font, settings.listItem.englishFont),
          size: ptToHalfPoints(settings.listItem.size),
        },
        paragraph: {
          spacing: {
            after: spacingAfter,
            line: spacing.line,
            lineRule: spacing.lineRule,
          },
          indent: {
            firstLine: getIndent(settings.listItem),
          },
        },
      },

      // Block Quote - indented text for quotations
      {
        id: 'BlockQuote',
        name: 'Block Quote',
        basedOn: 'BodyText',
        quickFormat: true,
        run: {
          font: createFont(settings.blockquote.font, settings.blockquote.englishFont),
          size: ptToHalfPoints(settings.blockquote.size),
          italics: settings.blockquote.italic,
        },
        paragraph: {
          spacing: {
            after: spacingAfter,
            line: spacing.line,
            lineRule: spacing.lineRule,
          },
          indent: {
            left: 567, // ~1cm left indent for quotes
            firstLine: 0, // No first line indent
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
          font: createFont(settings.tableHeader.font, settings.tableHeader.englishFont),
          size: ptToHalfPoints(settings.tableHeader.size),
          bold: settings.tableHeader.bold,
        },
        paragraph: {
          alignment: getAlignment(settings.tableHeader),
          spacing: {
            line: 240, // 单倍行距
            lineRule: LineRuleType.AUTO,
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
          font: createFont(settings.tableCell.font, settings.tableCell.englishFont),
          size: ptToHalfPoints(settings.tableCell.size),
        },
        paragraph: {
          alignment: getAlignment(settings.tableCell),
          spacing: {
            line: 240, // 单倍行距
            lineRule: LineRuleType.AUTO,
          },
          indent: {
            firstLine: 0,
          },
        },
      },

      // Formula style for math equations
      {
        id: 'Formula',
        name: 'Formula',
        basedOn: 'Normal',
        quickFormat: true,
        run: {
          font: {
            ascii: 'Cambria Math',
            eastAsia: '宋体',
            hAnsi: 'Cambria Math',
            cs: 'Cambria Math',
          },
          size: ptToHalfPoints(settings.bodyText.size),
        },
        paragraph: {
          alignment: AlignmentType.CENTER,
          spacing: {
            line: 240, // 单倍行距 (single line spacing)
            lineRule: LineRuleType.AUTO,
            before: 120,
            after: 120,
          },
          indent: {
            firstLine: 0,
          },
        },
      },
    ],
    characterStyles: [
      // Hyperlink style for links
      {
        id: 'Hyperlink',
        name: 'Hyperlink',
        run: {
          color: '0563C1', // Standard Word hyperlink blue
          underline: {
            type: 'single',
          },
        },
      },
    ],
  };
}
