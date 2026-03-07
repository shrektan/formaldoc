import { startTransition, useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
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
    compactTitle: '粘贴内容，直接生成规范 Word',
    compactSubtitle: '把模板说明收在旁边，把正文输入放到首屏中央。用户进入页面后，先粘贴，再导出。',
    infoPills: ['GB/T 9704-2012 模板', '支持完整公文骨架', '浏览器本地生成'],
    editorTitle: '文稿输入',
    editorDescription: '从豆包、ChatGPT 等复制内容后，直接粘贴到这里。',
    currentTemplateTitle: '当前模板',
    currentTemplateDescription: '保留最关键的规格说明，避免首屏重复堆信息。',
    quickStartTitle: '快速骨架',
    quickStartDescription: '需要起草完整公文时，先选一个场景，再一键插入。',
    previewTitle: '成品预览',
    previewDescription: '视觉预览当前模板的大致版式，不追求与 Word 像素级一致。',
    previewEmpty: '未输入正文时，预览展示当前场景骨架。',
    detailsSummary: '展开查看模板详情与适用场景',
    generateLabel: '生成 Word',
    generatingLabel: '生成中...',
    skeletonLabel: '插入完整骨架',
    styleLabel: '自定义样式',
    templatesLabel: '全部模板',
    standardLabel: '规范',
    audienceLabel: '适用',
    bodyLabel: '正文',
    headingLabel: '标题',
    spacingLabel: '行距',
    indentLabel: '缩进',
    pageNumberLabel: '页码',
    localLabel: '本地生成',
    replaceScenarioConfirm: '当前内容将被所选骨架覆盖，是否继续？',
    footer: '无需登录 · 支持 AI 富文本粘贴 · 支持离线使用',
  },
  en: {
    compactTitle: 'Paste content and export a polished Word document',
    compactSubtitle: 'Keep the document input in the first screen. Templates, preview, and quick starts stay nearby instead of blocking the main flow.',
    infoPills: ['GB/T 9704-2012 preset', 'Complete document skeletons', 'Local export'],
    editorTitle: 'Document Input',
    editorDescription: 'Paste content from AI tools or your draft, then export directly.',
    currentTemplateTitle: 'Current Template',
    currentTemplateDescription: 'Show only the essential specs first, and keep the rest compact.',
    quickStartTitle: 'Quick Skeletons',
    quickStartDescription: 'Choose a structure first when you need a complete formal draft.',
    previewTitle: 'Preview',
    previewDescription: 'A visual approximation of the final layout, not a pixel-perfect Word renderer.',
    previewEmpty: 'When the editor is empty, the preview falls back to the selected skeleton.',
    detailsSummary: 'Show template details and supported use cases',
    generateLabel: 'Generate Word',
    generatingLabel: 'Generating...',
    skeletonLabel: 'Insert Skeleton',
    styleLabel: 'Customize Styles',
    templatesLabel: 'Browse Templates',
    standardLabel: 'Standard',
    audienceLabel: 'Use Cases',
    bodyLabel: 'Body',
    headingLabel: 'Heading',
    spacingLabel: 'Spacing',
    indentLabel: 'Indent',
    pageNumberLabel: 'Page Number',
    localLabel: 'Local Export',
    replaceScenarioConfirm: 'Replace the current content with the selected skeleton?',
    footer: 'No login · Rich AI paste support · Works offline',
  },
} as const;

const PAGE_METADATA: Record<
  Language,
  {
    htmlLang: string;
    title: string;
    description: string;
    ogTitle: string;
    ogDescription: string;
    twitterTitle: string;
    twitterDescription: string;
  }
> = {
  cn: {
    htmlLang: 'zh-CN',
    title: 'FormalDoc - 内置规范公文模板的一键 Word 生成工具',
    description:
      'FormalDoc 提供内置公文模板和完整文稿骨架，一键将 AI 生成内容整理成规范 Word 文档。支持 GB/T 9704-2012 公文格式、学术论文、商务报告，本地生成，不上传内容。',
    ogTitle: 'FormalDoc - 内置规范公文模板的一键 Word 生成工具',
    ogDescription:
      '把 AI 内容直接整理成规范 Word 文档，内置 GB/T 9704-2012 公文模板、完整文稿骨架和样式切换能力。',
    twitterTitle: 'FormalDoc - Built-in formal templates for Word documents',
    twitterDescription:
      'Generate polished Word documents with built-in public document templates, complete skeletons, and local export.',
  },
  en: {
    htmlLang: 'en',
    title: 'FormalDoc - Built-in formal templates for polished Word documents',
    description:
      'FormalDoc turns drafts and AI output into polished Word documents with built-in public document templates, complete document skeletons, and local export.',
    ogTitle: 'FormalDoc - Built-in formal templates for polished Word documents',
    ogDescription:
      'Turn AI output into polished Word files with built-in formal templates, complete document skeletons, and local export.',
    twitterTitle: 'FormalDoc - Built-in formal templates for polished Word documents',
    twitterDescription:
      'Turn drafts and AI output into polished Word documents with built-in formal templates and complete document skeletons.',
  },
};

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

2026年3月8日`,
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

2026年3月8日`,
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

2026年3月8日`,
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

2026年3月8日`,
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

2026年3月8日`,
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
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
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
    fontSize: `${Math.max(style.size * 0.82, 10)}px`,
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
  const metadata = PAGE_METADATA[language];
  const templateInsight = TEMPLATE_INSIGHTS[template];
  const scenarioPresets = SCENARIO_PRESETS[currentTemplate.category];
  const [selectedScenarioId, setSelectedScenarioId] = useState(() => scenarioPresets[0]?.id ?? '');
  const selectedScenario = useMemo(
    () =>
      scenarioPresets.find((scenario) => scenario.id === selectedScenarioId) ?? scenarioPresets[0],
    [scenarioPresets, selectedScenarioId]
  );

  useEffect(() => {
    if (!scenarioPresets.some((scenario) => scenario.id === selectedScenarioId)) {
      setSelectedScenarioId(scenarioPresets[0]?.id ?? '');
    }
  }, [scenarioPresets, selectedScenarioId]);

  useEffect(() => {
    document.documentElement.lang = metadata.htmlLang;
    document.title = metadata.title;

    const updateMeta = (selector: string, content: string) => {
      const element = document.head.querySelector<HTMLMetaElement>(selector);
      if (element) {
        element.content = content;
      }
    };

    updateMeta('meta[name="title"]', metadata.title);
    updateMeta('meta[name="description"]', metadata.description);
    updateMeta('meta[property="og:title"]', metadata.ogTitle);
    updateMeta('meta[property="og:description"]', metadata.ogDescription);
    updateMeta('meta[name="twitter:title"]', metadata.twitterTitle);
    updateMeta('meta[name="twitter:description"]', metadata.twitterDescription);
  }, [metadata]);

  const previewFallback = useMemo(
    () => buildPreviewBlocks(selectedScenario?.content ?? '', []),
    [selectedScenario]
  );
  const previewBlocks = useMemo(
    () => buildPreviewBlocks(text, previewFallback),
    [previewFallback, text]
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
    if (!trimmed) return false;
    return markdownPatterns.some((pattern) => pattern.test(trimmed));
  };

  const checkForMarkdown = (content: string) => {
    const trimmed = content.trim();
    if (trimmed.length < 50) {
      setShowHeadingHint(false);
      return;
    }
    setShowHeadingHint(!containsMarkdown(trimmed));
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
    if (pasteUndoState === null) return;
    const { prePasteContent, selection, plainText } = pasteUndoState;
    const restoredText =
      prePasteContent.substring(0, selection.start) +
      plainText +
      prePasteContent.substring(selection.end);
    setText(restoredText);
    setShowPasteUndoHint(false);
    setPasteUndoState(null);
    checkForMarkdown(restoredText);
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
      setSelectedScenarioId(scenario.id);
      setText(scenario.content);
      setCustomFilename('');
      setShowHeadingHint(false);
      setShowEscapedLatexHint(false);
      setShowPasteUndoHint(false);
      setPasteUndoState(null);
    });
  };

  return (
    <div className="app-shell">
      <header className="topbar-shell">
        <div className="topbar-brand">
          <img src="/logo.png" alt="FormalDoc Logo" className="logo" />
          <div className="topbar-copy">
            <div className="brand-kicker">FormalDoc</div>
            <h1>{copy.compactTitle}</h1>
            <p>{copy.compactSubtitle}</p>
          </div>
        </div>
        <div className="topbar-tools">
          <div className="info-pill-row">
            {copy.infoPills.map((item) => (
              <span key={item} className="info-pill">
                {item}
              </span>
            ))}
          </div>
          <div className="topbar-actions">
            <a
              href="https://github.com/shrektan/formaldoc"
              target="_blank"
              rel="noopener noreferrer"
              className="github-link"
              title="GitHub"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              GitHub
            </a>
            <LanguageSwitch />
          </div>
        </div>
      </header>

      <main className="workspace-shell">
        <section className="composer-shell">
          <div className="composer-topbar">
            <div className="composer-heading">
              <span className="section-kicker">{copy.editorTitle}</span>
              <h2>{copy.editorTitle}</h2>
              <p>{copy.editorDescription}</p>
            </div>
            <div className="composer-meta">
              <span className="meta-chip">{templateInsight.standard}</span>
              <span className="meta-chip">{copy.localLabel}</span>
            </div>
          </div>

          <div className="template-strip-row">
            <TemplateStrip
              currentTemplate={template}
              onSelect={setTemplate}
              onOpenSettings={() => setIsTemplateGalleryOpen(true)}
            />
          </div>

          <div className="composer-toolbar">
            <div className="toolbar-group">
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
            <div className="toolbar-group">
              <button
                className="action-btn"
                onClick={() => setIsSettingsOpen(true)}
                type="button"
              >
                {copy.styleLabel}
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
            <div className="hint-row">
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
            <div className="hint-row">
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
            <div className="hint-row">
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

          {error && <div className="error-msg">{error}</div>}

          <div className="composer-footer">
            <div className="filename-field">
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

            <div className="primary-actions">
              <button
                type="button"
                className="secondary-cta"
                onClick={() => selectedScenario && applyScenario(selectedScenario)}
              >
                {copy.skeletonLabel}
              </button>
              <button
                type="button"
                className="primary-cta"
                onClick={handleGenerate}
                disabled={!text.trim() || isGenerating}
              >
                {isGenerating ? copy.generatingLabel : copy.generateLabel}
              </button>
            </div>
          </div>
        </section>

        <aside className="support-shell">
          <section className="support-card">
            <div className="support-card-header">
              <div>
                <span className="section-kicker">{copy.currentTemplateTitle}</span>
                <h3>{formatDisplayName(currentTemplate.name, currentTemplate.nameEn, language)}</h3>
              </div>
              <span className="meta-chip strong">{templateInsight.standard}</span>
            </div>
            <p className="support-copy">{copy.currentTemplateDescription}</p>
            <div className="spec-grid">
              <div className="spec-item">
                <span>{copy.bodyLabel}</span>
                <strong>{currentTemplate.specs.bodyFont}</strong>
              </div>
              <div className="spec-item">
                <span>{copy.headingLabel}</span>
                <strong>{currentTemplate.specs.headingFont}</strong>
              </div>
              <div className="spec-item">
                <span>{copy.spacingLabel}</span>
                <strong>{currentTemplate.specs.lineSpacing}</strong>
              </div>
              <div className="spec-item">
                <span>{copy.pageNumberLabel}</span>
                <strong>{pageNumberSample}</strong>
              </div>
            </div>
            <div className="support-actions">
              <button
                type="button"
                className="action-btn"
                onClick={() => setIsTemplateGalleryOpen(true)}
              >
                {copy.templatesLabel}
              </button>
              <button type="button" className="action-btn" onClick={() => setIsSettingsOpen(true)}>
                {copy.styleLabel}
              </button>
            </div>
            <details className="template-details">
              <summary>{copy.detailsSummary}</summary>
              <div className="details-body">
                <p>{templateInsight.promise[language]}</p>
                <div className="details-line">
                  <span>{copy.standardLabel}</span>
                  <strong>{templateInsight.standard}</strong>
                </div>
                <div className="details-line">
                  <span>{copy.audienceLabel}</span>
                  <strong>{templateInsight.audience[language].join(' / ')}</strong>
                </div>
                <div className="details-line">
                  <span>{copy.indentLabel}</span>
                  <strong>{currentTemplate.specs.indent}</strong>
                </div>
              </div>
            </details>
          </section>

          <section className="support-card">
            <div className="support-card-header">
              <div>
                <span className="section-kicker">{copy.quickStartTitle}</span>
                <h3>{copy.quickStartTitle}</h3>
              </div>
            </div>
            <p className="support-copy">{copy.quickStartDescription}</p>
            <div className="scenario-grid">
              {scenarioPresets.map((scenario) => (
                <button
                  key={scenario.id}
                  type="button"
                  className={`scenario-card ${selectedScenario?.id === scenario.id ? 'active' : ''}`}
                  onClick={() => setSelectedScenarioId(scenario.id)}
                  aria-pressed={selectedScenario?.id === scenario.id}
                >
                  <span className="scenario-card-title">{scenario.title}</span>
                  <span className="scenario-card-description">{scenario.description}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="support-card preview-card">
            <div className="support-card-header">
              <div>
                <span className="section-kicker">{copy.previewTitle}</span>
                <h3>{copy.previewTitle}</h3>
              </div>
            </div>
            <p className="support-copy">
              {text.trim() ? copy.previewDescription : copy.previewEmpty}
            </p>
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
        </aside>
      </main>

      <a className="feedback-cta" href={FEEDBACK_URL}>
        {t.footer.feedback}
      </a>

      <footer className="footer-simple">
        <p>{copy.footer}</p>
        <p className="version">v{__APP_VERSION__}</p>
      </footer>

      <StyleDrawer isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <TemplateGallery
        isOpen={isTemplateGalleryOpen}
        currentTemplate={template}
        onSelect={setTemplate}
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
