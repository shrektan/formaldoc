/**
 * Style settings types for document generation
 */

// Available Chinese fonts
export type ChineseFont = '宋体' | '黑体' | '楷体' | '仿宋';

// Font size in points
export type FontSize = number;

// Individual style configuration
export interface TextStyle {
  font: ChineseFont;
  size: FontSize;
  bold?: boolean;
  italic?: boolean;
  center?: boolean;
  indent?: boolean; // Two-character first line indent
}

// All configurable styles
export interface StyleSettings {
  title: TextStyle;
  heading1: TextStyle;
  heading2: TextStyle;
  heading3: TextStyle;
  heading4: TextStyle;
  bodyText: TextStyle;
  listItem: TextStyle;
  tableHeader: TextStyle;
  tableCell: TextStyle;
  pageFooter: TextStyle;
}

// Style key type for iteration
export type StyleKey = keyof StyleSettings;

// Style metadata for UI rendering
export interface StyleMeta {
  label: string;
  allowBold?: boolean;
  allowItalic?: boolean;
  allowCenter?: boolean;
  allowIndent?: boolean;
}

export const STYLE_META: Record<StyleKey, StyleMeta> = {
  title: { label: '标题', allowBold: true, allowCenter: true },
  heading1: { label: '一级标题', allowBold: true, allowIndent: true },
  heading2: { label: '二级标题', allowBold: true, allowIndent: true },
  heading3: { label: '三级标题', allowBold: true, allowIndent: true },
  heading4: { label: '四级标题', allowBold: true, allowIndent: true },
  bodyText: { label: '正文', allowIndent: true },
  listItem: { label: '列表项', allowIndent: true },
  tableHeader: { label: '表头', allowBold: true, allowCenter: true },
  tableCell: { label: '表格内容' },
  pageFooter: { label: '页脚' },
};

// Available fonts for dropdown
export const AVAILABLE_FONTS: ChineseFont[] = ['宋体', '黑体', '楷体', '仿宋'];

// Common font sizes
export const AVAILABLE_SIZES: FontSize[] = [10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28];
