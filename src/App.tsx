import { type ReactNode, useCallback, useMemo, useRef, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { LoadingOverlay } from './components/LoadingOverlay';
import { LanguageProvider } from './contexts/LanguageContext';
import { StyleProvider } from './contexts/StyleContext';
import { useStyles } from './contexts/useStyles';
import { useDocxGenerator, extractTitle, sanitizeFilename } from './hooks/useDocxGenerator';
import { useLanguage } from './hooks/useTranslation';
import { examples } from './i18n';
import type { Language } from './i18n';
import { htmlToMarkdown } from './lib/html-to-markdown';
import { detectInitialLanguage } from './lib/language-detection';
import { TEMPLATES } from './lib/styles/templates';
import { unescapeLatex } from './lib/math/latex-to-docx';
import './styles/app.css';

type PasteMode = 'auto' | 'plain';

const PASTE_MODE_STORAGE_KEY = 'formaldoc.pasteMode';
const GITHUB_URL = 'https://github.com/shrektan/formaldoc';
const CLI_COMMAND = 'npx formaldoc input.md -o out.docx';
const INSTALL_COMMAND = 'npm install -g formaldoc\nformaldoc input.md -o output.docx';

const isPasteMode = (value: string): value is PasteMode => value === 'auto' || value === 'plain';

const loadPasteMode = (): PasteMode => {
  if (typeof window === 'undefined') return 'auto';
  try {
    const stored = window.localStorage.getItem(PASTE_MODE_STORAGE_KEY);
    if (stored && isPasteMode(stored)) {
      return stored;
    }
  } catch {
    // Ignore storage errors.
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
  viewBox = '0 0 24 24',
  children,
}: {
  className?: string;
  viewBox?: string;
  children: ReactNode;
}) {
  return (
    <svg
      className={className}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
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
    <div className="fd-lang-switch">
      <button
        type="button"
        className={language === 'cn' ? 'active' : ''}
        onClick={() => setLanguage('cn')}
      >
        中文
      </button>
      <button
        type="button"
        className={language === 'en' ? 'active' : ''}
        onClick={() => setLanguage('en')}
      >
        EN
      </button>
    </div>
  );
}

function AppContent() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState('');
  const [customFilename, setCustomFilename] = useState('');
  const [showHeadingHint, setShowHeadingHint] = useState(false);
  const [showEscapedLatexHint, setShowEscapedLatexHint] = useState(false);
  const [showPasteUndoHint, setShowPasteUndoHint] = useState(false);
  const [pasteMode, setPasteMode] = useState<PasteMode>(loadPasteMode);
  const [pasteUndoState, setPasteUndoState] = useState<{
    prePasteContent: string;
    selectionStart: number;
    selectionEnd: number;
    plainText: string;
  } | null>(null);
  const { language } = useLanguage();
  const { styles, template, currentTemplate, setTemplate } = useStyles();
  const { generate, isGenerating, error } = useDocxGenerator();
  const [text, setText] = useState(() => examples[language]);

  const pageCopy = useMemo(
    () =>
      language === 'cn'
        ? {
            navFeatures: '功能特性',
            navDemo: '在线体验',
            navGithub: 'GitHub',
            navUse: '免费使用',
            heroBadge: '全新版本现已开源',
            heroTitleTop: '将 AI 生成的文本，',
            heroTitleAccent: '一键转化为完美的 Word 文档',
            heroBody:
              'FormalDoc 帮您把 ChatGPT、Claude 等生成的 Markdown 文本，自动转换为排版精美的 .docx 文件。保留标题、列表、表格与引用结构，告别繁琐的手动调整。',
            heroPrimary: '开始转换文档',
            heroSecondary: '查看 GitHub',
            trustA: '无需注册',
            trustB: '免费开源',
            trustC: '隐私安全',
            demoTitle: '无需下载，即刻体验',
            demoBody: '将左侧 Markdown 替换成您的内容，选择右侧模板后一键生成 Word。',
            inputTitle: '第一步：输入 Markdown 文本',
            clear: '清空',
            example: '示例',
            pasteMode: '粘贴模式',
            pasteAuto: '自动转 Markdown',
            pastePlain: '纯文本',
            inputPlaceholder: '在此粘贴 Markdown 内容...',
            exportTitle: '第二步：选择排版模板并导出',
            download: '下载 Word 文档 (.docx)',
            downloading: '正在生成 Word 文档...',
            exportFoot: '无需登录 · 无需安装 · 可离线使用 · 数据不上传',
            featuresTitle: '为什么我们需要 FormalDoc？',
            featuresBody:
              'AI 模型输出的内容通常停留在 Markdown。FormalDoc 把它直接变成可以正式提交、流转和归档的 Word 文档。',
            ecoBadge: 'NPM & CLI 支持',
            ecoTitle: '不仅是网页，更是强大的生产力基建',
            ecoBody:
              'FormalDoc 已发布到 npm，既适合开发者集成到脚本与流水线，也适合在 Claude Code 这类 AI 工具里自然调用。',
            cliTitle: 'CLI 命令行工具',
            cliBody: '在终端中直接将 Markdown 转换为 Word，无需打开浏览器，适合自动化工作流。',
            aiTitle: 'AI 代理无缝集成',
            aiBody:
              '您可以在 Claude Code、Cursor 等 AI 编程工具中自然语言调用 FormalDoc，把最后一步文档交付自动化。',
            ctaTitle: '准备好提升您的文档处理效率了吗？',
            ctaBody: '完全免费，无需注册，现在就体验将文本转化为专业排版的过程。',
            ctaAction: '立即使用 FormalDoc',
            footerText: '开源呈现。',
            noticeMarkdown: '看起来这段内容还没用 Markdown 标题语法，导出后的层级可能不够清晰。',
            noticeLatex: '检测到被转义的 LaTeX 公式，建议先修复再导出。',
            noticeUndo: '刚刚的富文本粘贴已自动转成 Markdown，如需恢复原始纯文本可以撤销。',
            dismiss: '知道了',
            fixLatex: '一键修复',
            undo: '撤销',
            templatesChinese: '中文',
            templatesEnglish: 'ENGLISH',
            fileName: '文件名',
            fileNamePlaceholder: '自动读取标题作为文件名',
            currentTemplate: '当前模板',
          }
        : {
            navFeatures: 'Features',
            navDemo: 'Live Demo',
            navGithub: 'GitHub',
            navUse: 'Try Free',
            heroBadge: 'Open source release now live',
            heroTitleTop: 'Turn AI generated text',
            heroTitleAccent: 'into polished Word documents in one click',
            heroBody:
              'FormalDoc converts Markdown from ChatGPT, Claude, and other AI tools into carefully formatted .docx files while preserving headings, lists, tables, and quotes.',
            heroPrimary: 'Start Converting',
            heroSecondary: 'View GitHub',
            trustA: 'No signup',
            trustB: 'Free and open source',
            trustC: 'Private by default',
            demoTitle: 'Try it instantly in the browser',
            demoBody:
              'Replace the sample Markdown on the left, choose a template, and export a real Word file.',
            inputTitle: 'Step 1: Paste Markdown',
            clear: 'Clear',
            example: 'Example',
            pasteMode: 'Paste mode',
            pasteAuto: 'Auto convert',
            pastePlain: 'Plain text',
            inputPlaceholder: 'Paste Markdown here...',
            exportTitle: 'Step 2: Choose a template and export',
            download: 'Download Word (.docx)',
            downloading: 'Generating Word document...',
            exportFoot: 'No login · No install · Works offline · Data stays local',
            featuresTitle: 'Why FormalDoc?',
            featuresBody:
              'AI tools are excellent at drafting content. FormalDoc handles the last mile of converting it into a professional Word deliverable.',
            ecoBadge: 'NPM & CLI',
            ecoTitle: 'More than a website, a productivity building block',
            ecoBody:
              'FormalDoc ships on npm and works well in scripts, automation, and AI coding workflows.',
            cliTitle: 'CLI Command Line Tool',
            cliBody:
              'Convert Markdown to Word directly from the terminal and plug it into automated workflows.',
            aiTitle: 'Works naturally with AI agents',
            aiBody:
              'Call FormalDoc from Claude Code, Cursor, and other AI coding tools using natural language.',
            ctaTitle: 'Ready to upgrade your document workflow?',
            ctaBody:
              'No signup required. Start converting text into polished Word deliverables now.',
            ctaAction: 'Use FormalDoc now',
            footerText: 'built in the open.',
            noticeMarkdown:
              'This text does not appear to use Markdown headings, so the exported structure may be flatter.',
            noticeLatex: 'Escaped LaTeX detected. Fix it first for cleaner math rendering.',
            noticeUndo:
              'Rich text was converted to Markdown on paste. Undo if you want the original plain text.',
            dismiss: 'Dismiss',
            fixLatex: 'Fix now',
            undo: 'Undo',
            templatesChinese: '中文',
            templatesEnglish: 'ENGLISH',
            fileName: 'Filename',
            fileNamePlaceholder: 'Use the title automatically',
            currentTemplate: 'Current template',
          },
    [language]
  );

  const templateGroups = useMemo(
    () => [
      {
        key: pageCopy.templatesChinese,
        ids: ['cn-gov', 'cn-general', 'cn-academic', 'cn-report'] as const,
      },
      {
        key: pageCopy.templatesEnglish,
        ids: ['en-standard', 'en-business', 'en-academic', 'en-legal'] as const,
      },
    ],
    [pageCopy.templatesChinese, pageCopy.templatesEnglish]
  );

  const detectedFilename = useMemo(() => {
    const title = extractTitle(text);
    return title ? sanitizeFilename(title) : '';
  }, [text]);

  const containsMarkdown = useCallback((content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return false;
    const patterns = [
      /^#{1,6}\s+.+$/m,
      /^\s*[-*+]\s+.+$/m,
      /^\s*\d+\.\s+.+$/m,
      /\*\*.+?\*\*/m,
      /\[.+?\]\(.+?\)/m,
      /^\s*>\s+.+$/m,
      /^```/m,
      /^\|.+\|$/m,
    ];
    return patterns.some((pattern) => pattern.test(trimmed));
  }, []);

  const detectEscapedLatex = useCallback((content: string) => {
    const escapedPattern =
      /\$[^$]*\\\\(frac|left|right|sum|int|prod|lim|sqrt|alpha|beta|gamma|delta|times|cdot|leq|geq|neq)[^$]*\$/;
    return escapedPattern.test(content);
  }, []);

  const checkForMarkdown = useCallback(
    (content: string) => {
      const trimmed = content.trim();
      if (trimmed.length < 50) {
        setShowHeadingHint(false);
        return;
      }
      setShowHeadingHint(!containsMarkdown(trimmed));
    },
    [containsMarkdown]
  );

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

  const handleTextChange = (value: string) => {
    setText(value);
    setShowPasteUndoHint(false);
    setPasteUndoState(null);
    checkForMarkdown(value);
    if (detectEscapedLatex(value)) {
      setShowEscapedLatexHint(true);
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const html = event.clipboardData.getData('text/html');
    const plainText = event.clipboardData.getData('text/plain');
    const textarea = textareaRef.current;

    if (!textarea) return;

    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;

    setShowHeadingHint(false);
    setShowPasteUndoHint(false);
    setPasteUndoState(null);

    if (pasteMode === 'plain' || !html || containsMarkdown(plainText)) {
      checkForMarkdown(plainText);
      if (detectEscapedLatex(plainText)) {
        setShowEscapedLatexHint(true);
      }
      return;
    }

    const markdown = htmlToMarkdown(html);
    event.preventDefault();

    const nextText = text.slice(0, selectionStart) + markdown + text.slice(selectionEnd);
    setText(nextText);
    checkForMarkdown(markdown);

    if (
      plainText.trim() &&
      (markdown.trim() !== plainText.trim() || /<(table|ul|ol|pre|code|h[1-6])\b/i.test(html))
    ) {
      setPasteUndoState({
        prePasteContent: text,
        selectionStart,
        selectionEnd,
        plainText,
      });
      setShowPasteUndoHint(true);
      window.setTimeout(() => setShowPasteUndoHint(false), 8000);
    }

    if (detectEscapedLatex(markdown)) {
      setShowEscapedLatexHint(true);
    }

    requestAnimationFrame(() => {
      const nextCursor = selectionStart + markdown.length;
      textarea.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const handleUndoPaste = () => {
    if (!pasteUndoState) return;
    const restoredText =
      pasteUndoState.prePasteContent.slice(0, pasteUndoState.selectionStart) +
      pasteUndoState.plainText +
      pasteUndoState.prePasteContent.slice(pasteUndoState.selectionEnd);
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

  const handleGenerate = () => {
    const filename = customFilename.trim() || detectedFilename;
    generate(text, styles, currentTemplate.documentSettings, filename);
  };

  const selectedTemplateItem = TEMPLATES[template];

  return (
    <div className="landing-page">
      <nav className="top-nav">
        <div className="nav-inner">
          <a className="brand" href="#top" aria-label="FormalDoc">
            <span className="brand-icon">
              <FileTextIcon className="icon icon-sm" />
            </span>
            <span className="brand-text">FormalDoc</span>
          </a>

          <div className="nav-desktop">
            <a href="#features">{pageCopy.navFeatures}</a>
            <a href="#demo">{pageCopy.navDemo}</a>
            <LanguageSwitch />
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="nav-github">
              <GithubIcon className="icon icon-xs fill-icon" />
              {pageCopy.navGithub}
            </a>
            <a href="#demo" className="nav-cta">
              {pageCopy.navUse}
            </a>
          </div>

          <button
            type="button"
            className="mobile-menu-button"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            aria-label="Toggle navigation"
          >
            {isMobileMenuOpen ? (
              <CloseIcon className="icon icon-sm" />
            ) : (
              <MenuIcon className="icon icon-sm" />
            )}
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="nav-mobile">
            <a href="#features" onClick={() => setIsMobileMenuOpen(false)}>
              {pageCopy.navFeatures}
            </a>
            <a href="#demo" onClick={() => setIsMobileMenuOpen(false)}>
              {pageCopy.navDemo}
            </a>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer">
              {pageCopy.navGithub}
            </a>
            <LanguageSwitch />
          </div>
        )}
      </nav>

      <main>
        <section className="hero-section" id="top">
          <div className="hero-radial" />
          <div className="page-container hero-content">
            <div className="hero-badge">
              <ZapIcon className="icon icon-xs" />
              <span>{pageCopy.heroBadge}</span>
            </div>

            <h1 className="hero-title">
              {pageCopy.heroTitleTop}
              <br />
              <span>{pageCopy.heroTitleAccent}</span>
            </h1>

            <p className="hero-description">{pageCopy.heroBody}</p>

            <div className="hero-actions">
              <a href="#demo" className="button button-primary">
                <span>{pageCopy.heroPrimary}</span>
                <ArrowRightIcon className="icon icon-sm" />
              </a>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
                className="button button-secondary"
              >
                <GithubIcon className="icon icon-sm fill-icon" />
                <span>{pageCopy.heroSecondary}</span>
              </a>
            </div>

            <div className="command-bar">
              <div className="command-text">
                <TerminalIcon className="icon icon-sm" />
                <code>{CLI_COMMAND}</code>
              </div>
              <button type="button" className="copy-button" onClick={() => handleCopy(CLI_COMMAND)}>
                {copiedCmd === CLI_COMMAND ? (
                  <CheckIcon className="icon icon-xs success" />
                ) : (
                  <CopyIcon className="icon icon-xs" />
                )}
              </button>
            </div>

            <div className="trust-row">
              <span>
                <CheckCircleIcon className="icon icon-xs success" />
                {pageCopy.trustA}
              </span>
              <span>
                <CheckCircleIcon className="icon icon-xs success" />
                {pageCopy.trustB}
              </span>
              <span>
                <CheckCircleIcon className="icon icon-xs success" />
                {pageCopy.trustC}
              </span>
            </div>
          </div>
        </section>

        <section id="demo" className="demo-section">
          <div className="page-container">
            <div className="section-heading dark">
              <h2>{pageCopy.demoTitle}</h2>
              <p>{pageCopy.demoBody}</p>
            </div>

            <div className="demo-shell">
              <div className="demo-input-pane">
                <div className="pane-header">
                  <div className="pane-title">
                    <FileTextIcon className="icon icon-sm blue" />
                    {pageCopy.inputTitle}
                  </div>
                  <div className="pane-tools">
                    <label className="paste-mode">
                      <span>{pageCopy.pasteMode}</span>
                      <select
                        value={pasteMode}
                        onChange={(event) => {
                          const nextMode = event.target.value as PasteMode;
                          setPasteMode(nextMode);
                          savePasteMode(nextMode);
                        }}
                      >
                        <option value="auto">{pageCopy.pasteAuto}</option>
                        <option value="plain">{pageCopy.pastePlain}</option>
                      </select>
                    </label>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setText(examples[language])}
                    >
                      {pageCopy.example}
                    </button>
                    <button
                      type="button"
                      className="text-button clear"
                      onClick={() => {
                        setText('');
                        setCustomFilename('');
                        setShowHeadingHint(false);
                        setShowEscapedLatexHint(false);
                        setShowPasteUndoHint(false);
                        setPasteUndoState(null);
                      }}
                    >
                      {pageCopy.clear}
                    </button>
                  </div>
                </div>

                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(event) => handleTextChange(event.target.value)}
                  onPaste={handlePaste}
                  className="demo-textarea"
                  placeholder={pageCopy.inputPlaceholder}
                />

                {(showHeadingHint || showEscapedLatexHint || showPasteUndoHint || error) && (
                  <div className="notice-stack">
                    {showHeadingHint && (
                      <div className="notice">
                        <span>{pageCopy.noticeMarkdown}</span>
                        <button type="button" onClick={() => setShowHeadingHint(false)}>
                          {pageCopy.dismiss}
                        </button>
                      </div>
                    )}
                    {showEscapedLatexHint && (
                      <div className="notice">
                        <span>{pageCopy.noticeLatex}</span>
                        <button type="button" onClick={handleFixEscapedLatex}>
                          {pageCopy.fixLatex}
                        </button>
                      </div>
                    )}
                    {showPasteUndoHint && (
                      <div className="notice">
                        <span>{pageCopy.noticeUndo}</span>
                        <button type="button" onClick={handleUndoPaste}>
                          {pageCopy.undo}
                        </button>
                      </div>
                    )}
                    {error && <div className="notice error">{error}</div>}
                  </div>
                )}
              </div>

              <div className="demo-output-pane">
                <div className="pane-header">
                  <div className="pane-title">
                    <LayoutIcon className="icon icon-sm indigo" />
                    {pageCopy.exportTitle}
                  </div>
                </div>

                <div className="template-scroll">
                  {templateGroups.map((group) => (
                    <div key={group.key} className="template-group">
                      <h3>{group.key}</h3>
                      <div className="template-list">
                        {group.ids.map((id) => {
                          const templateItem = TEMPLATES[id];
                          const isSelected = template === id;

                          return (
                            <button
                              type="button"
                              key={id}
                              className={`template-card ${isSelected ? 'selected' : ''}`}
                              onClick={() => setTemplate(id)}
                            >
                              <div className="template-thumbnail">
                                <div className="template-paper">
                                  <div className="template-line title" />
                                  <div className="template-line short" />
                                  <div className="template-line" />
                                  <div className="template-line" />
                                  <div className="template-line medium" />
                                </div>
                                <div className="template-hover">
                                  <span>
                                    <ZoomInIcon className="icon icon-xs" />
                                    {language === 'cn' ? '放大' : 'Preview'}
                                  </span>
                                </div>
                              </div>

                              <div className="template-body">
                                <div className="template-head">
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
                                  {isSelected && (
                                    <CheckCircleIcon className="icon icon-sm selected-icon" />
                                  )}
                                </div>

                                <div className="template-specs">
                                  <div>
                                    <span>{language === 'cn' ? '正文:' : 'Body:'}</span>
                                    <strong>{templateItem.specs.bodyFont}</strong>
                                  </div>
                                  <div>
                                    <span>{language === 'cn' ? '标题:' : 'Heading:'}</span>
                                    <strong>{templateItem.specs.headingFont}</strong>
                                  </div>
                                  <div>
                                    <span>{language === 'cn' ? '行距:' : 'Spacing:'}</span>
                                    <strong>{templateItem.specs.lineSpacing}</strong>
                                  </div>
                                  <div>
                                    <span>{language === 'cn' ? '缩进:' : 'Indent:'}</span>
                                    <strong>{templateItem.specs.indent}</strong>
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="download-panel">
                  <div className="filename-row">
                    <div>
                      <span className="filename-label">{pageCopy.currentTemplate}</span>
                      <strong>
                        {language === 'cn'
                          ? selectedTemplateItem.name
                          : selectedTemplateItem.nameEn}
                      </strong>
                    </div>
                    <div className="filename-input-wrap">
                      <label htmlFor="filename">{pageCopy.fileName}</label>
                      <div className="filename-input">
                        <input
                          id="filename"
                          type="text"
                          value={customFilename || detectedFilename}
                          onChange={(event) => setCustomFilename(event.target.value)}
                          placeholder={pageCopy.fileNamePlaceholder}
                        />
                        <span>.docx</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="download-button"
                    onClick={handleGenerate}
                    disabled={!text.trim() || isGenerating}
                  >
                    <DownloadIcon className="icon icon-sm" />
                    {isGenerating ? pageCopy.downloading : pageCopy.download}
                  </button>
                  <p className="download-note">{pageCopy.exportFoot}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="features-section">
          <div className="page-container">
            <div className="section-heading">
              <h2>{pageCopy.featuresTitle}</h2>
              <p>{pageCopy.featuresBody}</p>
            </div>

            <div className="feature-grid">
              <article className="feature-card">
                <div className="feature-icon blue-soft">
                  <LayersIcon className="icon icon-md" />
                </div>
                <h3>{language === 'cn' ? '原生样式完美映射' : 'Native style mapping'}</h3>
                <p>
                  {language === 'cn'
                    ? '区别于只会“改字号和加粗”的工具，FormalDoc 会把标题、正文、表格等映射到 Word 原生样式窗格，后续修改排版更加优雅。'
                    : 'FormalDoc maps headings, body text, and tables to native Word styles instead of only changing font sizes and bold states.'}
                </p>
              </article>

              <article className="feature-card">
                <div className="feature-icon red-soft">
                  <LayoutIcon className="icon icon-md" />
                </div>
                <h3>{language === 'cn' ? '内置公文国标模板' : 'Built-in formal templates'}</h3>
                <p>
                  {language === 'cn'
                    ? '内置贴近 GB/T 9704 公文模板，也支持通用报告、学术论文和英文正式文档，一键套用即可交付。'
                    : 'Built-in templates cover formal government documents, reports, academic papers, and English professional layouts.'}
                </p>
              </article>

              <article className="feature-card">
                <div className="feature-icon purple-soft">
                  <GithubIcon className="icon icon-md fill-icon" />
                </div>
                <h3>{language === 'cn' ? '开源与高度定制' : 'Open source and flexible'}</h3>
                <p>
                  {language === 'cn'
                    ? '项目完全开源，支持接入自己的 `.docx` 参考模板，便于企业内部文档流与样式规范落地。'
                    : 'The project is open source and can be extended with your own `.docx` reference templates and internal style rules.'}
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="ecosystem-section">
          <div className="page-container">
            <div className="section-heading dark">
              <div className="ecosystem-badge">
                <ZapIcon className="icon icon-xs" />
                <span>{pageCopy.ecoBadge}</span>
              </div>
              <h2>{pageCopy.ecoTitle}</h2>
              <p>{pageCopy.ecoBody}</p>
            </div>

            <div className="ecosystem-grid">
              <article className="ecosystem-card">
                <div className="ecosystem-icon">
                  <TerminalIcon className="icon icon-md" />
                </div>
                <h3>{pageCopy.cliTitle}</h3>
                <p>{pageCopy.cliBody}</p>
                <div className="code-block">
                  <button
                    type="button"
                    className="copy-button dark"
                    onClick={() => handleCopy(INSTALL_COMMAND)}
                  >
                    {copiedCmd === INSTALL_COMMAND ? (
                      <CheckIcon className="icon icon-xs success" />
                    ) : (
                      <CopyIcon className="icon icon-xs" />
                    )}
                  </button>
                  <pre>{INSTALL_COMMAND}</pre>
                </div>
              </article>

              <article className="ecosystem-card">
                <div className="ecosystem-icon">
                  <BotIcon className="icon icon-md" />
                </div>
                <h3>{pageCopy.aiTitle}</h3>
                <p>{pageCopy.aiBody}</p>
                <div className="agent-card">
                  <div className="agent-head">
                    <span>AI</span>
                    <strong>Claude Code</strong>
                  </div>
                  <p className="agent-quote">
                    {language === 'cn'
                      ? '“请帮我把刚刚写的项目说明 readme.md 转换成一份正式的 Word 文档。”'
                      : '"Please convert the readme.md I just wrote into a polished Word document."'}
                  </p>
                  <div className="agent-log">
                    <TerminalIcon className="icon icon-xs" />
                    <div>
                      <span>Running command: formaldoc readme.md</span>
                      <strong>
                        {language === 'cn'
                          ? '✓ Conversion complete. Saved as readme.docx'
                          : '✓ Conversion complete. Saved as readme.docx'}
                      </strong>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="cta-section">
          <div className="page-container cta-panel">
            <h2>{pageCopy.ctaTitle}</h2>
            <p>{pageCopy.ctaBody}</p>
            <a href="#demo" className="cta-button">
              <span>{pageCopy.ctaAction}</span>
              <ChevronRightIcon className="icon icon-sm" />
            </a>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="page-container footer-inner">
          <div className="brand footer-brand">
            <span className="brand-icon">
              <FileTextIcon className="icon icon-sm" />
            </span>
            <span className="brand-text">FormalDoc</span>
          </div>
          <p>
            © {new Date().getFullYear()} FormalDoc.{' '}
            <a href="https://github.com/shrektan" target="_blank" rel="noreferrer">
              shrektan
            </a>{' '}
            {pageCopy.footerText}
          </p>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="footer-github">
            <GithubIcon className="icon icon-sm fill-icon" />
          </a>
        </div>
      </footer>

      <LoadingOverlay isVisible={isGenerating} message={pageCopy.downloading} />
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
