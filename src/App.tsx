import { useCallback, useMemo, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { MarkdownEditor, type PasteSelection } from './components/Editor/MarkdownEditor';
import { LoadingOverlay } from './components/LoadingOverlay';
import { StyleDrawer } from './components/StyleSettings';
import { TemplateGallery } from './components/TemplateGallery';
import { TextProcessingMenu } from './components/TextProcessingMenu';
import { LanguageProvider } from './contexts/LanguageContext';
import { StyleProvider } from './contexts/StyleContext';
import { useStyles } from './contexts/useStyles';
import { useDocxGenerator, extractTitle, sanitizeFilename } from './hooks/useDocxGenerator';
import { useLanguage } from './hooks/useTranslation';
import { examples } from './i18n';
import type { Language } from './i18n';
import { detectInitialLanguage } from './lib/language-detection';
import { TEMPLATES } from './lib/styles/templates';
import { htmlToMarkdown } from './lib/html-to-markdown';
import { unescapeLatex } from './lib/math/latex-to-docx';
import type { TemplateName } from './types/styles';
import './styles/app.css';

type PasteMode = 'auto' | 'plain';
type NavLink = { href: string; label: string };

const PASTE_MODE_STORAGE_KEY = 'formaldoc.pasteMode';
const FEEDBACK_URL = 'mailto:support@formaldoc.app?subject=FormalDoc%20Feedback';
const GITHUB_URL = 'https://github.com/shrektan/formaldoc';
const CLI_COMMAND = 'npx formaldoc input.md -o out.docx';
const INSTALL_COMMAND = 'npm install -g formaldoc\nformaldoc input.md -o output.docx';
const TEMPLATE_GROUPS: Array<{
  category: 'chinese' | 'english';
  label: string;
  items: TemplateName[];
}> = [
  {
    category: 'chinese',
    label: '中文模板',
    items: ['cn-gov', 'cn-general', 'cn-academic', 'cn-report'],
  },
  {
    category: 'english',
    label: 'English Templates',
    items: ['en-standard', 'en-business', 'en-academic', 'en-legal'],
  },
];

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

function Icon({
  className,
  children,
  viewBox = '0 0 24 24',
}: {
  className?: string;
  children: React.ReactNode;
  viewBox?: string;
}) {
  return (
    <svg
      className={className}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      {children}
    </svg>
  );
}

function FileTextIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
      <path d="M9 9h1" />
    </Icon>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M5 12h14" />
      <path d="m13 5 7 7-7 7" />
    </Icon>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.5 2.5 4.5-5" />
    </Icon>
  );
}

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5a12 12 0 0 0-3.79 23.38c.6.1.82-.26.82-.58v-2.17c-3.34.73-4.04-1.42-4.04-1.42-.55-1.39-1.33-1.76-1.33-1.76-1.09-.75.08-.74.08-.74 1.2.09 1.84 1.24 1.84 1.24 1.08 1.84 2.84 1.31 3.53 1 .11-.78.42-1.31.77-1.61-2.67-.31-5.48-1.33-5.48-5.92 0-1.31.47-2.37 1.24-3.21-.12-.31-.54-1.57.12-3.27 0 0 1.01-.32 3.3 1.23A11.47 11.47 0 0 1 12 6.8c1.02 0 2.05.14 3 .41 2.3-1.55 3.31-1.23 3.31-1.23.66 1.7.24 2.96.12 3.27.77.84 1.24 1.9 1.24 3.21 0 4.6-2.82 5.6-5.5 5.91.43.38.82 1.12.82 2.26v3.35c0 .33.22.69.82.58A12 12 0 0 0 12 .5Z" />
    </svg>
  );
}

function ZapIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
    </Icon>
  );
}

function LayoutIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
      <path d="M9 9h12" />
    </Icon>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </Icon>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="m6 6 12 12" />
      <path d="M18 6 6 18" />
    </Icon>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </Icon>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="m9 6 6 6-6 6" />
    </Icon>
  );
}

function TerminalIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="m4 17 6-5-6-5" />
      <path d="M12 19h8" />
    </Icon>
  );
}

function BotIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <rect x="5" y="8" width="14" height="10" rx="3" />
      <path d="M12 4v4" />
      <path d="M8 12h.01" />
      <path d="M16 12h.01" />
      <path d="M9 16h6" />
    </Icon>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <rect x="9" y="9" width="10" height="10" rx="2" />
      <path d="M15 9V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
    </Icon>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="m5 13 4 4L19 7" />
    </Icon>
  );
}

function LayersIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 13 9 5 9-5" />
      <path d="m3 18 9 5 9-5" />
    </Icon>
  );
}

function ZoomInIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <circle cx="11" cy="11" r="6" />
      <path d="M21 21l-4.35-4.35" />
      <path d="M11 8v6" />
      <path d="M8 11h6" />
    </Icon>
  );
}

function LanguageSwitch() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="fd-language-switch">
      <button
        type="button"
        className={`fd-language-button ${language === 'cn' ? 'is-active' : ''}`}
        onClick={() => setLanguage('cn')}
      >
        中文
      </button>
      <span className="fd-language-divider">/</span>
      <button
        type="button"
        className={`fd-language-button ${language === 'en' ? 'is-active' : ''}`}
        onClick={() => setLanguage('en')}
      >
        EN
      </button>
    </div>
  );
}

function TemplatePreview({ templateId }: { templateId: TemplateName }) {
  const template = TEMPLATES[templateId];

  return (
    <div className={`fd-template-preview ${template.category}`}>
      <div className="fd-template-preview-page">
        <div className="fd-template-preview-title" />
        <div className="fd-template-preview-subtitle" />
        <div className="fd-template-preview-block">
          <span />
          <span />
          <span />
        </div>
        <div className="fd-template-preview-block short">
          <span />
          <span />
        </div>
      </div>
      <div className="fd-template-preview-meta">
        <span>{template.specs.bodyFont}</span>
        <span>{template.specs.lineSpacing}</span>
      </div>
    </div>
  );
}

function AppContent() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTemplateGalleryOpen, setIsTemplateGalleryOpen] = useState(false);
  const [showHeadingHint, setShowHeadingHint] = useState(false);
  const [showEscapedLatexHint, setShowEscapedLatexHint] = useState(false);
  const [showPasteUndoHint, setShowPasteUndoHint] = useState(false);
  const [customFilename, setCustomFilename] = useState('');
  const [pasteUndoState, setPasteUndoState] = useState<{
    prePasteContent: string;
    selection: PasteSelection;
    plainText: string;
  } | null>(null);
  const [pasteMode, setPasteMode] = useState<PasteMode>(loadPasteMode);
  const { styles, template, currentTemplate, setTemplate } = useStyles();
  const { language } = useLanguage();
  const { generate, isGenerating, error } = useDocxGenerator();
  const [text, setText] = useState(() => examples[language]);

  const navLinks = useMemo<NavLink[]>(
    () => [
      { href: '#features', label: language === 'cn' ? '功能特性' : 'Features' },
      { href: '#demo', label: language === 'cn' ? '在线体验' : 'Live Demo' },
      { href: '#ecosystem', label: language === 'cn' ? '开发者生态' : 'Ecosystem' },
    ],
    [language]
  );

  const groupedTemplates = useMemo(
    () =>
      TEMPLATE_GROUPS.map((group) => ({
        ...group,
        items: group.items.map((templateId) => TEMPLATES[templateId]),
      })),
    []
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

  const handleTextChange = (value: string) => {
    setText(value);
    setShowPasteUndoHint(false);
    setPasteUndoState(null);
    checkForMarkdown(value);
    if (detectEscapedLatex(value)) {
      setShowEscapedLatexHint(true);
    }
  };

  const handlePaste = (
    html: string,
    plainText: string,
    selection: PasteSelection
  ): string | null => {
    setShowHeadingHint(false);
    setShowPasteUndoHint(false);
    setPasteUndoState(null);

    if (pasteMode === 'plain' || !html || containsMarkdown(plainText)) {
      checkForMarkdown(plainText);
      if (detectEscapedLatex(plainText)) {
        setShowEscapedLatexHint(true);
      }
      return plainText;
    }

    const markdown = htmlToMarkdown(html);
    if (
      (markdown.trim() !== plainText.trim() || /<(table|ul|ol|pre|code|h[1-6])\b/i.test(html)) &&
      plainText.trim()
    ) {
      setPasteUndoState({
        prePasteContent: text,
        selection,
        plainText,
      });
      setShowPasteUndoHint(true);
      setTimeout(() => setShowPasteUndoHint(false), 8000);
    }

    checkForMarkdown(markdown);
    if (detectEscapedLatex(markdown)) {
      setShowEscapedLatexHint(true);
    }
    return markdown;
  };

  const handleUndoPaste = () => {
    if (!pasteUndoState) return;
    const restoredText =
      pasteUndoState.prePasteContent.substring(0, pasteUndoState.selection.start) +
      pasteUndoState.plainText +
      pasteUndoState.prePasteContent.substring(pasteUndoState.selection.end);
    setText(restoredText);
    setShowPasteUndoHint(false);
    setPasteUndoState(null);
    checkForMarkdown(restoredText);
  };

  const handleFixEscapedLatex = () => {
    const fixed = unescapeLatex(text);
    setText(fixed);
    setShowEscapedLatexHint(false);
    checkForMarkdown(fixed);
  };

  const handleCopy = useCallback(async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedCmd(value);
    window.setTimeout(() => setCopiedCmd(''), 2000);
  }, []);

  const handleGenerate = () => {
    const filename = customFilename.trim() || detectedFilename;
    generate(text, styles, currentTemplate.documentSettings, filename);
  };

  const handleLoadExample = () => {
    const example = examples[language];
    setText(example);
    setShowHeadingHint(false);
    setShowEscapedLatexHint(false);
    setShowPasteUndoHint(false);
    setPasteUndoState(null);
  };

  const handleClear = () => {
    setText('');
    setCustomFilename('');
    setShowHeadingHint(false);
    setShowEscapedLatexHint(false);
    setShowPasteUndoHint(false);
    setPasteUndoState(null);
  };

  const selectedTemplate = TEMPLATES[template];

  return (
    <div className="fd-page-shell">
      <div className="fd-page-noise" />

      <nav className="fd-navbar">
        <div className="fd-navbar-inner">
          <a className="fd-brand" href="#top" aria-label="FormalDoc Home">
            <span className="fd-brand-mark">
              <FileTextIcon className="fd-icon fd-icon-sm" />
            </span>
            <span className="fd-brand-text">FormalDoc</span>
          </a>

          <div className="fd-nav-links">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="fd-nav-link">
                {link.label}
              </a>
            ))}
          </div>

          <div className="fd-nav-actions">
            <LanguageSwitch />
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="fd-nav-github"
              aria-label="GitHub"
            >
              <GithubIcon className="fd-icon fd-icon-sm" />
              <span>GitHub</span>
            </a>
            <a href="#demo" className="fd-button fd-button-primary fd-button-sm">
              {language === 'cn' ? '免费使用' : 'Try It Free'}
            </a>
            <button
              type="button"
              className="fd-mobile-menu-button"
              onClick={() => setIsMobileMenuOpen((open) => !open)}
              aria-label="Open navigation"
            >
              {isMobileMenuOpen ? (
                <CloseIcon className="fd-icon fd-icon-md" />
              ) : (
                <MenuIcon className="fd-icon fd-icon-md" />
              )}
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="fd-mobile-menu">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="fd-mobile-link"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="fd-mobile-link">
              GitHub
            </a>
          </div>
        )}
      </nav>

      <main>
        <section className="fd-hero" id="top">
          <div className="fd-hero-background">
            <div className="fd-hero-orb orb-a" />
            <div className="fd-hero-orb orb-b" />
            <div className="fd-hero-grid" />
          </div>

          <div className="fd-hero-inner">
            <div className="fd-badge">
              <ZapIcon className="fd-icon fd-icon-sm" />
              <span>{language === 'cn' ? '全新版本现已开源' : 'Open-source release now live'}</span>
            </div>

            <h1 className="fd-hero-title">
              {language === 'cn' ? '将 AI 生成的文本，' : 'Turn AI-generated text into'}
              <br />
              <span>
                {language === 'cn'
                  ? '一键转化为完美的 Word 文档'
                  : 'polished Word documents in one click'}
              </span>
            </h1>

            <p className="fd-hero-copy">
              {language === 'cn'
                ? 'FormalDoc 将 ChatGPT、Claude 等生成的 Markdown 文本自动转换为排版精美的 .docx 文件，保留标题、列表、表格与层级结构，省掉繁琐的手工整理。'
                : 'FormalDoc converts Markdown from ChatGPT, Claude, and other AI tools into carefully formatted .docx files while preserving headings, lists, tables, and structure.'}
            </p>

            <div className="fd-hero-actions">
              <a href="#demo" className="fd-button fd-button-primary fd-button-lg">
                <span>{language === 'cn' ? '开始转换文档' : 'Start Converting'}</span>
                <ArrowRightIcon className="fd-icon fd-icon-sm" />
              </a>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
                className="fd-button fd-button-secondary fd-button-lg"
              >
                <GithubIcon className="fd-icon fd-icon-sm" />
                <span>{language === 'cn' ? '查看 GitHub' : 'View GitHub'}</span>
              </a>
            </div>

            <div className="fd-command-card">
              <div className="fd-command-content">
                <TerminalIcon className="fd-icon fd-icon-sm" />
                <code>{CLI_COMMAND}</code>
              </div>
              <button
                type="button"
                className="fd-copy-button"
                onClick={() => handleCopy(CLI_COMMAND)}
                aria-label="Copy command"
              >
                {copiedCmd === CLI_COMMAND ? (
                  <CheckIcon className="fd-icon fd-icon-xs is-success" />
                ) : (
                  <CopyIcon className="fd-icon fd-icon-xs" />
                )}
              </button>
            </div>

            <div className="fd-trust-row">
              <span>
                <CheckCircleIcon className="fd-icon fd-icon-xs" />
                {language === 'cn' ? '无需注册' : 'No signup'}
              </span>
              <span>
                <CheckCircleIcon className="fd-icon fd-icon-xs" />
                {language === 'cn' ? '免费开源' : 'Free and open source'}
              </span>
              <span>
                <CheckCircleIcon className="fd-icon fd-icon-xs" />
                {language === 'cn' ? '数据不上传' : 'Private by default'}
              </span>
            </div>
          </div>
        </section>

        <section className="fd-demo-section" id="demo">
          <div className="fd-section-heading dark">
            <p className="fd-section-kicker">{language === 'cn' ? '在线体验' : 'Live Demo'}</p>
            <h2>{language === 'cn' ? '无需下载，即刻体验' : 'Try it instantly in the browser'}</h2>
            <p>
              {language === 'cn'
                ? '将左侧 Markdown 替换成你的内容，选择模板后直接下载 Word。这里接入的是真实导出能力，不是静态样机。'
                : 'Replace the sample Markdown, choose a template, and download a real Word file directly from the browser.'}
            </p>
          </div>

          <div className="fd-demo-frame">
            <div className="fd-demo-pane fd-demo-editor">
              <div className="fd-pane-header">
                <div className="fd-pane-title">
                  <FileTextIcon className="fd-icon fd-icon-sm" />
                  <span>
                    {language === 'cn' ? '第一步：输入 Markdown 文本' : 'Step 1: Paste Markdown'}
                  </span>
                </div>
                <div className="fd-pane-actions">
                  <label className="fd-select-inline">
                    <span>{language === 'cn' ? '粘贴模式' : 'Paste mode'}</span>
                    <select
                      value={pasteMode}
                      onChange={(event) => {
                        const nextMode = event.target.value as PasteMode;
                        setPasteMode(nextMode);
                        savePasteMode(nextMode);
                      }}
                    >
                      <option value="auto">
                        {language === 'cn' ? '自动转 Markdown' : 'Auto convert'}
                      </option>
                      <option value="plain">{language === 'cn' ? '纯文本' : 'Plain text'}</option>
                    </select>
                  </label>
                  <TextProcessingMenu text={text} onTextChange={setText} disabled={!text.trim()} />
                  <button type="button" className="fd-chip-button" onClick={handleLoadExample}>
                    {language === 'cn' ? '示例' : 'Example'}
                  </button>
                  <button
                    type="button"
                    className="fd-chip-button muted"
                    onClick={handleClear}
                    disabled={!text.trim()}
                  >
                    {language === 'cn' ? '清空' : 'Clear'}
                  </button>
                </div>
              </div>

              <div className="fd-editor-shell">
                <MarkdownEditor
                  value={text}
                  onChange={handleTextChange}
                  onPaste={handlePaste}
                  placeholder={
                    language === 'cn'
                      ? '在这里粘贴 Markdown 内容，或直接从 AI 聊天窗口复制富文本。'
                      : 'Paste your Markdown here, or copy rich text directly from an AI chat window.'
                  }
                />
              </div>

              {(showHeadingHint || showEscapedLatexHint || showPasteUndoHint || error) && (
                <div className="fd-editor-notices">
                  {showHeadingHint && (
                    <div className="fd-notice">
                      <span>
                        {language === 'cn'
                          ? '看起来你的内容还没有使用 Markdown 标题语法，导出后的层级结构可能不够清晰。'
                          : 'Your content does not appear to use Markdown headings, so the exported structure may be flatter than expected.'}
                      </span>
                      <button type="button" onClick={() => setShowHeadingHint(false)}>
                        {language === 'cn' ? '知道了' : 'Dismiss'}
                      </button>
                    </div>
                  )}
                  {showEscapedLatexHint && (
                    <div className="fd-notice">
                      <span>
                        {language === 'cn'
                          ? '检测到被转义的 LaTeX 公式，修复后导出能得到更正确的数学排版。'
                          : 'Escaped LaTeX detected. Fix it before exporting for better math formatting.'}
                      </span>
                      <button type="button" onClick={handleFixEscapedLatex}>
                        {language === 'cn' ? '一键修复' : 'Fix now'}
                      </button>
                    </div>
                  )}
                  {showPasteUndoHint && (
                    <div className="fd-notice">
                      <span>
                        {language === 'cn'
                          ? '已将富文本粘贴自动转换为 Markdown。如需保留原始纯文本，可撤销本次转换。'
                          : 'Rich text was converted to Markdown on paste. You can undo and keep the original plain text.'}
                      </span>
                      <button type="button" onClick={handleUndoPaste}>
                        {language === 'cn' ? '撤销转换' : 'Undo'}
                      </button>
                    </div>
                  )}
                  {error && (
                    <div className="fd-notice is-error">
                      <span>{error}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="fd-demo-pane fd-demo-sidebar">
              <div className="fd-pane-header">
                <div className="fd-pane-title">
                  <LayoutIcon className="fd-icon fd-icon-sm" />
                  <span>
                    {language === 'cn'
                      ? '第二步：选择排版模板并导出'
                      : 'Step 2: Choose a template and export'}
                  </span>
                </div>
                <div className="fd-pane-actions">
                  <button
                    type="button"
                    className="fd-chip-button"
                    onClick={() => setIsSettingsOpen(true)}
                  >
                    {language === 'cn' ? '自定义样式' : 'Customize'}
                  </button>
                  <button
                    type="button"
                    className="fd-chip-button"
                    onClick={() => setIsTemplateGalleryOpen(true)}
                  >
                    {language === 'cn' ? '更多模板' : 'More templates'}
                  </button>
                </div>
              </div>

              <div className="fd-template-list">
                {groupedTemplates.map((group) => (
                  <section key={group.category} className="fd-template-group">
                    <h3>{group.label}</h3>
                    <div className="fd-template-cards">
                      {group.items.map((templateItem) => (
                        <button
                          type="button"
                          key={templateItem.id}
                          className={`fd-template-card ${template === templateItem.id ? 'is-selected' : ''}`}
                          onClick={() => setTemplate(templateItem.id)}
                        >
                          <div className="fd-template-thumb">
                            <TemplatePreview templateId={templateItem.id} />
                            <span className="fd-template-zoom">
                              <ZoomInIcon className="fd-icon fd-icon-xs" />
                              {language === 'cn' ? '放大' : 'Preview'}
                            </span>
                          </div>

                          <div className="fd-template-card-body">
                            <div className="fd-template-card-header">
                              <div>
                                <h4>
                                  {language === 'cn' ? templateItem.name : templateItem.nameEn}
                                </h4>
                                <p>
                                  {language === 'cn'
                                    ? templateItem.description
                                    : templateItem.descriptionEn}
                                </p>
                              </div>
                              {template === templateItem.id && (
                                <CheckCircleIcon className="fd-icon fd-icon-sm is-selected" />
                              )}
                            </div>

                            <dl className="fd-template-specs">
                              <div>
                                <dt>{language === 'cn' ? '正文' : 'Body'}</dt>
                                <dd>{templateItem.specs.bodyFont}</dd>
                              </div>
                              <div>
                                <dt>{language === 'cn' ? '标题' : 'Heading'}</dt>
                                <dd>{templateItem.specs.headingFont}</dd>
                              </div>
                              <div>
                                <dt>{language === 'cn' ? '行距' : 'Spacing'}</dt>
                                <dd>{templateItem.specs.lineSpacing}</dd>
                              </div>
                              <div>
                                <dt>{language === 'cn' ? '缩进' : 'Indent'}</dt>
                                <dd>{templateItem.specs.indent}</dd>
                              </div>
                            </dl>
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>

              <div className="fd-export-panel">
                <div className="fd-export-summary">
                  <div>
                    <p>{language === 'cn' ? '当前模板' : 'Current template'}</p>
                    <strong>
                      {language === 'cn' ? selectedTemplate.name : selectedTemplate.nameEn}
                    </strong>
                  </div>
                  <span>{language === 'cn' ? '真实导出' : 'Real export'}</span>
                </div>

                <label className="fd-filename-field" htmlFor="filename">
                  <span>{language === 'cn' ? '文件名' : 'Filename'}</span>
                  <div className="fd-filename-input">
                    <input
                      id="filename"
                      value={customFilename || detectedFilename}
                      onChange={(event) => setCustomFilename(event.target.value)}
                      placeholder={
                        language === 'cn' ? '自动读取标题作为文件名' : 'Use title automatically'
                      }
                    />
                    <span>.docx</span>
                  </div>
                </label>

                <button
                  type="button"
                  className="fd-button fd-button-primary fd-button-xl fd-download-button"
                  onClick={handleGenerate}
                  disabled={!text.trim() || isGenerating}
                >
                  <DownloadIcon className="fd-icon fd-icon-sm" />
                  <span>
                    {isGenerating
                      ? language === 'cn'
                        ? '正在生成文档...'
                        : 'Generating document...'
                      : language === 'cn'
                        ? '下载 Word 文档 (.docx)'
                        : 'Download Word (.docx)'}
                  </span>
                </button>

                <p className="fd-export-note">
                  {language === 'cn'
                    ? '无需登录 · 无需安装 · 支持离线处理 · 数据不上传'
                    : 'No login required · No install needed · Works locally · Your data stays with you'}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="fd-features" id="features">
          <div className="fd-section-heading">
            <p className="fd-section-kicker">{language === 'cn' ? '核心价值' : 'Why FormalDoc'}</p>
            <h2>
              {language === 'cn'
                ? '为什么 AI 时代更需要 FormalDoc？'
                : 'Why FormalDoc matters even more in the AI era'}
            </h2>
            <p>
              {language === 'cn'
                ? 'AI 很擅长写内容，但不擅长交付最终的正式文档。FormalDoc 把“生成文本”与“正式交付”之间最费时的一段补上。'
                : 'AI writes quickly, but formal delivery still breaks down at the last mile. FormalDoc closes that gap between generated text and final polished documents.'}
            </p>
          </div>

          <div className="fd-feature-grid">
            <article className="fd-feature-card">
              <div className="fd-feature-icon">
                <LayersIcon className="fd-icon fd-icon-md" />
              </div>
              <h3>{language === 'cn' ? '原生样式完美映射' : 'Native Word style mapping'}</h3>
              <p>
                {language === 'cn'
                  ? '不是简单地加粗、改字号，而是把标题、正文、引用、表格等映射到 Word 原生样式系统。后续全局改版时，真正做到牵一发而动全身。'
                  : 'Instead of faking styles with manual formatting, FormalDoc maps structure into native Word styles so downstream editing remains clean and scalable.'}
              </p>
            </article>

            <article className="fd-feature-card">
              <div className="fd-feature-icon accent-warm">
                <LayoutIcon className="fd-icon fd-icon-md" />
              </div>
              <h3>{language === 'cn' ? '内置公文与专业模板' : 'Built-in formal templates'}</h3>
              <p>
                {language === 'cn'
                  ? '从 GB/T 9704 公文，到通用报告、学术论文、英文正式文件，内置模板覆盖常见交付场景。选中即用，不必再维护一堆混乱的 Word 母版。'
                  : 'Government documents, reports, academic papers, and English business layouts are built in so teams can ship polished documents without wrangling fragile Word templates.'}
              </p>
            </article>

            <article className="fd-feature-card">
              <div className="fd-feature-icon accent-cool">
                <GithubIcon className="fd-icon fd-icon-md" />
              </div>
              <h3>{language === 'cn' ? '开源，可嵌入工作流' : 'Open source and workflow-ready'}</h3>
              <p>
                {language === 'cn'
                  ? '浏览器可用，CLI 可用，也能接进企业内部流水线。你可以继续沿用默认模板，也可以接入自己的 `.docx` 参考模板与风格规范。'
                  : 'Use it in the browser, in the CLI, or embedded inside your own automation. Start with built-ins or wire in your own `.docx` reference templates and house style.'}
              </p>
            </article>
          </div>
        </section>

        <section className="fd-ecosystem" id="ecosystem">
          <div className="fd-section-heading dark">
            <p className="fd-section-kicker">
              {language === 'cn' ? '开发者生态' : 'Developer Ecosystem'}
            </p>
            <h2>
              {language === 'cn'
                ? '不仅是网页，更是生产力基建'
                : 'More than a website: a productivity layer'}
            </h2>
            <p>
              {language === 'cn'
                ? '除了网页端，FormalDoc 也面向开发者、自动化流程以及 AI coding agent 工作流。'
                : 'FormalDoc is designed for browser users, developer tooling, automation pipelines, and AI coding agent workflows.'}
            </p>
          </div>

          <div className="fd-ecosystem-grid">
            <article className="fd-ecosystem-card">
              <div className="fd-feature-icon subtle">
                <TerminalIcon className="fd-icon fd-icon-md" />
              </div>
              <h3>CLI</h3>
              <p>
                {language === 'cn'
                  ? '直接把 Markdown 扔进终端，快速生成可交付的 Word 文件，适合脚本、批处理和自动化流水线。'
                  : 'Pipe Markdown through the terminal and generate deliverable Word files inside scripts, batch jobs, and CI automation.'}
              </p>
              <div className="fd-code-card">
                <button
                  type="button"
                  className="fd-copy-button"
                  onClick={() => handleCopy(INSTALL_COMMAND)}
                  aria-label="Copy install commands"
                >
                  {copiedCmd === INSTALL_COMMAND ? (
                    <CheckIcon className="fd-icon fd-icon-xs is-success" />
                  ) : (
                    <CopyIcon className="fd-icon fd-icon-xs" />
                  )}
                </button>
                <pre>
                  <code>{INSTALL_COMMAND}</code>
                </pre>
              </div>
            </article>

            <article className="fd-ecosystem-card">
              <div className="fd-feature-icon accent-violet">
                <BotIcon className="fd-icon fd-icon-md" />
              </div>
              <h3>{language === 'cn' ? 'AI 代理友好' : 'AI-agent friendly'}</h3>
              <p>
                {language === 'cn'
                  ? '支持 Claude Code、Cursor 等工具中的自然语言调用。你可以把它当作团队文档交付链路里的一块稳定积木。'
                  : 'Use it naturally from Claude Code, Cursor, and similar tools. It fits cleanly into agent-driven authoring and delivery workflows.'}
              </p>
              <div className="fd-agent-card">
                <div className="fd-agent-header">
                  <span>AI</span>
                  <strong>Claude Code</strong>
                </div>
                <p>
                  {language === 'cn'
                    ? '“请把刚写好的项目说明 `readme.md` 转成一份正式的 Word 文档。”'
                    : '"Convert the `readme.md` I just drafted into a polished Word document."'}
                </p>
                <div className="fd-agent-log">
                  <TerminalIcon className="fd-icon fd-icon-xs" />
                  <div>
                    <span>Running: formaldoc readme.md</span>
                    <strong>
                      {language === 'cn'
                        ? '已完成，输出为 readme.docx'
                        : 'Complete. Saved as readme.docx'}
                    </strong>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="fd-cta">
          <div className="fd-cta-panel">
            <div>
              <p className="fd-section-kicker">{language === 'cn' ? '立即开始' : 'Start now'}</p>
              <h2>
                {language === 'cn'
                  ? '准备好把 AI 文本交付成正式文档了吗？'
                  : 'Ready to turn AI text into formal deliverables?'}
              </h2>
              <p>
                {language === 'cn'
                  ? '把最后那段最耗时的 Word 排版工作交给 FormalDoc，你只需要专注写内容。'
                  : 'Let FormalDoc handle the last-mile document formatting so you can stay focused on content.'}
              </p>
            </div>
            <div className="fd-cta-actions">
              <a href="#demo" className="fd-button fd-button-light fd-button-lg">
                <span>{language === 'cn' ? '立即使用 FormalDoc' : 'Use FormalDoc now'}</span>
                <ChevronRightIcon className="fd-icon fd-icon-sm" />
              </a>
              <a href={FEEDBACK_URL} className="fd-text-link">
                {language === 'cn' ? '问题反馈或商务联系' : 'Feedback or contact'}
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="fd-footer">
        <a className="fd-brand" href="#top" aria-label="FormalDoc Home">
          <span className="fd-brand-mark">
            <FileTextIcon className="fd-icon fd-icon-sm" />
          </span>
          <span className="fd-brand-text">FormalDoc</span>
        </a>

        <p>
          © {new Date().getFullYear()} FormalDoc.{' '}
          <a href="https://github.com/shrektan" target="_blank" rel="noreferrer">
            shrektan
          </a>{' '}
          {language === 'cn' ? '开源呈现。' : 'builds it in the open.'}
        </p>

        <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="fd-footer-github">
          <GithubIcon className="fd-icon fd-icon-sm" />
        </a>
      </footer>

      <StyleDrawer isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <TemplateGallery
        isOpen={isTemplateGalleryOpen}
        currentTemplate={template}
        onSelect={setTemplate}
        onClose={() => setIsTemplateGalleryOpen(false)}
      />
      <LoadingOverlay
        isVisible={isGenerating}
        message={language === 'cn' ? '正在生成 Word 文档...' : 'Generating Word document...'}
      />
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
        setTemplate(lang === 'cn' ? 'cn-general' : 'en-standard');
      }
    },
    [currentTemplate.category, onLanguageChange, setTemplate]
  );

  return (
    <LanguageProvider initialLanguage={language} onLanguageChange={handleLanguageChange}>
      <AppContent />
      <Analytics />
    </LanguageProvider>
  );
}

export default function App() {
  const [language, setLanguage] = useState<Language>(() => detectInitialLanguage());

  return (
    <StyleProvider key={language} language={language}>
      <AppWithLanguage language={language} onLanguageChange={setLanguage} />
    </StyleProvider>
  );
}
