/**
 * Style settings types for document generation
 */

// Available Chinese fonts
export type ChineseFont = '宋体' | '黑体' | '楷体' | '仿宋';

// Available English fonts
export type EnglishFont = 'Times New Roman' | 'Arial' | 'Calibri' | 'Georgia';

// Union of all document fonts
export type DocumentFont = ChineseFont | EnglishFont;

// Font size in points
export type FontSize = number;

// Individual style configuration
export interface TextStyle {
  font: DocumentFont;
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
  tableCell: { label: '表格内容', allowCenter: true },
  pageFooter: { label: '页脚' },
};

// Font arrays for dropdowns
export const CHINESE_FONTS: ChineseFont[] = ['宋体', '黑体', '楷体', '仿宋'];
export const ENGLISH_FONTS: EnglishFont[] = ['Times New Roman', 'Arial', 'Calibri', 'Georgia'];

// All available fonts (for backward compatibility)
export const AVAILABLE_FONTS: DocumentFont[] = [...CHINESE_FONTS, ...ENGLISH_FONTS];

// Chinese font size convention (号) with point equivalents
export const CHINESE_FONT_SIZES: { name: string; pt: number }[] = [
  { name: '初号', pt: 42 },
  { name: '小初', pt: 36 },
  { name: '一号', pt: 26 },
  { name: '小一', pt: 24 },
  { name: '二号', pt: 22 },
  { name: '小二', pt: 18 },
  { name: '三号', pt: 16 },
  { name: '小三', pt: 15 },
  { name: '四号', pt: 14 },
  { name: '小四', pt: 12 },
  { name: '五号', pt: 10.5 },
  { name: '小五', pt: 9 },
];

// English font sizes (standard Western sizes)
export const ENGLISH_FONT_SIZES: { name: string; pt: number }[] = [
  { name: '8pt', pt: 8 },
  { name: '9pt', pt: 9 },
  { name: '10pt', pt: 10 },
  { name: '11pt', pt: 11 },
  { name: '12pt', pt: 12 },
  { name: '14pt', pt: 14 },
  { name: '16pt', pt: 16 },
  { name: '18pt', pt: 18 },
  { name: '24pt', pt: 24 },
  { name: '36pt', pt: 36 },
];

// Template types
export type TemplateName = 'cn-gov' | 'en-standard';

export interface Template {
  id: TemplateName;
  name: string;
  description: string;
  styles: StyleSettings;
  fontSizes: { name: string; pt: number }[];
  availableFonts: DocumentFont[];
}
