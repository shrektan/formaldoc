import type { Template, TemplateName, StyleSettings, DocumentFont } from '../../types/styles';
import {
  CHINESE_FONTS,
  ENGLISH_FONTS,
  CHINESE_FONT_SIZES,
  ENGLISH_FONT_SIZES,
} from '../../types/styles';

/**
 * CN Government template (GB/T 9704-2012)
 * Chinese Government Document Format Specifications
 */
const CN_GOV_STYLES: StyleSettings = {
  // 公文标题: 宋体 22pt, bold, centered
  title: {
    font: '宋体',
    size: 22,
    bold: true,
    center: true,
  },

  // 一级标题 (一、二、三): 黑体 16pt
  heading1: {
    font: '黑体',
    size: 16,
    bold: false,
    indent: true,
  },

  // 二级标题 (（一）（二）): 楷体 16pt
  heading2: {
    font: '楷体',
    size: 16,
    bold: false,
    indent: true,
  },

  // 三级标题 (1. 2. 3.): 仿宋 16pt, bold
  heading3: {
    font: '仿宋',
    size: 16,
    bold: true,
    indent: true,
  },

  // 四级标题 (（1）（2）): 仿宋 16pt, bold
  heading4: {
    font: '仿宋',
    size: 16,
    bold: true,
    indent: true,
  },

  // 正文: 仿宋 16pt
  bodyText: {
    font: '仿宋',
    size: 16,
    indent: true,
  },

  // 列表项: 仿宋 16pt
  listItem: {
    font: '仿宋',
    size: 16,
    indent: true,
  },

  // 表头: 仿宋 16pt (三号), bold, centered
  tableHeader: {
    font: '仿宋',
    size: 16,
    bold: true,
    center: true,
  },

  // 表格内容: 仿宋 16pt (三号), centered
  tableCell: {
    font: '仿宋',
    size: 16,
    center: true,
  },

  // 页脚: 仿宋 14pt (四号)
  pageFooter: {
    font: '仿宋',
    size: 14,
  },
};

/**
 * English Standard template
 * Times New Roman body, Arial headings
 */
const EN_STANDARD_STYLES: StyleSettings = {
  // Title: Arial 24pt, bold, centered
  title: {
    font: 'Arial',
    size: 24,
    bold: true,
    center: true,
  },

  // Heading 1: Arial 16pt, bold
  heading1: {
    font: 'Arial',
    size: 16,
    bold: true,
    indent: false,
  },

  // Heading 2: Arial 14pt, bold
  heading2: {
    font: 'Arial',
    size: 14,
    bold: true,
    indent: false,
  },

  // Heading 3: Arial 12pt, bold
  heading3: {
    font: 'Arial',
    size: 12,
    bold: true,
    indent: false,
  },

  // Heading 4: Arial 12pt, bold italic
  heading4: {
    font: 'Arial',
    size: 12,
    bold: true,
    italic: true,
    indent: false,
  },

  // Body Text: Times New Roman 12pt
  bodyText: {
    font: 'Times New Roman',
    size: 12,
    indent: false,
  },

  // List Item: Times New Roman 12pt
  listItem: {
    font: 'Times New Roman',
    size: 12,
    indent: false,
  },

  // Table Header: Arial 11pt, bold, centered
  tableHeader: {
    font: 'Arial',
    size: 11,
    bold: true,
    center: true,
  },

  // Table Cell: Times New Roman 11pt
  tableCell: {
    font: 'Times New Roman',
    size: 11,
    center: false,
  },

  // Page Footer: Times New Roman 10pt
  pageFooter: {
    font: 'Times New Roman',
    size: 10,
  },
};

/**
 * Template registry with all built-in templates
 */
export const TEMPLATES: Record<TemplateName, Template> = {
  'cn-gov': {
    id: 'cn-gov',
    name: '公文格式',
    description: 'GB/T 9704-2012 中国公文标准',
    styles: CN_GOV_STYLES,
    fontSizes: CHINESE_FONT_SIZES,
    availableFonts: [...CHINESE_FONTS] as DocumentFont[],
  },
  'en-standard': {
    id: 'en-standard',
    name: 'English Standard',
    description: 'Times New Roman body, Arial headings',
    styles: EN_STANDARD_STYLES,
    fontSizes: ENGLISH_FONT_SIZES,
    availableFonts: [...ENGLISH_FONTS] as DocumentFont[],
  },
};

/**
 * Default template name
 */
export const DEFAULT_TEMPLATE: TemplateName = 'cn-gov';

/**
 * Get a template by name
 */
export function getTemplate(name: TemplateName): Template {
  return TEMPLATES[name];
}

/**
 * Get template styles by name
 */
export function getTemplateStyles(name: TemplateName): StyleSettings {
  return TEMPLATES[name].styles;
}

/**
 * Check if a string is a valid template name
 */
export function isValidTemplateName(name: string): name is TemplateName {
  return name in TEMPLATES;
}

/**
 * Get all template names
 */
export function getTemplateNames(): TemplateName[] {
  return Object.keys(TEMPLATES) as TemplateName[];
}
