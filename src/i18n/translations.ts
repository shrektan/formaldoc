export type Language = 'cn' | 'en';

export interface Translations {
  header: {
    title: string;
    tagline: string;
    tip: string;
  };
  input: {
    label: string;
    placeholder: string;
    pasteModeLabel: string;
    pasteModeAuto: string;
    pasteModePlain: string;
  };
  buttons: {
    quoteConvert: string;
    styles: string;
    customize: string;
    example: string;
    clear: string;
    download: string;
    downloading: string;
  };
  loading: {
    generating: string;
  };
  hints: {
    noHeadings: string;
    closeHint: string;
    escapedLatex: string;
    fixEscapedLatex: string;
    pasteConverted: string;
    undoPaste: string;
  };
  alerts: {
    quotesConverted: (count: number) => string;
    noQuotesFound: string;
  };
  footer: {
    tagline: string;
  };
  templateGallery: {
    title: string;
    chinese: string;
  };
  templateStrip: {
    chinese: string;
    english: string;
  };
  styleDrawer: {
    title: string;
    template: string;
    reset: string;
    confirmReset: string;
    confirmTemplateChange: string;
  };
  styleLabels: {
    font: string;
    chineseFont: string;
    englishFont: string;
    size: string;
    bold: string;
    italic: string;
    center: string;
    indent: string;
  };
  styleNames: {
    title: string;
    heading1: string;
    heading2: string;
    heading3: string;
    heading4: string;
    bodyText: string;
    listItem: string;
    blockquote: string;
    tableHeader: string;
    tableCell: string;
    pageFooter: string;
  };
  filename: {
    label: string;
    placeholder: string;
    reset: string;
  };
}

export const translations: Record<Language, Translations> = {
  cn: {
    header: {
      title: 'AI文字 → 公文Word',
      tagline: '粘贴豆包、ChatGPT等AI回复，自动生成规范Word文档',
      tip: '小技巧：让AI"用Markdown格式回复"，标题层级更准确',
    },
    input: {
      label: '粘贴AI生成的文字',
      placeholder: `在这里粘贴从豆包、千问、DeepSeek、Kimi、ChatGPT等AI工具复制的文字...

支持 Markdown 格式：
# 标题
## 一级标题
### 二级标题
- 列表
**粗体**

支持 LaTeX 公式（导出为原生Word公式，可编辑）：
$E = mc^2$（行内公式）
$$\\frac{a}{b}$$（独立公式）`,
      pasteModeLabel: '粘贴方式',
      pasteModeAuto: '自动识别',
      pasteModePlain: '纯文本',
    },
    buttons: {
      quoteConvert: '引号转换',
      styles: '字体样式',
      customize: '自定义',
      example: '示例',
      clear: '清除',
      download: '下载Word文档',
      downloading: '生成中...',
    },
    loading: {
      generating: '正在生成文档...',
    },
    hints: {
      noHeadings:
        '未检测到Markdown格式。可让AI"用Markdown格式回复"或"把内容放在markdown代码块中"再复制。',
      closeHint: '关闭提示',
      escapedLatex: '检测到可能被转义的公式（如从AI复制）',
      fixEscapedLatex: '修复转义',
      pasteConverted: '识别到富文本，已按Markdown粘贴',
      undoPaste: '改用纯文本',
    },
    alerts: {
      quotesConverted: (count: number) => `已转换 ${count} 处引号`,
      noQuotesFound: '未找到需要转换的英文引号',
    },
    footer: {
      tagline: '无需登录 · 无需安装 · 可离线使用 · 数据不上传',
    },
    templateGallery: {
      title: '选择模板',
      chinese: '中文',
    },
    templateStrip: {
      chinese: '中文',
      english: 'EN',
    },
    styleDrawer: {
      title: '自定义样式',
      template: '模板',
      reset: '恢复默认',
      confirmReset: '确定要恢复为模板默认样式吗？',
      confirmTemplateChange: '切换模板将重置所有样式设置，确定继续吗？',
    },
    styleLabels: {
      font: '字体',
      chineseFont: '中文字体',
      englishFont: '英文字体',
      size: '字号',
      bold: '加粗',
      italic: '斜体',
      center: '居中',
      indent: '首行缩进',
    },
    styleNames: {
      title: '标题',
      heading1: '一级标题',
      heading2: '二级标题',
      heading3: '三级标题',
      heading4: '四级标题',
      bodyText: '正文',
      listItem: '列表项',
      blockquote: '引用',
      tableHeader: '表头',
      tableCell: '表格内容',
      pageFooter: '页脚',
    },
    filename: {
      label: '文件名',
      placeholder: '自动检测标题',
      reset: '重置',
    },
  },
  en: {
    header: {
      title: 'AI Text → Word Doc',
      tagline: 'Paste ChatGPT, Claude responses → formatted Word document',
      tip: 'Pro tip: Ask AI to "reply in Markdown format" for better heading detection',
    },
    input: {
      label: 'Paste AI-generated text',
      placeholder: `Paste text copied from ChatGPT, Claude, Gemini, or other AI tools here...

Supported Markdown formats:
# Title
## Heading 1
### Heading 2
- List items
**Bold text**

LaTeX formulas (exported as native Word equations):
$E = mc^2$ (inline formula)
$$\\frac{a}{b}$$ (block formula)`,
      pasteModeLabel: 'Paste mode',
      pasteModeAuto: 'Auto',
      pasteModePlain: 'Plain text',
    },
    buttons: {
      quoteConvert: 'Convert Quotes',
      styles: 'Styles',
      customize: 'Customize',
      example: 'Example',
      clear: 'Clear',
      download: 'Download Word',
      downloading: 'Generating...',
    },
    loading: {
      generating: 'Generating document...',
    },
    hints: {
      noHeadings:
        'No Markdown formatting detected. Ask AI to reply in Markdown format or wrap content in a code block.',
      closeHint: 'Close hint',
      escapedLatex: 'Detected possibly escaped formulas (e.g., copied from AI)',
      fixEscapedLatex: 'Fix escaping',
      pasteConverted: 'Rich text detected, pasted as Markdown',
      undoPaste: 'Use plain text',
    },
    alerts: {
      quotesConverted: (count: number) => `Converted ${count} quote(s)`,
      noQuotesFound: 'No English quotes found to convert',
    },
    footer: {
      tagline: 'No login · No install · Works offline · Data stays local',
    },
    templateGallery: {
      title: 'Choose Template',
      chinese: 'Chinese',
    },
    templateStrip: {
      chinese: 'CN',
      english: 'English',
    },
    styleDrawer: {
      title: 'Customize Styles',
      template: 'Template',
      reset: 'Reset',
      confirmReset: 'Reset all styles to template defaults?',
      confirmTemplateChange: 'Changing template will reset all style settings. Continue?',
    },
    styleLabels: {
      font: 'Font',
      chineseFont: 'Chinese Font',
      englishFont: 'English Font',
      size: 'Size',
      bold: 'Bold',
      italic: 'Italic',
      center: 'Center',
      indent: 'Indent',
    },
    styleNames: {
      title: 'Title',
      heading1: 'Heading 1',
      heading2: 'Heading 2',
      heading3: 'Heading 3',
      heading4: 'Heading 4',
      bodyText: 'Body Text',
      listItem: 'List Item',
      blockquote: 'Block Quote',
      tableHeader: 'Table Header',
      tableCell: 'Table Cell',
      pageFooter: 'Page Footer',
    },
    filename: {
      label: 'Filename',
      placeholder: 'Auto-detect from title',
      reset: 'Reset',
    },
  },
};
