import type {
  Template,
  TemplateName,
  StyleSettings,
  DocumentFont,
  DocumentSettings,
} from '../../types/styles';
import {
  CHINESE_FONTS,
  ENGLISH_FONTS,
  CHINESE_FONT_SIZES,
  ENGLISH_FONT_SIZES,
} from '../../types/styles';

// ============================================
// CHINESE TEMPLATES
// ============================================

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

const CN_GOV_DOCUMENT_SETTINGS: DocumentSettings = {
  lineSpacing: { type: 'exact', value: 560 }, // 28pt exact
  pageNumberFormat: 'dash', // "- 1 -"
  margins: {
    top: 1440, // 1 inch
    bottom: 1440,
    left: 1440,
    right: 1440,
    header: 851,
    footer: 992,
  },
  spacingAfter: 0,
};

/**
 * CN General template
 * 宋体正文 + Times New Roman英文, 1.5倍行距, 首行缩进2字符
 * Most common format for general documents
 */
const CN_GENERAL_STYLES: StyleSettings = {
  title: {
    font: '黑体',
    size: 22,
    bold: true,
    center: true,
  },
  heading1: {
    font: '黑体',
    size: 16,
    bold: true,
    indent: false,
  },
  heading2: {
    font: '黑体',
    size: 14,
    bold: true,
    indent: false,
  },
  heading3: {
    font: '黑体',
    size: 12,
    bold: true,
    indent: false,
  },
  heading4: {
    font: '宋体',
    size: 12,
    bold: true,
    indent: false,
  },
  bodyText: {
    font: '宋体',
    size: 12,
    indent: false,
  },
  listItem: {
    font: '宋体',
    size: 12,
    indent: false,
  },
  tableHeader: {
    font: '黑体',
    size: 10.5,
    bold: true,
    center: true,
  },
  tableCell: {
    font: '宋体',
    size: 10.5,
    center: false,
  },
  pageFooter: {
    font: '宋体',
    size: 10.5,
  },
};

const CN_GENERAL_DOCUMENT_SETTINGS: DocumentSettings = {
  lineSpacing: { type: 'auto', value: 360 }, // 1.5 line spacing
  pageNumberFormat: 'plain',
  margins: {
    top: 1440,
    bottom: 1440,
    left: 1440,
    right: 1440,
    header: 720,
    footer: 720,
  },
  spacingAfter: 0,
};

/**
 * CN Academic template
 * 学位论文/期刊论文格式
 */
const CN_ACADEMIC_STYLES: StyleSettings = {
  title: {
    font: '黑体',
    size: 18,
    bold: true,
    center: true,
  },
  heading1: {
    font: '黑体',
    size: 15,
    bold: true,
    indent: false,
    center: true,
  },
  heading2: {
    font: '黑体',
    size: 14,
    bold: true,
    indent: false,
  },
  heading3: {
    font: '黑体',
    size: 12,
    bold: true,
    indent: false,
  },
  heading4: {
    font: '宋体',
    size: 12,
    bold: true,
    indent: false,
  },
  bodyText: {
    font: '宋体',
    size: 12,
    indent: true,
  },
  listItem: {
    font: '宋体',
    size: 12,
    indent: true,
  },
  tableHeader: {
    font: '黑体',
    size: 10.5,
    bold: true,
    center: true,
  },
  tableCell: {
    font: '宋体',
    size: 10.5,
    center: false,
  },
  pageFooter: {
    font: '宋体',
    size: 10.5,
  },
};

const CN_ACADEMIC_DOCUMENT_SETTINGS: DocumentSettings = {
  lineSpacing: { type: 'auto', value: 360 }, // 1.5 line spacing
  pageNumberFormat: 'plain',
  margins: {
    top: 1440,
    bottom: 1440,
    left: 1800, // 1.25 inch for binding
    right: 1440,
    header: 720,
    footer: 720,
  },
  spacingAfter: 0,
};

/**
 * CN Report template
 * 企业报告/工作汇报格式
 */
const CN_REPORT_STYLES: StyleSettings = {
  title: {
    font: '黑体',
    size: 24,
    bold: true,
    center: true,
  },
  heading1: {
    font: '黑体',
    size: 18,
    bold: true,
    indent: false,
  },
  heading2: {
    font: '黑体',
    size: 16,
    bold: true,
    indent: false,
  },
  heading3: {
    font: '黑体',
    size: 14,
    bold: true,
    indent: false,
  },
  heading4: {
    font: '黑体',
    size: 12,
    bold: true,
    indent: false,
  },
  bodyText: {
    font: '宋体',
    size: 12,
    indent: true,
  },
  listItem: {
    font: '宋体',
    size: 12,
    indent: false,
  },
  tableHeader: {
    font: '黑体',
    size: 11,
    bold: true,
    center: true,
  },
  tableCell: {
    font: '宋体',
    size: 11,
    center: false,
  },
  pageFooter: {
    font: '宋体',
    size: 10,
  },
};

const CN_REPORT_DOCUMENT_SETTINGS: DocumentSettings = {
  lineSpacing: { type: 'auto', value: 360 }, // 1.5 line spacing
  pageNumberFormat: 'plain',
  margins: {
    top: 1440,
    bottom: 1440,
    left: 1440,
    right: 1440,
    header: 720,
    footer: 720,
  },
  spacingAfter: 156, // Small spacing after paragraphs
};

// ============================================
// ENGLISH TEMPLATES
// ============================================

/**
 * English Standard template
 * Times New Roman body, Arial headings
 */
const EN_STANDARD_STYLES: StyleSettings = {
  // Title: Arial 20pt, bold, centered
  title: {
    font: 'Arial',
    size: 20,
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

const EN_STANDARD_DOCUMENT_SETTINGS: DocumentSettings = {
  lineSpacing: { type: 'auto', value: 360 }, // 1.5 line spacing
  pageNumberFormat: 'plain', // Just "1"
  margins: {
    top: 1440, // 1 inch
    bottom: 1440,
    left: 1440,
    right: 1440,
    header: 720,
    footer: 720,
  },
  spacingAfter: 200, // 10pt after paragraphs
};

/**
 * English Business template
 * Modern corporate style
 */
const EN_BUSINESS_STYLES: StyleSettings = {
  title: {
    font: 'Arial',
    size: 24,
    bold: true,
    center: false,
  },
  heading1: {
    font: 'Arial',
    size: 18,
    bold: true,
    indent: false,
  },
  heading2: {
    font: 'Arial',
    size: 14,
    bold: true,
    indent: false,
  },
  heading3: {
    font: 'Arial',
    size: 12,
    bold: true,
    indent: false,
  },
  heading4: {
    font: 'Arial',
    size: 11,
    bold: true,
    indent: false,
  },
  bodyText: {
    font: 'Calibri',
    size: 11,
    indent: false,
  },
  listItem: {
    font: 'Calibri',
    size: 11,
    indent: false,
  },
  tableHeader: {
    font: 'Arial',
    size: 10,
    bold: true,
    center: true,
  },
  tableCell: {
    font: 'Calibri',
    size: 10,
    center: false,
  },
  pageFooter: {
    font: 'Calibri',
    size: 9,
  },
};

const EN_BUSINESS_DOCUMENT_SETTINGS: DocumentSettings = {
  lineSpacing: { type: 'auto', value: 276 }, // 1.15 line spacing
  pageNumberFormat: 'plain',
  margins: {
    top: 1440,
    bottom: 1440,
    left: 1440,
    right: 1440,
    header: 720,
    footer: 720,
  },
  spacingAfter: 160, // 8pt after paragraphs
};

/**
 * English Academic template (APA-inspired)
 * Research papers and academic documents
 */
const EN_ACADEMIC_STYLES: StyleSettings = {
  title: {
    font: 'Times New Roman',
    size: 16,
    bold: true,
    center: true,
  },
  heading1: {
    font: 'Times New Roman',
    size: 14,
    bold: true,
    center: true,
    indent: false,
  },
  heading2: {
    font: 'Times New Roman',
    size: 12,
    bold: true,
    indent: false,
  },
  heading3: {
    font: 'Times New Roman',
    size: 12,
    bold: true,
    italic: true,
    indent: false,
  },
  heading4: {
    font: 'Times New Roman',
    size: 12,
    bold: false,
    italic: true,
    indent: true,
  },
  bodyText: {
    font: 'Times New Roman',
    size: 12,
    indent: true,
  },
  listItem: {
    font: 'Times New Roman',
    size: 12,
    indent: false,
  },
  tableHeader: {
    font: 'Times New Roman',
    size: 11,
    bold: true,
    center: true,
  },
  tableCell: {
    font: 'Times New Roman',
    size: 11,
    center: false,
  },
  pageFooter: {
    font: 'Times New Roman',
    size: 10,
  },
};

const EN_ACADEMIC_DOCUMENT_SETTINGS: DocumentSettings = {
  lineSpacing: { type: 'auto', value: 480 }, // Double spacing
  pageNumberFormat: 'plain',
  margins: {
    top: 1440,
    bottom: 1440,
    left: 1440,
    right: 1440,
    header: 720,
    footer: 720,
  },
  spacingAfter: 0, // No extra spacing (uses line spacing)
};

/**
 * English Legal template
 * Contracts and legal documents
 */
const EN_LEGAL_STYLES: StyleSettings = {
  title: {
    font: 'Times New Roman',
    size: 14,
    bold: true,
    center: true,
  },
  heading1: {
    font: 'Times New Roman',
    size: 12,
    bold: true,
    indent: false,
  },
  heading2: {
    font: 'Times New Roman',
    size: 12,
    bold: true,
    indent: false,
  },
  heading3: {
    font: 'Times New Roman',
    size: 12,
    bold: false,
    indent: false,
  },
  heading4: {
    font: 'Times New Roman',
    size: 12,
    bold: false,
    italic: true,
    indent: false,
  },
  bodyText: {
    font: 'Times New Roman',
    size: 12,
    indent: false,
  },
  listItem: {
    font: 'Times New Roman',
    size: 12,
    indent: false,
  },
  tableHeader: {
    font: 'Times New Roman',
    size: 11,
    bold: true,
    center: true,
  },
  tableCell: {
    font: 'Times New Roman',
    size: 11,
    center: false,
  },
  pageFooter: {
    font: 'Times New Roman',
    size: 10,
  },
};

const EN_LEGAL_DOCUMENT_SETTINGS: DocumentSettings = {
  lineSpacing: { type: 'auto', value: 360 }, // 1.5 line spacing
  pageNumberFormat: 'plain',
  margins: {
    top: 1440,
    bottom: 1440,
    left: 1800, // 1.25 inch
    right: 1440,
    header: 720,
    footer: 720,
  },
  spacingAfter: 200,
};

// ============================================
// TEMPLATE REGISTRY
// ============================================

/**
 * Template registry with all built-in templates
 */
export const TEMPLATES: Record<TemplateName, Template> = {
  'cn-gov': {
    id: 'cn-gov',
    name: '政府公文',
    nameEn: 'Government',
    description: 'GB/T 9704 标准格式',
    descriptionEn: 'GB/T 9704 Standard',
    category: 'chinese',
    specs: {
      bodyFont: '仿宋',
      headingFont: '黑体/楷体',
      lineSpacing: '固定28磅',
      indent: '首行缩进',
    },
    styles: CN_GOV_STYLES,
    fontSizes: CHINESE_FONT_SIZES,
    availableFonts: [...CHINESE_FONTS] as DocumentFont[],
    documentSettings: CN_GOV_DOCUMENT_SETTINGS,
  },
  'cn-general': {
    id: 'cn-general',
    name: '通用文档',
    nameEn: 'General',
    description: '宋体+TNR，1.5倍行距',
    descriptionEn: 'Song + TNR, 1.5 spacing',
    category: 'chinese',
    specs: {
      bodyFont: '宋体',
      headingFont: '黑体',
      lineSpacing: '1.5倍',
      indent: '无缩进',
    },
    styles: CN_GENERAL_STYLES,
    fontSizes: CHINESE_FONT_SIZES,
    availableFonts: [...CHINESE_FONTS] as DocumentFont[],
    documentSettings: CN_GENERAL_DOCUMENT_SETTINGS,
  },
  'cn-academic': {
    id: 'cn-academic',
    name: '学术论文',
    nameEn: 'Academic',
    description: '学位论文/期刊格式',
    descriptionEn: 'Thesis/Journal format',
    category: 'chinese',
    specs: {
      bodyFont: '宋体',
      headingFont: '黑体',
      lineSpacing: '1.5倍',
      indent: '首行缩进',
    },
    styles: CN_ACADEMIC_STYLES,
    fontSizes: CHINESE_FONT_SIZES,
    availableFonts: [...CHINESE_FONTS] as DocumentFont[],
    documentSettings: CN_ACADEMIC_DOCUMENT_SETTINGS,
  },
  'cn-report': {
    id: 'cn-report',
    name: '企业报告',
    nameEn: 'Report',
    description: '工作汇报/分析报告',
    descriptionEn: 'Business reports',
    category: 'chinese',
    specs: {
      bodyFont: '宋体',
      headingFont: '黑体',
      lineSpacing: '1.5倍',
      indent: '首行缩进',
    },
    styles: CN_REPORT_STYLES,
    fontSizes: CHINESE_FONT_SIZES,
    availableFonts: [...CHINESE_FONTS] as DocumentFont[],
    documentSettings: CN_REPORT_DOCUMENT_SETTINGS,
  },
  'en-standard': {
    id: 'en-standard',
    name: 'Standard',
    nameEn: 'Standard',
    description: 'Times New Roman + Arial',
    descriptionEn: 'Times New Roman + Arial',
    category: 'english',
    specs: {
      bodyFont: 'Times New Roman',
      headingFont: 'Arial',
      lineSpacing: '1.5',
      indent: 'No indent',
    },
    styles: EN_STANDARD_STYLES,
    fontSizes: ENGLISH_FONT_SIZES,
    availableFonts: [...ENGLISH_FONTS] as DocumentFont[],
    documentSettings: EN_STANDARD_DOCUMENT_SETTINGS,
  },
  'en-business': {
    id: 'en-business',
    name: 'Business',
    nameEn: 'Business',
    description: 'Calibri + Arial, modern',
    descriptionEn: 'Calibri + Arial, modern',
    category: 'english',
    specs: {
      bodyFont: 'Calibri',
      headingFont: 'Arial',
      lineSpacing: '1.15',
      indent: 'No indent',
    },
    styles: EN_BUSINESS_STYLES,
    fontSizes: ENGLISH_FONT_SIZES,
    availableFonts: [...ENGLISH_FONTS] as DocumentFont[],
    documentSettings: EN_BUSINESS_DOCUMENT_SETTINGS,
  },
  'en-academic': {
    id: 'en-academic',
    name: 'Academic',
    nameEn: 'Academic',
    description: 'APA style, double-spaced',
    descriptionEn: 'APA style, double-spaced',
    category: 'english',
    specs: {
      bodyFont: 'Times New Roman',
      headingFont: 'Times New Roman',
      lineSpacing: 'Double',
      indent: 'First line',
    },
    styles: EN_ACADEMIC_STYLES,
    fontSizes: ENGLISH_FONT_SIZES,
    availableFonts: [...ENGLISH_FONTS] as DocumentFont[],
    documentSettings: EN_ACADEMIC_DOCUMENT_SETTINGS,
  },
  'en-legal': {
    id: 'en-legal',
    name: 'Legal',
    nameEn: 'Legal',
    description: 'Contracts, legal docs',
    descriptionEn: 'Contracts, legal docs',
    category: 'english',
    specs: {
      bodyFont: 'Times New Roman',
      headingFont: 'Times New Roman',
      lineSpacing: '1.5',
      indent: 'No indent',
    },
    styles: EN_LEGAL_STYLES,
    fontSizes: ENGLISH_FONT_SIZES,
    availableFonts: [...ENGLISH_FONTS] as DocumentFont[],
    documentSettings: EN_LEGAL_DOCUMENT_SETTINGS,
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

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: 'chinese' | 'english'): Template[] {
  return Object.values(TEMPLATES).filter((t) => t.category === category);
}
