import { startTransition, useCallback, useMemo, useState, type CSSProperties } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { StyleDrawer } from './components/StyleSettings';
import { TemplateStrip } from './components/TemplateStrip';
import { TemplateGallery } from './components/TemplateGallery';
import { MarkdownEditor, type PasteSelection } from './components/Editor/MarkdownEditor';
import { LoadingOverlay } from './components/LoadingOverlay';
import { TextProcessingMenu } from './components/TextProcessingMenu';
import { StyleProvider } from './contexts/StyleContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { useStyles } from './contexts/useStyles';
import { useLanguage } from './hooks/useTranslation';
import { useDocxGenerator, extractTitle, sanitizeFilename } from './hooks/useDocxGenerator';
import { htmlToMarkdown } from './lib/html-to-markdown';
import { detectInitialLanguage } from './lib/language-detection';
import { examples } from './i18n';
import type { Language } from './i18n';
import { unescapeLatex } from './lib/math/latex-to-docx';
import { getTemplatesByCategory } from './lib/styles/templates';
import type { StyleKey, TemplateCategory, TemplateName, TextStyle } from './types/styles';
import './styles/app.css';

type PasteMode = 'auto' | 'plain';
type PreviewBlockType = Extract<
  StyleKey,
  | 'title'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'heading4'
  | 'bodyText'
  | 'listItem'
  | 'blockquote'
>;

interface PreviewBlock {
  type: PreviewBlockType;
  text: string;
}

interface ScenarioPreset {
  id: string;
  title: string;
  description: string;
  content: string;
}

const PASTE_MODE_STORAGE_KEY = 'formaldoc.pasteMode';
const FEEDBACK_URL = 'mailto:support@formaldoc.app?subject=FormalDoc%20Feedback';
const PREVIEW_BLOCK_LIMIT = 10;

const PAGE_COPY = {
  cn: {
    brandTag: 'FormalDoc 公文工作台',
    heroTitle: '内置规范公文模板，一键生成正式 Word 文档',
    heroSubtitle:
      '把 AI 输出或现有稿件直接整理成符合标准的公文、报告与正式材料。桌面端同时展示输入、预览和模板规范，让格式价值看得见。',
    valueProps: [
      'GB/T 9704-2012 公文模板',
      '完整公文结构骨架',
      '样式可选并可微调',
      '浏览器本地生成不上传',
    ],
    railLabel: '模板速选',
    proofTitle: '当前推荐模板',
    proofBadge: '规范模板',
    inputTitle: '文稿输入',
    inputDescription: '支持 AI 富文本粘贴、Markdown 编辑、文字清理与智能文件名。',
    previewTitle: '版式预览',
    previewDescription: '预览当前模板的版式气质、标题层级与页码风格。',
    previewEmpty: '当前未输入内容，预览展示模板默认骨架。',
    templateTitle: '模板与规范',
    templateDescription: '把模板规格、适用场景与快速切换都放在同一面板里。',
    specTitle: '关键规格',
    quickSwitchTitle: '快速切换模板',
    scenarioTitle: '常用场景快速开始',
    scenarioDescription: '一键填入完整结构骨架，再补正文内容即可导出。',
    applyScenario: '套用骨架',
    replaceScenarioConfirm: '当前内容将被完整公文模板覆盖，是否继续？',
    actionTitle: '先套模板，再导出',
    actionDescription: '如果你要快速起草规范公文，先选择场景骨架；如果已有内容，直接导出即可。',
    createSkeleton: '生成完整公文模板',
    exportWord: '导出 Word 文档',
    customize: '自定义样式',
    chooseTemplate: '查看全部模板',
    audience: '适用场景',
    standard: '规范依据',
    body: '正文',
    heading: '标题',
    lineSpacing: '行距',
    indent: '缩进',
    pageNumber: '页码',
    livePreview: '实时预览',
    localOnly: '本地生成',
  },
  en: {
    brandTag: 'FormalDoc Workspace',
    heroTitle: 'Preset official document templates, exported as polished Word files',
    heroSubtitle:
      'Turn AI output or drafts into formal documents with template guidance visible on desktop: input, paper preview, and formatting rules side by side.',
    valueProps: [
      'GB/T 9704-2012 preset',
      'Full document skeletons',
      'Adjustable template styles',
      'Local generation, no upload',
    ],
    railLabel: 'Template Rail',
    proofTitle: 'Current Recommended Preset',
    proofBadge: 'Preset',
    inputTitle: 'Document Input',
    inputDescription: 'Paste AI rich text, edit Markdown, clean formatting, and set filename.',
    previewTitle: 'Layout Preview',
    previewDescription: 'See hierarchy, page rhythm, and footer style before export.',
    previewEmpty: 'No content yet. The preview is showing the template skeleton.',
    templateTitle: 'Template Details',
    templateDescription: 'Keep template rules, switching, and quick starts in one place.',
    specTitle: 'Key Specs',
    quickSwitchTitle: 'Quick Switch',
    scenarioTitle: 'Quick Starts',
    scenarioDescription: 'Insert a full structure first, then fill the real content.',
    applyScenario: 'Use Skeleton',
    replaceScenarioConfirm: 'Replace the current content with the selected skeleton?',
    actionTitle: 'Start with structure, then export',
    actionDescription:
      'Use a skeleton for fast drafting, or export immediately if your content is ready.',
    createSkeleton: 'Insert Full Document Skeleton',
    exportWord: 'Export Word Document',
    customize: 'Customize Styles',
    chooseTemplate: 'Browse Templates',
    audience: 'Use Cases',
    standard: 'Standard',
    body: 'Body',
    heading: 'Heading',
    lineSpacing: 'Spacing',
    indent: 'Indent',
    pageNumber: 'Page Number',
    livePreview: 'Live Preview',
    localOnly: 'Local Only',
  },
} as const;

const TEMPLATE_INSIGHTS: Record<
  TemplateName,
  {
    standard: string;
    audience: { cn: string[]; en: string[] };
    promise: { cn: string; en: string };
  }
> = {
  'cn-gov': {
    standard: 'GB/T 9704-2012',
    audience: {
      cn: ['通知', '请示', '报告', '函'],
      en: ['Notice', 'Request', 'Report', 'Letter'],
    },
    promise: {
      cn: '针对正式公文场景预置字号、行距、页码与首行缩进。',
      en: 'Preset for official Chinese documents with formal spacing, pagination, and indentation.',
    },
  },
  'cn-general': {
    standard: 'FormalDoc 通用模板',
    audience: {
      cn: ['制度文件', '内部通报', '商务材料'],
      en: ['Internal docs', 'Business notes', 'General papers'],
    },
    promise: {
      cn: '更适合企业行政和通用正式文稿，兼顾规范与现代可读性。',
      en: 'Balanced for business and general formal writing with a modern readable rhythm.',
    },
  },
  'cn-academic': {
    standard: 'FormalDoc 学术模板',
    audience: {
      cn: ['论文', '调研材料', '学术报告'],
      en: ['Papers', 'Research notes', 'Academic reports'],
    },
    promise: {
      cn: '突出章节层级与装订留白，适合论文和研究性材料。',
      en: 'Structured for academic hierarchy and binding-friendly margins.',
    },
  },
  'cn-report': {
    standard: 'FormalDoc 报告模板',
    audience: {
      cn: ['工作汇报', '复盘材料', '经营报告'],
      en: ['Work reports', 'Business reviews', 'Operational summaries'],
    },
    promise: {
      cn: '强调汇报结构和阅读效率，适合企业与组织内部使用。',
      en: 'Optimized for business reporting with stronger hierarchy and readability.',
    },
  },
  'en-standard': {
    standard: 'FormalDoc Standard',
    audience: {
      cn: ['英文正式文档', '国际沟通', '标准材料'],
      en: ['Formal docs', 'International communication', 'Standard reports'],
    },
    promise: {
      cn: '经典西文层级和 1.5 倍行距，适合大多数英文正式材料。',
      en: 'Classic western document hierarchy with 1.5 spacing for general formal writing.',
    },
  },
  'en-business': {
    standard: 'FormalDoc Business',
    audience: {
      cn: ['商务备忘', '提案', '会议材料'],
      en: ['Memos', 'Business proposals', 'Meeting docs'],
    },
    promise: {
      cn: '更现代的商务文风，适合团队沟通和商业文稿。',
      en: 'A modern business preset for internal team communication and proposals.',
    },
  },
  'en-academic': {
    standard: 'FormalDoc Academic',
    audience: {
      cn: ['论文', '摘要', '课程作业'],
      en: ['Academic papers', 'Abstracts', 'Assignments'],
    },
    promise: {
      cn: '双倍行距与学术层级更适合论文和课程提交。',
      en: 'Double spacing and academic hierarchy for papers and coursework.',
    },
  },
  'en-legal': {
    standard: 'FormalDoc Legal',
    audience: {
      cn: ['合同草稿', '法律函件', '规范文本'],
      en: ['Contracts', 'Legal letters', 'Policy text'],
    },
    promise: {
      cn: '更强调密度、编号与正式语气，适合法律文书。',
      en: 'Designed for denser structure, numbering, and legal-formal tone.',
    },
  },
};

const SCENARIO_PRESETS: Record<TemplateCategory, ScenarioPreset[]> = {
  chinese: [
    {
      id: 'notice',
      title: '通知',
      description: '适合发布安排、制度与执行要求。',
      content: `# 关于开展专项工作的通知

主送单位：

## 一、工作背景

为进一步推进相关工作，现就有关事项通知如下。

## 二、重点安排

### （一）任务分工

请各单位结合职责抓好落实。

### （二）时间要求

请于规定时间前完成并反馈结果。

## 三、有关要求

请高度重视，做好组织实施。

发文单位

2026年3月7日`,
    },
    {
      id: 'request',
      title: '请示',
      description: '适合向上级提交事项申请与审批请求。',
      content: `# 关于申请开展专项工作的请示

主送机关：

## 一、请示事项

因工作需要，拟申请开展相关专项工作。

## 二、主要理由

### （一）现实背景

现有工作基础与需求如下。

### （二）实施必要性

开展该项工作有助于提升整体成效。

## 三、拟请示内容

妥否，请批示。

请示单位

2026年3月7日`,
    },
    {
      id: 'report',
      title: '报告',
      description: '适合阶段性工作汇报与情况说明。',
      content: `# 关于近期重点工作进展情况的报告

报送单位：

## 一、总体进展

目前各项重点任务总体推进平稳。

## 二、主要成效

### （一）任务完成情况

已完成既定阶段目标。

### （二）经验做法

通过机制协同提升执行效率。

## 三、下一步安排

将继续推进重点事项并强化复盘。

报送单位

2026年3月7日`,
    },
    {
      id: 'letter',
      title: '函',
      description: '适合跨部门沟通、协商与函复。',
      content: `# 关于协助提供相关材料的函

致：

因工作需要，现请贵单位协助提供以下材料。

## 一、所需材料

- 材料一
- 材料二
- 材料三

## 二、时间安排

请于指定日期前反馈。

此函。

发函单位

2026年3月7日`,
    },
    {
      id: 'minutes',
      title: '会议纪要',
      description: '适合整理会议结论与任务分工。',
      content: `# 重点工作推进会会议纪要

会议时间：
会议地点：
参会人员：

## 一、会议情况

会议围绕近期重点工作进行了专题研究。

## 二、形成意见

### （一）工作目标

明确阶段性目标与节点安排。

### （二）责任分工

各责任单位按照分工推进落实。

## 三、后续要求

按会议议定事项抓好执行并及时反馈。

办公室

2026年3月7日`,
    },
  ],
  english: [
    {
      id: 'memo',
      title: 'Memo',
      description: 'A fast structure for internal briefings and decisions.',
      content: `# Project Memo

To:
From:
Date:
Subject:

## Summary

State the key decision or update in one short paragraph.

## Context

Explain the background and current situation.

## Recommendation

List the proposed next steps and owners.

## Notes

- Item one
- Item two
- Item three`,
    },
    {
      id: 'briefing',
      title: 'Briefing',
      description: 'Useful for executive updates and meeting prep.',
      content: `# Executive Briefing

## Situation

Describe the current status and why it matters.

## Key Signals

- Signal one
- Signal two
- Signal three

## Recommended Actions

1. Action one
2. Action two
3. Action three`,
    },
    {
      id: 'report',
      title: 'Report',
      description: 'For periodic status and operational summaries.',
      content: `# Monthly Operations Report

## Highlights

Summarize the most important outcomes for this period.

## Performance Review

### Delivery

Explain what was delivered and what is at risk.

### Metrics

Include the most relevant numbers and trends.

## Next Steps

List the next actions with owners and timing.`,
    },
    {
      id: 'letter',
      title: 'Letter',
      description: 'For formal correspondence and requests.',
      content: `# Formal Letter

Date:
Recipient:

Dear Recipient,

State the purpose of the letter clearly and formally.

## Details

Provide the necessary context and supporting information.

Sincerely,

Sender Name`,
    },
  ],
};

const isPasteMode = (value: string): value is PasteMode => value === 'auto' || value === 'plain';

const loadPasteMode = (): PasteMode => {
  if (typeof window === 'undefined') return 'auto';
  try {
    const stored = window.localStorage.getItem(PASTE_MODE_STORAGE_KEY);
    if (stored && isPasteMode(stored)) {
      return stored;
    }
  } catch {
    // Ignore storage errors and fall back to default.
  }
  return 'auto';
};

const savePasteMode = (mode: PasteMode) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PASTE_MODE_STORAGE_KEY, mode);
  } catch {
    // Ignore storage errors.
  }
};

function LanguageSwitch() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="language-switch">
      <button
        type="button"
        className={`lang-btn ${language === 'cn' ? 'active' : ''}`}
        onClick={() => setLanguage('cn')}
      >
        中文
      </button>
      <span className="lang-divider">|</span>
      <button
        type="button"
        className={`lang-btn ${language === 'en' ? 'active' : ''}`}
        onClick={() => setLanguage('en')}
      >
        EN
      </button>
    </div>
  );
}

function formatDisplayName(templateName: string, nameEn: string, language: Language) {
  return language === 'cn' ? templateName : nameEn;
}

function sanitizePreviewText(text: string): string {
  return text
    .replace(/[*_`>#-]/g, ' ')
    .replace(/\[[^\]]+\]\(([^)]+)\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildPreviewBlocks(text: string, fallbackBlocks: PreviewBlock[]): PreviewBlock[] {
  if (!text.trim()) {
    return fallbackBlocks;
  }

  const blocks: PreviewBlock[] = [];
  const paragraphBuffer: string[] = [];
  const lines = text.split(/\r?\n/);

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) return;
    const paragraphText = sanitizePreviewText(paragraphBuffer.join(' '));
    if (paragraphText) {
      blocks.push({ type: 'bodyText', text: paragraphText });
    }
    paragraphBuffer.length = 0;
  };

  for (const line of lines) {
    if (blocks.length >= PREVIEW_BLOCK_LIMIT) break;
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      continue;
    }

    if (/^#\s+/.test(trimmed)) {
      flushParagraph();
      blocks.push({ type: 'title', text: sanitizePreviewText(trimmed.replace(/^#\s+/, '')) });
      continue;
    }

    if (/^##\s+/.test(trimmed)) {
      flushParagraph();
      blocks.push({ type: 'heading1', text: sanitizePreviewText(trimmed.replace(/^##\s+/, '')) });
      continue;
    }

    if (/^###\s+/.test(trimmed)) {
      flushParagraph();
      blocks.push({ type: 'heading2', text: sanitizePreviewText(trimmed.replace(/^###\s+/, '')) });
      continue;
    }

    if (/^####\s+/.test(trimmed)) {
      flushParagraph();
      blocks.push({ type: 'heading3', text: sanitizePreviewText(trimmed.replace(/^####\s+/, '')) });
      continue;
    }

    if (/^#####\s+/.test(trimmed)) {
      flushParagraph();
      blocks.push({
        type: 'heading4',
        text: sanitizePreviewText(trimmed.replace(/^#####\s+/, '')),
      });
      continue;
    }

    if (/^>\s+/.test(trimmed)) {
      flushParagraph();
      blocks.push({ type: 'blockquote', text: sanitizePreviewText(trimmed.replace(/^>\s+/, '')) });
      continue;
    }

    if (/^([-*+]|\d+\.)\s+/.test(trimmed)) {
      flushParagraph();
      blocks.push({
        type: 'listItem',
        text: sanitizePreviewText(trimmed.replace(/^([-*+]|\d+\.)\s+/, '')),
      });
      continue;
    }

    paragraphBuffer.push(trimmed);
  }

  flushParagraph();

  return blocks.length > 0 ? blocks.slice(0, PREVIEW_BLOCK_LIMIT) : fallbackBlocks;
}

function getPreviewStyle(style: TextStyle): CSSProperties {
  return {
    fontFamily: style.englishFont ? `"${style.font}", "${style.englishFont}"` : `"${style.font}"`,
    fontSize: `${Math.max(style.size * 0.86, 10)}px`,
    fontWeight: style.bold ? 700 : 400,
    fontStyle: style.italic ? 'italic' : 'normal',
    textAlign: style.center ? 'center' : 'left',
    textIndent: style.indent ? '2em' : undefined,
    color: style.color ?? undefined,
    letterSpacing: style.characterSpacing ? `${style.characterSpacing / 20}px` : undefined,
    marginTop: style.spacingBefore ? `${Math.round(style.spacingBefore / 20)}px` : undefined,
  };
}

function getLineHeightValue(category: TemplateCategory, value: number, type: 'exact' | 'auto') {
  if (type === 'exact') {
    return `${Math.max(Math.round(value / 20), 24)}px`;
  }
  if (category === 'chinese') {
    return `${Math.max(value / 240, 1.45)}`;
  }
  return `${Math.max(value / 240, 1.35)}`;
}

function getPageNumberSample(format: 'dash' | 'plain') {
  return format === 'dash' ? '- 1 -' : '1';
}

function AppContent() {
  const [text, setText] = useState('');
  const [customFilename, setCustomFilename] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTemplateGalleryOpen, setIsTemplateGalleryOpen] = useState(false);
  const [showHeadingHint, setShowHeadingHint] = useState(false);
  const [showEscapedLatexHint, setShowEscapedLatexHint] = useState(false);
  const [showPasteUndoHint, setShowPasteUndoHint] = useState(false);
  const [pasteUndoState, setPasteUndoState] = useState<{
    prePasteContent: string;
    selection: PasteSelection;
    plainText: string;
  } | null>(null);
  const [pasteMode, setPasteMode] = useState<PasteMode>(loadPasteMode);
  const { styles, currentTemplate, template, setTemplate } = useStyles();
  const { language, t } = useLanguage();
  const { generate, isGenerating, error } = useDocxGenerator();

  const copy = PAGE_COPY[language];
  const templateInsight = TEMPLATE_INSIGHTS[template];
  const templatesInCategory = useMemo(
    () => getTemplatesByCategory(currentTemplate.category),
    [currentTemplate.category]
  );
  const scenarioPresets = SCENARIO_PRESETS[currentTemplate.category];
  const fallbackPreviewBlocks = useMemo(
    () => buildPreviewBlocks(scenarioPresets[0]?.content ?? '', []),
    [scenarioPresets]
  );
  const previewBlocks = useMemo(
    () => buildPreviewBlocks(text, fallbackPreviewBlocks),
    [fallbackPreviewBlocks, text]
  );
  const pageNumberSample = getPageNumberSample(currentTemplate.documentSettings.pageNumberFormat);
  const previewLineHeight = getLineHeightValue(
    currentTemplate.category,
    currentTemplate.documentSettings.lineSpacing.value,
    currentTemplate.documentSettings.lineSpacing.type
  );

  const detectedFilename = useMemo(() => {
    const title = extractTitle(text);
    return title ? sanitizeFilename(title) : '';
  }, [text]);

  const handleTemplateSelect = (templateId: TemplateName) => {
    setTemplate(templateId);
  };

  const markdownPatterns = [
    /^#{1,6}\s+.+$/m,
    /^\s*[-*+]\s+.+$/m,
    /^\s*\d+\.\s+.+$/m,
    /\*\*.+?\*\*/m,
    /\*.+?\*/m,
    /\[.+?\]\(.+?\)/m,
    /^\s*>\s+.+$/m,
    /`[^`]+`/m,
    /^```/m,
    /^\|.+\|$/m,
    /^\s*[-*_]{3,}\s*$/m,
    /\$\$.+?\$\$/s,
    /\$.+?\$/m,
  ];

  const containsMarkdown = (content: string): boolean => {
    const trimmed = content.trim();
    if (!trimmed) {
      return false;
    }
    return markdownPatterns.some((pattern) => pattern.test(trimmed));
  };

  const checkForMarkdown = (content: string) => {
    const trimmed = content.trim();
    if (trimmed.length < 50) {
      setShowHeadingHint(false);
      return;
    }

    const hasMarkdown = containsMarkdown(trimmed);
    setShowHeadingHint(!hasMarkdown);
  };

  const detectEscapedLatex = (content: string): boolean => {
    const escapedPattern =
      /\$[^$]*\\\\(frac|left|right|sum|int|prod|lim|sqrt|alpha|beta|gamma|delta|times|cdot|leq|geq|neq)[^$]*\$/;
    return escapedPattern.test(content);
  };

  const handleFixEscapedLatex = () => {
    const fixed = unescapeLatex(text);
    setText(fixed);
    setShowEscapedLatexHint(false);
    checkForMarkdown(fixed);
  };

  const handleGenerate = () => {
    const filename = customFilename.trim() || detectedFilename;
    generate(text, styles, currentTemplate.documentSettings, filename);
  };

  const handleLoadExample = () => {
    setText(examples[language]);
    setShowHeadingHint(false);
  };

  const handleClear = () => {
    setText('');
    setCustomFilename('');
    setShowHeadingHint(false);
    setShowEscapedLatexHint(false);
    setShowPasteUndoHint(false);
    setPasteUndoState(null);
  };

  const handleTextProcessingChange = (newText: string) => {
    setText(newText);
    checkForMarkdown(newText);
  };

  const hasRichHtml = (html: string): boolean =>
    /<(table|tr|th|td|ul|ol|li|h[1-6]|blockquote|pre|code|strong|em|b|i|br|hr|p)\b/i.test(html);

  const handlePaste = (
    html: string,
    plainText: string,
    selection: PasteSelection
  ): string | null => {
    setShowHeadingHint(false);
    setShowPasteUndoHint(false);
    setPasteUndoState(null);
    const plainHasMarkdown = containsMarkdown(plainText);
    if (pasteMode === 'plain' || !html || plainHasMarkdown) {
      checkForMarkdown(plainText);
      if (detectEscapedLatex(plainText)) {
        setShowEscapedLatexHint(true);
      }
      return plainText;
    }

    const markdown = htmlToMarkdown(html);
    const shouldShowPasteUndoHint = markdown.trim() !== plainText.trim() || hasRichHtml(html);

    if (shouldShowPasteUndoHint && plainText.trim().length > 0) {
      setPasteUndoState({
        prePasteContent: text,
        selection,
        plainText,
      });
      setShowPasteUndoHint(true);
      setTimeout(() => {
        setShowPasteUndoHint(false);
      }, 8000);
    }

    checkForMarkdown(markdown);
    if (detectEscapedLatex(markdown)) {
      setShowEscapedLatexHint(true);
    }
    return markdown;
  };

  const handleUndoPaste = () => {
    if (pasteUndoState !== null) {
      const { prePasteContent, selection, plainText } = pasteUndoState;
      const restoredText =
        prePasteContent.substring(0, selection.start) +
        plainText +
        prePasteContent.substring(selection.end);
      setText(restoredText);
      setShowPasteUndoHint(false);
      setPasteUndoState(null);
      checkForMarkdown(restoredText);
    }
  };

  const handleTextChange = (value: string) => {
    setText(value);
    setShowPasteUndoHint(false);
    setPasteUndoState(null);
    checkForMarkdown(value);
    if (detectEscapedLatex(value)) {
      setShowEscapedLatexHint(true);
    }
  };

  const applyScenario = (scenario: ScenarioPreset) => {
    if (text.trim() && !window.confirm(copy.replaceScenarioConfirm)) {
      return;
    }

    startTransition(() => {
      setText(scenario.content);
      setCustomFilename('');
      setShowHeadingHint(false);
      setShowEscapedLatexHint(false);
      setShowPasteUndoHint(false);
      setPasteUndoState(null);
    });
  };

  const handleCreateSkeleton = () => {
    if (scenarioPresets[0]) {
      applyScenario(scenarioPresets[0]);
    }
  };

  return (
    <div className="app-shell">
      <header className="hero-shell">
        <div className="hero-topbar">
          <div className="hero-branding">
            <img src="/logo.png" alt="FormalDoc Logo" className="logo" />
            <div>
              <div className="brand-tag">{copy.brandTag}</div>
              <div className="brand-name">FormalDoc</div>
            </div>
          </div>
          <div className="hero-topbar-actions">
            <a
              href="https://github.com/shrektan/formaldoc"
              target="_blank"
              rel="noopener noreferrer"
              className="github-link"
              title="GitHub"
            >
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </a>
            <LanguageSwitch />
          </div>
        </div>

        <div className="hero-grid">
          <div className="hero-copy">
            <h1>{copy.heroTitle}</h1>
            <p className="hero-subtitle">{copy.heroSubtitle}</p>
            <div className="value-props">
              {copy.valueProps.map((item) => (
                <span key={item} className="value-pill">
                  {item}
                </span>
              ))}
            </div>

            <div className="template-rail-panel">
              <div className="section-eyebrow">{copy.railLabel}</div>
              <TemplateStrip
                currentTemplate={template}
                onSelect={handleTemplateSelect}
                onOpenSettings={() => setIsTemplateGalleryOpen(true)}
              />
            </div>
          </div>

          <div className="hero-proof-card">
            <div className="hero-proof-top">
              <span className="proof-badge">{copy.proofBadge}</span>
              <span className="proof-standard">{templateInsight.standard}</span>
            </div>
            <div className="section-eyebrow">{copy.proofTitle}</div>
            <h2>{formatDisplayName(currentTemplate.name, currentTemplate.nameEn, language)}</h2>
            <p>
              {formatDisplayName(
                currentTemplate.description,
                currentTemplate.descriptionEn,
                language
              )}
            </p>
            <div className="hero-proof-metrics">
              <div className="metric-card">
                <span>{copy.body}</span>
                <strong>{currentTemplate.specs.bodyFont}</strong>
              </div>
              <div className="metric-card">
                <span>{copy.lineSpacing}</span>
                <strong>{currentTemplate.specs.lineSpacing}</strong>
              </div>
              <div className="metric-card">
                <span>{copy.pageNumber}</span>
                <strong>{pageNumberSample}</strong>
              </div>
              <div className="metric-card">
                <span>{copy.localOnly}</span>
                <strong>DOCX</strong>
              </div>
            </div>
            <p className="hero-proof-note">{templateInsight.promise[language]}</p>
          </div>
        </div>
      </header>

      <main className="workspace-shell">
        <div className="workspace-grid">
          <section className="panel editor-panel">
            <div className="panel-header">
              <div>
                <div className="section-eyebrow">{copy.livePreview}</div>
                <h2>{copy.inputTitle}</h2>
              </div>
              <p>{copy.inputDescription}</p>
            </div>

            <div className="input-actions">
              <div className="input-actions-left">
                <div className="paste-mode">
                  <label htmlFor="paste-mode">{t.input.pasteModeLabel}</label>
                  <select
                    id="paste-mode"
                    value={pasteMode}
                    onChange={(e) => {
                      const nextMode = e.target.value as PasteMode;
                      setPasteMode(nextMode);
                      savePasteMode(nextMode);
                    }}
                  >
                    <option value="auto">{t.input.pasteModeAuto}</option>
                    <option value="plain">{t.input.pasteModePlain}</option>
                  </select>
                </div>
                <TextProcessingMenu
                  text={text}
                  onTextChange={handleTextProcessingChange}
                  disabled={!text.trim()}
                />
              </div>
              <div className="input-actions-right">
                <button
                  className="action-btn"
                  onClick={() => setIsSettingsOpen(true)}
                  type="button"
                >
                  {copy.customize}
                </button>
                <button className="action-btn" onClick={handleLoadExample} type="button">
                  {t.buttons.example}
                </button>
                <button
                  className="action-btn action-btn-secondary"
                  onClick={handleClear}
                  type="button"
                  disabled={!text.trim()}
                >
                  {t.buttons.clear}
                </button>
              </div>
            </div>

            <MarkdownEditor
              value={text}
              onChange={handleTextChange}
              onPaste={handlePaste}
              placeholder={t.input.placeholder}
            />

            {showHeadingHint && (
              <div className="heading-hint">
                <span>{t.hints.noHeadings}</span>
                <button
                  type="button"
                  className="hint-close"
                  onClick={() => setShowHeadingHint(false)}
                  aria-label={t.hints.closeHint}
                >
                  ×
                </button>
              </div>
            )}

            {showEscapedLatexHint && (
              <div className="heading-hint">
                <span>{t.hints.escapedLatex}</span>
                <button type="button" className="fix-btn" onClick={handleFixEscapedLatex}>
                  {t.hints.fixEscapedLatex}
                </button>
                <button
                  type="button"
                  className="hint-close"
                  onClick={() => setShowEscapedLatexHint(false)}
                  aria-label={t.hints.closeHint}
                >
                  ×
                </button>
              </div>
            )}

            {showPasteUndoHint && (
              <div className="heading-hint">
                <span>{t.hints.pasteConverted}</span>
                <button type="button" className="fix-btn" onClick={handleUndoPaste}>
                  {t.hints.undoPaste}
                </button>
                <button
                  type="button"
                  className="hint-close"
                  onClick={() => {
                    setShowPasteUndoHint(false);
                    setPasteUndoState(null);
                  }}
                  aria-label={t.hints.closeHint}
                >
                  ×
                </button>
              </div>
            )}

            <div className="filename-row">
              <label htmlFor="filename">{t.filename.label}</label>
              <div className="filename-input-wrapper">
                <input
                  type="text"
                  id="filename"
                  className="filename-input"
                  value={customFilename || detectedFilename}
                  onChange={(e) => setCustomFilename(e.target.value)}
                  placeholder={t.filename.placeholder}
                />
                <span className="filename-ext">.docx</span>
                {customFilename && (
                  <button
                    type="button"
                    className="filename-reset"
                    onClick={() => setCustomFilename('')}
                    title={t.filename.reset}
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="panel preview-panel">
            <div className="panel-header">
              <div>
                <div className="section-eyebrow">{copy.livePreview}</div>
                <h2>{copy.previewTitle}</h2>
              </div>
              <p>{copy.previewDescription}</p>
            </div>

            {!text.trim() && <div className="panel-note">{copy.previewEmpty}</div>}

            <div className="preview-paper-shell">
              <div className="preview-paper" style={{ lineHeight: previewLineHeight }}>
                {previewBlocks.map((block, index) => (
                  <div
                    key={`${block.type}-${index}`}
                    className={`preview-block preview-${block.type}`}
                    style={getPreviewStyle(styles[block.type])}
                  >
                    {block.type === 'listItem' ? <span className="preview-bullet">•</span> : null}
                    <span>{block.text}</span>
                  </div>
                ))}
                <div className="preview-footer" style={getPreviewStyle(styles.pageFooter)}>
                  {pageNumberSample}
                </div>
              </div>
            </div>
          </section>

          <aside className="panel insights-panel">
            <div className="panel-header">
              <div>
                <div className="section-eyebrow">{templateInsight.standard}</div>
                <h2>{copy.templateTitle}</h2>
              </div>
              <p>{copy.templateDescription}</p>
            </div>

            <div className="insight-card">
              <div className="insight-card-head">
                <h3>{formatDisplayName(currentTemplate.name, currentTemplate.nameEn, language)}</h3>
                <span className="insight-standard">{templateInsight.standard}</span>
              </div>
              <p className="insight-description">
                {formatDisplayName(
                  currentTemplate.description,
                  currentTemplate.descriptionEn,
                  language
                )}
              </p>
              <div className="tag-list">
                {templateInsight.audience[language].map((item) => (
                  <span key={item} className="tag-chip">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="insight-section">
              <h3>{copy.specTitle}</h3>
              <div className="spec-list">
                <div className="spec-item">
                  <span>{copy.standard}</span>
                  <strong>{templateInsight.standard}</strong>
                </div>
                <div className="spec-item">
                  <span>{copy.body}</span>
                  <strong>{currentTemplate.specs.bodyFont}</strong>
                </div>
                <div className="spec-item">
                  <span>{copy.heading}</span>
                  <strong>{currentTemplate.specs.headingFont}</strong>
                </div>
                <div className="spec-item">
                  <span>{copy.lineSpacing}</span>
                  <strong>{currentTemplate.specs.lineSpacing}</strong>
                </div>
                <div className="spec-item">
                  <span>{copy.indent}</span>
                  <strong>{currentTemplate.specs.indent}</strong>
                </div>
                <div className="spec-item">
                  <span>{copy.pageNumber}</span>
                  <strong>{pageNumberSample}</strong>
                </div>
              </div>
            </div>

            <div className="insight-section">
              <h3>{copy.quickSwitchTitle}</h3>
              <div className="template-switch-grid">
                {templatesInCategory.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`template-switch-card ${item.id === template ? 'active' : ''}`}
                    onClick={() => handleTemplateSelect(item.id)}
                  >
                    <span className="template-switch-name">
                      {formatDisplayName(item.name, item.nameEn, language)}
                    </span>
                    <span className="template-switch-spec">
                      {item.specs.bodyFont} · {item.specs.lineSpacing}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="insight-section">
              <h3>{copy.scenarioTitle}</h3>
              <p className="insight-section-copy">{copy.scenarioDescription}</p>
              <div className="scenario-grid">
                {scenarioPresets.map((scenario) => (
                  <div key={scenario.id} className="scenario-card">
                    <div>
                      <h4>{scenario.title}</h4>
                      <p>{scenario.description}</p>
                    </div>
                    <button
                      type="button"
                      className="scenario-button"
                      onClick={() => applyScenario(scenario)}
                    >
                      {copy.applyScenario}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <section className="action-bar">
          <div className="action-copy">
            <div className="section-eyebrow">{copy.actionTitle}</div>
            <h2>{copy.exportWord}</h2>
            <p>{copy.actionDescription}</p>
          </div>
          <div className="action-buttons">
            <button className="outline-button" onClick={handleCreateSkeleton} type="button">
              {copy.createSkeleton}
            </button>
            <button
              className="generate-btn"
              onClick={handleGenerate}
              disabled={!text.trim() || isGenerating}
              type="button"
            >
              {isGenerating ? t.buttons.downloading : copy.exportWord}
            </button>
            <button className="action-btn" onClick={() => setIsSettingsOpen(true)} type="button">
              {copy.customize}
            </button>
            <button
              className="action-btn action-btn-secondary"
              onClick={() => setIsTemplateGalleryOpen(true)}
              type="button"
            >
              {copy.chooseTemplate}
            </button>
          </div>
        </section>

        <a className="feedback-cta" href={FEEDBACK_URL}>
          {t.footer.feedback}
        </a>
      </main>

      <footer className="footer-simple">
        <p>{t.footer.tagline}</p>
        <p className="version">v{__APP_VERSION__}</p>
      </footer>

      <StyleDrawer isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      <TemplateGallery
        isOpen={isTemplateGalleryOpen}
        currentTemplate={template}
        onSelect={handleTemplateSelect}
        onClose={() => setIsTemplateGalleryOpen(false)}
      />

      <LoadingOverlay isVisible={isGenerating} message={t.loading.generating} />
    </div>
  );
}

function AppWithLanguage({
  language,
  onLanguageChange,
}: {
  language: Language;
  onLanguageChange: (lang: Language) => void;
}) {
  const { currentTemplate, setTemplate } = useStyles();

  const handleLanguageChange = useCallback(
    (lang: Language) => {
      onLanguageChange(lang);

      const currentCategory = currentTemplate.category;
      const targetCategory = lang === 'cn' ? 'chinese' : 'english';

      if (currentCategory !== targetCategory) {
        const templateForLang = lang === 'cn' ? 'cn-general' : 'en-standard';
        setTemplate(templateForLang);
      }
    },
    [currentTemplate.category, setTemplate, onLanguageChange]
  );

  return (
    <LanguageProvider initialLanguage={language} onLanguageChange={handleLanguageChange}>
      <AppContent />
      <Analytics />
    </LanguageProvider>
  );
}

function App() {
  const [language, setLanguage] = useState<Language>(() => detectInitialLanguage());

  return (
    <StyleProvider key={language} language={language}>
      <AppWithLanguage language={language} onLanguageChange={setLanguage} />
    </StyleProvider>
  );
}

export default App;
