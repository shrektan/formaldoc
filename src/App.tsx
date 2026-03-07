import { useState, useCallback, useMemo, useEffect, type CSSProperties } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { StyleDrawer } from './components/StyleSettings';
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
import { unescapeLatex } from './lib/math/latex-to-docx';
import { detectInitialLanguage } from './lib/language-detection';
import { examples } from './i18n';
import type { Language } from './i18n';
import { getTemplatesByCategory } from './lib/styles/templates';
import type { Template, TemplateName, TextStyle } from './types/styles';
import './styles/app.css';

type PasteMode = 'auto' | 'plain';
type PreviewBlockType = 'title' | 'heading1' | 'heading2' | 'heading3' | 'heading4' | 'body';

interface PreviewBlock {
  type: PreviewBlockType;
  text: string;
}

interface ScenarioPreset {
  key: string;
  label: string;
  description: string;
  content: string;
}

interface WorkbenchCopy {
  eyebrow: string;
  title: string;
  description: string;
  pillars: string[];
  heroCardTitle: string;
  heroCardBody: string;
  heroCardPrimary: string;
  heroCardSecondary: string;
  editorEyebrow: string;
  editorTitle: string;
  editorHint: string;
  previewEyebrow: string;
  previewTitle: string;
  previewHint: string;
  previewEmpty: string;
  sidebarEyebrow: string;
  sidebarTitle: string;
  sidebarHint: string;
  standardsLabel: string;
  scenarioTitle: string;
  scenarioHint: string;
  scenarioAction: string;
  scenarioReplaceConfirm: string;
  scenarioSummaryLabel: string;
  exportLabel: string;
  exportLoadingLabel: string;
  styleLabel: string;
  templatesLabel: string;
  footerLead: string;
  footerPoints: string[];
  specLabels: {
    body: string;
    heading: string;
    spacing: string;
    indent: string;
    pageNumber: string;
  };
  standards: {
    govt: string;
    chinese: string;
    english: string;
  };
  pageNumber: {
    dash: string;
    plain: string;
  };
}

const PASTE_MODE_STORAGE_KEY = 'formaldoc.pasteMode';
const FEEDBACK_URL = 'mailto:support@formaldoc.app?subject=FormalDoc%20Feedback';

const WORKBENCH_COPY: Record<Language, WorkbenchCopy> = {
  cn: {
    eyebrow: 'FormalDoc 公文工作台',
    title: '内置规范公文模板，一键生成正式 Word 文档',
    description:
      '把 “AI 转 Word” 升级成真正可交付的办文结果。模板、层级、行距、页码和正文样式都已经预置好，尤其适合机关单位、国企和行政文稿场景。',
    pillars: ['GB/T 9704-2012 公文模板', '样式可选，可继续细调', '可插入完整公文骨架', '浏览器本地生成，不上传内容'],
    heroCardTitle: '当前模板策略',
    heroCardBody: '优先用模板和规范说明建立信任感，再进入编辑和导出，避免产品被理解成普通文本转换工具。',
    heroCardPrimary: '查看全部模板',
    heroCardSecondary: '自定义样式',
    editorEyebrow: '内容输入',
    editorTitle: '录入或粘贴待办文内容',
    editorHint: '保留现有 Markdown、富文本粘贴和文字处理能力，但以更专业的工作区形态展示。',
    previewEyebrow: 'A4 视觉预览',
    previewTitle: '当前模板的版式与层级感',
    previewHint: '这是视觉预览，不是与 Word 完全一致的精确渲染。它用于帮助你判断模板风格、层级和页码效果。',
    previewEmpty: '尚未输入正文，预览展示的是当前模板的示例骨架。',
    sidebarEyebrow: '模板与规范',
    sidebarTitle: '把模板能力做成产品主功能',
    sidebarHint: '右侧集中展示模板身份、规范摘要、场景选择和主操作，让用户理解“为什么这个模板值得信任”。',
    standardsLabel: '适用标准',
    scenarioTitle: '常用场景快速开始',
    scenarioHint: '先选择一个场景，再一键插入完整公文骨架；导出 Word 仍保留为单独动作。',
    scenarioAction: '一键生成完整公文骨架',
    scenarioReplaceConfirm: '当前编辑器内容将被所选场景骨架替换，是否继续？',
    scenarioSummaryLabel: '当前场景说明',
    exportLabel: '导出 Word 文档',
    exportLoadingLabel: '生成中...',
    styleLabel: '自定义样式',
    templatesLabel: '查看全部模板',
    footerLead: 'FormalDoc 的核心卖点不是“能导出”，而是“导出来就是规范格式”。',
    footerPoints: ['无需登录', '支持 AI 富文本粘贴', '支持模板预设与调整', '支持离线使用'],
    specLabels: {
      body: '正文',
      heading: '标题',
      spacing: '行距',
      indent: '缩进',
      pageNumber: '页码',
    },
    standards: {
      govt: 'GB/T 9704-2012',
      chinese: 'FormalDoc 中文模板',
      english: 'FormalDoc 英文模板',
    },
    pageNumber: {
      dash: '- 1 -',
      plain: '1',
    },
  },
  en: {
    eyebrow: 'FormalDoc Workbench',
    title: 'Built-in formal templates for polished Word documents',
    description:
      'Move beyond plain AI-to-Word export. FormalDoc turns generated content into structured, professional output with template logic, hierarchy, spacing, and document-ready presentation already in place.',
    pillars: [
      'GB/T 9704-2012 template support',
      'Switchable styles with fine tuning',
      'Complete document skeletons',
      'Local generation, content stays on device',
    ],
    heroCardTitle: 'Current positioning',
    heroCardBody:
      'Lead with formal templates and trusted formatting rules first, then let editing and export follow as execution steps.',
    heroCardPrimary: 'Browse templates',
    heroCardSecondary: 'Customize styles',
    editorEyebrow: 'Content Input',
    editorTitle: 'Paste or draft your source content',
    editorHint:
      'Keep the current Markdown, rich text paste, and cleanup features, but present them in a richer desktop workbench.',
    previewEyebrow: 'A4 Visual Preview',
    previewTitle: 'See the template tone before export',
    previewHint:
      'This is a visual preview, not a pixel-perfect Word renderer. It helps users understand tone, hierarchy, and page numbering.',
    previewEmpty: 'No content yet. The preview is showing a template skeleton.',
    sidebarEyebrow: 'Template Intelligence',
    sidebarTitle: 'Make template value impossible to miss',
    sidebarHint:
      'Use the sidebar to explain the active template, show its standards and specs, and promote complete-document workflows.',
    standardsLabel: 'Standard',
    scenarioTitle: 'Quick Starts',
    scenarioHint:
      'Choose a scenario first, then insert a complete document skeleton. Export stays as a separate action.',
    scenarioAction: 'Insert complete document skeleton',
    scenarioReplaceConfirm: 'Replace the current editor content with the selected skeleton?',
    scenarioSummaryLabel: 'Scenario notes',
    exportLabel: 'Export Word document',
    exportLoadingLabel: 'Generating...',
    styleLabel: 'Customize styles',
    templatesLabel: 'Browse all templates',
    footerLead: 'The point is not only exporting Word, but exporting something already formal and usable.',
    footerPoints: ['No login', 'Rich AI paste support', 'Template presets and tuning', 'Works offline'],
    specLabels: {
      body: 'Body',
      heading: 'Headings',
      spacing: 'Spacing',
      indent: 'Indent',
      pageNumber: 'Page number',
    },
    standards: {
      govt: 'GB/T 9704-2012',
      chinese: 'FormalDoc CN Template',
      english: 'FormalDoc EN Template',
    },
    pageNumber: {
      dash: '- 1 -',
      plain: '1',
    },
  },
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

const cleanPreviewText = (raw: string): string => {
  return raw
    .replace(/^#{1,6}\s+/, '')
    .replace(/^\s*[-*+]\s+/, '')
    .replace(/^\s*\d+\.\s+/, '')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/[*_`>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const buildPreviewBlocks = (content: string, fallbackTitle: string): PreviewBlock[] => {
  const meaningfulLines = content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const blocks: PreviewBlock[] = [];

  for (const line of meaningfulLines) {
    if (line.startsWith('# ')) {
      blocks.push({ type: 'title', text: cleanPreviewText(line) });
    } else if (line.startsWith('## ')) {
      blocks.push({ type: 'heading1', text: cleanPreviewText(line) });
    } else if (line.startsWith('### ')) {
      blocks.push({ type: 'heading2', text: cleanPreviewText(line) });
    } else if (line.startsWith('#### ')) {
      blocks.push({ type: 'heading3', text: cleanPreviewText(line) });
    } else if (line.startsWith('##### ')) {
      blocks.push({ type: 'heading4', text: cleanPreviewText(line) });
    } else {
      const text = cleanPreviewText(line);
      if (text) {
        blocks.push({ type: 'body', text });
      }
    }

    if (blocks.length >= 9) {
      break;
    }
  }

  if (!blocks.length || blocks[0]?.type !== 'title') {
    blocks.unshift({ type: 'title', text: fallbackTitle });
  }

  return blocks.slice(0, 9);
};

const getPreviewLineHeight = (lineSpacingValue: number, lineSpacingType: 'auto' | 'exact', bodySize: number) => {
  if (lineSpacingType === 'auto') {
    return Math.max(lineSpacingValue / 240, 1.35);
  }
  return Math.max(lineSpacingValue / (bodySize * 20), 1.5);
};

const getFontFamily = (style: TextStyle) => {
  const families = [style.font];
  if (style.englishFont) {
    families.push(style.englishFont);
  }
  families.push('PingFang SC', 'Microsoft YaHei', 'serif');
  return families.map((font) => (font.includes(' ') ? `"${font}"` : font)).join(', ');
};

const getPreviewTextStyle = (style: TextStyle, lineHeight: number): CSSProperties => ({
  fontFamily: getFontFamily(style),
  fontSize: `${Math.max(style.size * 1.18, 12)}px`,
  fontWeight: style.bold ? 700 : 400,
  fontStyle: style.italic ? 'italic' : 'normal',
  textAlign: style.center ? 'center' : 'left',
  textIndent: style.indent ? '2em' : undefined,
  lineHeight,
  color: style.color ?? 'var(--ink-900)',
  letterSpacing: style.characterSpacing ? `${style.characterSpacing / 20}px` : undefined,
  marginTop: style.spacingBefore ? `${style.spacingBefore / 20}px` : undefined,
});

const getTemplateDisplayName = (template: Template, language: Language) => {
  if (template.category === 'english') {
    return template.nameEn;
  }
  return language === 'cn' ? template.name : template.nameEn;
};

const getTemplateDescription = (template: Template, language: Language) => {
  if (template.category === 'english') {
    return template.descriptionEn;
  }
  return language === 'cn' ? template.description : template.descriptionEn;
};

const getTemplateStandard = (template: Template, copy: WorkbenchCopy) => {
  if (template.id === 'cn-gov') {
    return copy.standards.govt;
  }
  return template.category === 'chinese' ? copy.standards.chinese : copy.standards.english;
};

const getScenarioPresets = (language: Language, category: Template['category']): ScenarioPreset[] => {
  if (category === 'english') {
    return [
      {
        key: 'memo',
        label: language === 'cn' ? '备忘录' : 'Memo',
        description:
          language === 'cn'
            ? '适合内部同步、执行提醒和简短决策记录。'
            : 'Best for internal updates, short decisions, and operational notes.',
        content: `# Weekly Operations Memo\n\nTo: All Team Leads\n\nThis memo summarizes the current priorities and expected actions for the coming week.\n\n## 1. Key Focus Areas\n\nMaintain delivery rhythm, close open risks, and improve reporting consistency.\n\n## 2. Immediate Actions\n\n### 2.1 Documentation\n\nUpdate shared status notes before Friday.\n\n### 2.2 Review Cadence\n\nConfirm owners for each active workstream.\n\n## 3. Next Checkpoint\n\nPlease share blockers by end of day Thursday.\n\nOperations Office\n\nMarch 7, 2026`,
      },
      {
        key: 'report',
        label: language === 'cn' ? '报告' : 'Report',
        description:
          language === 'cn'
            ? '适合阶段总结、项目复盘和对外说明。'
            : 'Useful for project summaries, reviews, and formal reporting.',
        content: `# Quarterly Progress Report\n\nThis report outlines the key outcomes, current risks, and next-step recommendations for the quarter.\n\n## 1. Progress Overview\n\nThe team delivered the planned milestones with stable execution quality.\n\n## 2. Risks and Dependencies\n\n### 2.1 Delivery Risk\n\nA small number of issues remain dependent on external review.\n\n### 2.2 Resource Planning\n\nCapacity allocation should be confirmed for the next phase.\n\n## 3. Recommendations\n\nAlign timelines, document owners, and finalize the next milestone plan.`,
      },
      {
        key: 'briefing',
        label: language === 'cn' ? '简报' : 'Briefing',
        description:
          language === 'cn'
            ? '适合领导汇报、会前简报和快速摘要。'
            : 'Best for executive updates, pre-read packets, and concise summaries.',
        content: `# Executive Briefing\n\nThis briefing provides a concise view of current status, decisions needed, and immediate next steps.\n\n## 1. Current Status\n\nOverall execution remains on track with manageable risk.\n\n## 2. Decisions Required\n\n### 2.1 Scope Alignment\n\nConfirm scope boundaries for the next release.\n\n### 2.2 Timeline Review\n\nApprove milestone sequencing for April.\n\n## 3. Recommended Next Step\n\nProceed with the reviewed plan and assign final decision owners.`,
      },
      {
        key: 'letter',
        label: language === 'cn' ? '正式函件' : 'Letter',
        description:
          language === 'cn'
            ? '适合正式说明、对外沟通和回复函件。'
            : 'Use for formal correspondence and response letters.',
        content: `# Formal Letter\n\nDear [Recipient],\n\nThank you for your continued support and collaboration.\n\n## 1. Purpose\n\nThis letter is to confirm the current arrangement and outline the next expected actions.\n\n## 2. Follow-up\n\nPlease review the proposed timeline and share your feedback.\n\nSincerely,\n\n[Organization Name]\n\nMarch 7, 2026`,
      },
    ];
  }

  return [
    {
      key: 'notice',
      label: language === 'cn' ? '通知' : 'Notice',
      description:
        language === 'cn'
          ? '适合事项传达、工作部署和统一要求。'
          : 'Useful for announcements, work assignments, and unified instructions.',
      content: `# 关于开展年度材料归档工作的通知\n\n各有关单位：\n\n为进一步规范年度材料归档和日常管理工作，现将有关事项通知如下。\n\n## 一、总体要求\n\n请各单位结合实际，认真组织落实，确保相关工作按时完成。\n\n## 二、重点任务\n\n### （一）全面梳理材料\n\n对本年度形成的文件材料进行系统梳理，做到应归尽归。\n\n### （二）按时报送清单\n\n请于4月15日前完成整理并报送材料清单。\n\n## 三、工作要求\n\n请明确责任人，加强审核把关，确保材料真实、完整、规范。\n\n附件：材料清单\n\n示例单位\n\n2026年3月7日`,
    },
    {
      key: 'request',
      label: language === 'cn' ? '请示' : 'Request',
      description:
        language === 'cn'
          ? '适合需要上级审批、请示事项或申请资源。'
          : 'For approval requests, escalations, and resource applications.',
      content: `# 关于申请开展专项培训的请示\n\n上级主管部门：\n\n为进一步提升业务能力和执行规范，拟于近期组织开展专项培训。现将有关情况请示如下。\n\n## 一、基本情况\n\n当前相关岗位对规范化办文和材料整理的要求持续提升，培训需求较为迫切。\n\n## 二、拟开展事项\n\n### （一）培训对象\n\n拟覆盖综合、行政及业务支撑岗位人员。\n\n### （二）培训内容\n\n重点围绕公文写作、格式规范和材料整理开展。\n\n## 三、有关请求\n\n妥否，请批示。\n\n示例单位\n\n2026年3月7日`,
    },
    {
      key: 'report',
      label: language === 'cn' ? '报告' : 'Report',
      description:
        language === 'cn'
          ? '适合阶段总结、情况汇报和工作复盘。'
          : 'For progress updates, summaries, and formal reporting.',
      content: `# 关于一季度重点工作推进情况的报告\n\n现将一季度重点工作推进情况报告如下。\n\n## 一、总体进展\n\n各项重点工作稳步推进，整体进度符合预期。\n\n## 二、主要成效\n\n### （一）机制进一步完善\n\n围绕流程规范和责任落实，相关机制进一步优化。\n\n### （二）执行效率有所提升\n\n通过统一模板和集中组织，材料质量和效率有所提升。\n\n## 三、下一步安排\n\n下一阶段将继续强化执行闭环，确保各项任务落实到位。`,
    },
    {
      key: 'letter',
      label: language === 'cn' ? '函' : 'Letter',
      description:
        language === 'cn'
          ? '适合平行单位之间沟通、征求意见和正式回复。'
          : 'For formal communication and replies between peer organizations.',
      content: `# 关于征求有关事项意见的函\n\n有关单位：\n\n现就相关工作安排征求意见，请结合实际提出建议。\n\n## 一、征求事项\n\n请重点围绕工作安排、时间节点和职责分工提出意见建议。\n\n## 二、反馈时间\n\n请于4月10日前书面反馈。\n\n特此函询。\n\n示例单位\n\n2026年3月7日`,
    },
    {
      key: 'minutes',
      label: language === 'cn' ? '会议纪要' : 'Minutes',
      description:
        language === 'cn'
          ? '适合会议结论沉淀、责任分工和事项跟踪。'
          : 'For meeting summaries, responsibility tracking, and action items.',
      content: `# 会议纪要\n\n时间：2026年3月7日\n\n地点：第一会议室\n\n主持人：示例负责人\n\n## 一、会议情况\n\n会议围绕近期重点工作安排进行了研究讨论。\n\n## 二、形成意见\n\n### （一）统一工作节奏\n\n各部门按照既定节点推进相关事项。\n\n### （二）明确责任分工\n\n对重点任务逐项明确牵头人和完成时限。\n\n## 三、后续要求\n\n请各责任单位根据会议要求抓紧落实，并按时反馈进展。`,
    },
  ];
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
  const copy = WORKBENCH_COPY[language];
  const isChineseTemplate = currentTemplate.category === 'chinese';

  const scenarioPresets = useMemo(
    () => getScenarioPresets(language, currentTemplate.category),
    [language, currentTemplate.category]
  );
  const [selectedScenario, setSelectedScenario] = useState<string>(
    isChineseTemplate ? 'notice' : 'memo'
  );

  useEffect(() => {
    if (!scenarioPresets.some((preset) => preset.key === selectedScenario)) {
      setSelectedScenario(scenarioPresets[0]?.key ?? '');
    }
  }, [scenarioPresets, selectedScenario]);

  const selectedPreset = scenarioPresets.find((preset) => preset.key === selectedScenario) ?? scenarioPresets[0];

  const templateOptions = useMemo(
    () => getTemplatesByCategory(currentTemplate.category),
    [currentTemplate.category]
  );

  const detectedFilename = useMemo(() => {
    const title = extractTitle(text);
    return title ? sanitizeFilename(title) : '';
  }, [text]);

  const templateDisplayName = getTemplateDisplayName(currentTemplate, language);
  const templateDescription = getTemplateDescription(currentTemplate, language);
  const templateStandard = getTemplateStandard(currentTemplate, copy);

  const previewSource = text.trim() || selectedPreset?.content || '';
  const previewTitle = text.trim() ? templateDisplayName : `${templateDisplayName} · ${selectedPreset?.label ?? ''}`;
  const previewBlocks = useMemo(
    () => buildPreviewBlocks(previewSource, previewTitle),
    [previewSource, previewTitle]
  );

  const previewLineHeight = useMemo(
    () =>
      getPreviewLineHeight(
        currentTemplate.documentSettings.lineSpacing.value,
        currentTemplate.documentSettings.lineSpacing.type,
        styles.bodyText.size
      ),
    [currentTemplate.documentSettings.lineSpacing, styles.bodyText.size]
  );

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

  const handleInsertScenario = () => {
    if (!selectedPreset) return;
    if (text.trim() && !window.confirm(copy.scenarioReplaceConfirm)) {
      return;
    }

    setText(selectedPreset.content);
    setCustomFilename('');
    setShowHeadingHint(false);
    setShowEscapedLatexHint(false);
    setShowPasteUndoHint(false);
    setPasteUndoState(null);
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-topbar">
          <div className="brand-block">
            <div className="brand-mark">
              <img src="/logo.png" alt="FormalDoc Logo" className="brand-logo" />
            </div>
            <div className="brand-copy">
              <div className="brand-row">
                <span className="brand-eyebrow">{copy.eyebrow}</span>
                <span className="brand-standard-pill">{templateStandard}</span>
              </div>
              <h1>{copy.title}</h1>
              <p>{copy.description}</p>
            </div>
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

        <div className="hero-layout">
          <div className="hero-pillar-grid">
            {copy.pillars.map((pillar) => (
              <span key={pillar} className="hero-pillar">
                {pillar}
              </span>
            ))}
          </div>

          <div className="hero-card">
            <div className="hero-card-header">
              <div>
                <span className="section-eyebrow">{copy.sidebarEyebrow}</span>
                <h2>{copy.heroCardTitle}</h2>
              </div>
              <span className="hero-card-template">{templateDisplayName}</span>
            </div>
            <p>{copy.heroCardBody}</p>
            <div className="hero-card-actions">
              <button
                type="button"
                className="hero-secondary-btn"
                onClick={() => setIsTemplateGalleryOpen(true)}
              >
                {copy.heroCardPrimary}
              </button>
              <button
                type="button"
                className="hero-secondary-btn"
                onClick={() => setIsSettingsOpen(true)}
              >
                {copy.heroCardSecondary}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="workbench-grid">
        <section className="workbench-panel editor-panel">
          <div className="panel-header">
            <div>
              <span className="section-eyebrow">{copy.editorEyebrow}</span>
              <h2>{copy.editorTitle}</h2>
            </div>
            <p>{copy.editorHint}</p>
          </div>

          <div className="input-actions-card">
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
              <button className="action-btn" onClick={handleLoadExample} type="button">
                {t.buttons.example}
              </button>
              <button className="action-btn" onClick={() => setIsSettingsOpen(true)} type="button">
                {copy.styleLabel}
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

        <section className="workbench-panel preview-panel">
          <div className="panel-header">
            <div>
              <span className="section-eyebrow">{copy.previewEyebrow}</span>
              <h2>{copy.previewTitle}</h2>
            </div>
            <p>{text.trim() ? copy.previewHint : copy.previewEmpty}</p>
          </div>

          <div className="paper-frame">
            <div className="paper-sheet">
              <div className="paper-sheet-inner">
                {previewBlocks.map((block, index) => {
                  const styleMap: Record<PreviewBlockType, TextStyle> = {
                    title: styles.title,
                    heading1: styles.heading1,
                    heading2: styles.heading2,
                    heading3: styles.heading3,
                    heading4: styles.heading4,
                    body: styles.bodyText,
                  };

                  return (
                    <p
                      key={`${block.type}-${index}-${block.text}`}
                      className={`preview-block preview-block-${block.type}`}
                      style={getPreviewTextStyle(styleMap[block.type], previewLineHeight)}
                    >
                      {block.text}
                    </p>
                  );
                })}
              </div>
              <div className="paper-page-number">
                {currentTemplate.documentSettings.pageNumberFormat === 'dash'
                  ? copy.pageNumber.dash
                  : copy.pageNumber.plain}
              </div>
            </div>
          </div>

          <p className="preview-footnote">{copy.previewHint}</p>
        </section>

        <aside className="workbench-panel sidebar-panel">
          <div className="panel-header">
            <div>
              <span className="section-eyebrow">{copy.sidebarEyebrow}</span>
              <h2>{copy.sidebarTitle}</h2>
            </div>
            <p>{copy.sidebarHint}</p>
          </div>

          <div className="sidebar-card template-identity-card">
            <div className="template-identity-header">
              <div>
                <span className="template-standard-badge">{templateStandard}</span>
                <h3>{templateDisplayName}</h3>
              </div>
            </div>
            <p>{templateDescription}</p>

            <dl className="template-spec-list">
              <div>
                <dt>{copy.specLabels.body}</dt>
                <dd>{currentTemplate.specs.bodyFont}</dd>
              </div>
              <div>
                <dt>{copy.specLabels.heading}</dt>
                <dd>{currentTemplate.specs.headingFont}</dd>
              </div>
              <div>
                <dt>{copy.specLabels.spacing}</dt>
                <dd>{currentTemplate.specs.lineSpacing}</dd>
              </div>
              <div>
                <dt>{copy.specLabels.indent}</dt>
                <dd>{currentTemplate.specs.indent}</dd>
              </div>
              <div>
                <dt>{copy.specLabels.pageNumber}</dt>
                <dd>
                  {currentTemplate.documentSettings.pageNumberFormat === 'dash'
                    ? copy.pageNumber.dash
                    : copy.pageNumber.plain}
                </dd>
              </div>
            </dl>
          </div>

          <div className="sidebar-card">
            <div className="sidebar-card-header">
              <h3>{copy.templatesLabel}</h3>
              <button
                type="button"
                className="text-link-btn"
                onClick={() => setIsTemplateGalleryOpen(true)}
              >
                {copy.templatesLabel}
              </button>
            </div>
            <div className="template-switch-grid">
              {templateOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`template-switch-card ${option.id === template ? 'active' : ''}`}
                  onClick={() => handleTemplateSelect(option.id)}
                >
                  <span className="template-switch-name">
                    {getTemplateDisplayName(option, language)}
                  </span>
                  <span className="template-switch-meta">
                    {option.specs.bodyFont} · {option.specs.lineSpacing}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="sidebar-card">
            <div className="sidebar-card-header">
              <h3>{copy.scenarioTitle}</h3>
            </div>
            <p className="sidebar-note">{copy.scenarioHint}</p>

            <div className="scenario-grid">
              {scenarioPresets.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  className={`scenario-card ${preset.key === selectedScenario ? 'active' : ''}`}
                  onClick={() => setSelectedScenario(preset.key)}
                >
                  <span className="scenario-card-title">{preset.label}</span>
                  <span className="scenario-card-desc">{preset.description}</span>
                </button>
              ))}
            </div>

            {selectedPreset && (
              <div className="scenario-summary">
                <span className="scenario-summary-label">{copy.scenarioSummaryLabel}</span>
                <p>{selectedPreset.description}</p>
              </div>
            )}

            <div className="sidebar-action-stack">
              <button type="button" className="primary-cta-btn" onClick={handleInsertScenario}>
                {copy.scenarioAction}
              </button>
              <button
                type="button"
                className="secondary-cta-btn"
                onClick={handleGenerate}
                disabled={!text.trim() || isGenerating}
              >
                {isGenerating ? copy.exportLoadingLabel : copy.exportLabel}
              </button>
              <button
                type="button"
                className="ghost-cta-btn"
                onClick={() => setIsSettingsOpen(true)}
              >
                {copy.styleLabel}
              </button>
            </div>
          </div>
        </aside>
      </main>

      {error && <div className="error-msg">{error}</div>}

      <footer className="app-footer">
        <p className="footer-lead">{copy.footerLead}</p>
        <div className="footer-tags">
          {copy.footerPoints.map((point) => (
            <span key={point} className="footer-tag">
              {point}
            </span>
          ))}
          <a className="feedback-cta" href={FEEDBACK_URL}>
            {t.footer.feedback}
          </a>
        </div>
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
