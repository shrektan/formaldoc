import type { StyleSettings } from '../../types/styles';

/**
 * Default style settings based on GB/T 9704-2012
 * Chinese Government Document Format Specifications
 */
export const DEFAULT_STYLES: StyleSettings = {
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

  // 表头: 仿宋 14pt, bold, centered
  tableHeader: {
    font: '仿宋',
    size: 14,
    bold: true,
    center: true,
  },

  // 表格内容: 仿宋 12pt
  tableCell: {
    font: '仿宋',
    size: 12,
  },

  // 页脚: 仿宋 12pt
  pageFooter: {
    font: '仿宋',
    size: 12,
  },
};
