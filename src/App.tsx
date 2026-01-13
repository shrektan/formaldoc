import { useState, useCallback, useMemo } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { StyleDrawer } from './components/StyleSettings';
import { TemplateStrip } from './components/TemplateStrip';
import { MarkdownEditor } from './components/Editor/MarkdownEditor';
import { LoadingOverlay } from './components/LoadingOverlay';
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
import type { TemplateName } from './types/styles';
import './styles/app.css';

type PasteMode = 'auto' | 'plain';

const PASTE_MODE_STORAGE_KEY = 'formaldoc.pasteMode';
const FEEDBACK_URL = 'https://wj.qq.com/s2/25520616/850f/';

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

function AppContent() {
  const [text, setText] = useState('');
  const [customFilename, setCustomFilename] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showHeadingHint, setShowHeadingHint] = useState(false);
  const [showEscapedLatexHint, setShowEscapedLatexHint] = useState(false);
  const [showPasteUndoHint, setShowPasteUndoHint] = useState(false);
  const [originalPlainText, setOriginalPlainText] = useState<string | null>(null);
  const [pasteMode, setPasteMode] = useState<PasteMode>(loadPasteMode);
  const { styles, currentTemplate, template, setTemplate } = useStyles();
  const { language, t } = useLanguage();
  const { generate, isGenerating, error } = useDocxGenerator();

  // Auto-detect filename from markdown title
  const detectedFilename = useMemo(() => {
    const title = extractTitle(text);
    return title ? sanitizeFilename(title) : '';
  }, [text]);

  const handleTemplateSelect = (templateId: TemplateName) => {
    setTemplate(templateId);
  };

  /**
   * Check if text contains markdown formatting.
   * We look for common markdown patterns, not just headings.
   */
  const markdownPatterns = [
    /^#{1,6}\s+.+$/m, // Headings: # ## ### etc
    /^\s*[-*+]\s+.+$/m, // Unordered list: - * +
    /^\s*\d+\.\s+.+$/m, // Ordered list: 1. 2. etc
    /\*\*.+?\*\*/m, // Bold: **text**
    /\*.+?\*/m, // Italic: *text*
    /\[.+?\]\(.+?\)/m, // Links: [text](url)
    /^\s*>\s+.+$/m, // Blockquote: > text
    /`[^`]+`/m, // Inline code: `code`
    /^```/m, // Code block: ```
    /^\|.+\|$/m, // Table: |col|col|
    /^\s*[-*_]{3,}\s*$/m, // Horizontal rule: --- or *** or ___
    /\$\$.+?\$\$/s, // Block math: $$...$$
    /\$.+?\$/m, // Inline math: $...$
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

  /**
   * Detect if text contains escaped LaTeX (e.g., \\frac instead of \frac).
   * This commonly happens when copying from AI chatbots like Claude/ChatGPT.
   */
  const detectEscapedLatex = (content: string): boolean => {
    // Look for double-backslash patterns inside math environments ($...$ or $$...$$)
    // Common escaped commands: \\frac, \\left, \\right, \\sum, \\int, \\alpha, etc.
    const escapedPattern =
      /\$[^$]*\\\\(frac|left|right|sum|int|prod|lim|sqrt|alpha|beta|gamma|delta|times|cdot|leq|geq|neq)[^$]*\$/;
    return escapedPattern.test(content);
  };

  /**
   * Fix escaped LaTeX by converting double backslashes to single.
   */
  const handleFixEscapedLatex = () => {
    const fixed = unescapeLatex(text);
    setText(fixed);
    setShowEscapedLatexHint(false);
    // Re-check for markdown after fixing
    checkForMarkdown(fixed);
  };

  const handleGenerate = () => {
    // Use custom filename if set, otherwise use auto-detected
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
    setOriginalPlainText(null);
  };

  const handleConvertQuotes = () => {
    // Convert English double quotes to Chinese double quotes
    // "content" → "content" (U+201C and U+201D)
    let count = 0;
    const converted = text.replace(/"([^"]*)"/g, (_match, content) => {
      count++;
      return '\u201C' + content + '\u201D';
    });
    setText(converted);
    checkForMarkdown(converted);
    alert(count > 0 ? t.alerts.quotesConverted(count) : t.alerts.noQuotesFound);
  };

  const hasRichHtml = (html: string): boolean =>
    /<(table|tr|th|td|ul|ol|li|h[1-6]|blockquote|pre|code|strong|em|b|i|br|hr|p)\b/i.test(html);

  // Handle paste from HTML (e.g., AI chatbots)
  const handlePaste = (html: string, plainText: string): string | null => {
    setShowHeadingHint(false);
    setShowPasteUndoHint(false);
    setOriginalPlainText(null);
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

    // Show undo hint for rich HTML paste even if Markdown matches plain text
    if (shouldShowPasteUndoHint && plainText.trim().length > 0) {
      setOriginalPlainText(plainText);
      setShowPasteUndoHint(true);
      // Auto-dismiss after 8 seconds
      setTimeout(() => {
        setShowPasteUndoHint(false);
      }, 8000);
    }

    checkForMarkdown(markdown);
    // Detect escaped LaTeX in pasted content
    if (detectEscapedLatex(markdown)) {
      setShowEscapedLatexHint(true);
    }
    return markdown;
  };

  // Handle undo paste - restore original plain text
  const handleUndoPaste = () => {
    if (originalPlainText !== null) {
      setText(originalPlainText);
      setShowPasteUndoHint(false);
      setOriginalPlainText(null);
      checkForMarkdown(originalPlainText);
    }
  };

  // Handle text changes from the editor
  const handleTextChange = (value: string) => {
    setText(value);
    // Dismiss paste undo hint on any edit
    setShowPasteUndoHint(false);
    setOriginalPlainText(null);
    checkForMarkdown(value);
    // Detect escaped LaTeX (only show hint if not already dismissed for this content)
    if (detectEscapedLatex(value)) {
      setShowEscapedLatexHint(true);
    }
  };

  return (
    <div className="app-simple">
      {/* Header */}
      <header className="header-simple">
        <div className="header-title">
          <img src="/logo.png" alt="FormalDoc Logo" className="logo" />
          <h1>{t.header.title}</h1>
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
        <p className="tagline">{t.header.tagline}</p>
        <p className="tip">{t.header.tip}</p>
        {/* Template strip */}
        <TemplateStrip
          currentTemplate={template}
          onSelect={handleTemplateSelect}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      </header>

      {/* Main content */}
      <main className="main-simple">
        {/* Textarea */}
        <div className="input-section">
          <div className="input-header">
            <label htmlFor="content">{t.input.label}</label>
            <div className="input-actions">
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
              <button
                className="action-btn"
                onClick={handleConvertQuotes}
                type="button"
                disabled={!text.trim()}
              >
                {t.buttons.quoteConvert}
              </button>
              <button className="action-btn" onClick={() => setIsSettingsOpen(true)} type="button">
                {t.buttons.customize}
              </button>
              <button className="action-btn" onClick={handleLoadExample} type="button">
                {t.buttons.example}
              </button>
              <button
                className="action-btn"
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
          {/* Heading hint for mobile users */}
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

          {/* Escaped LaTeX hint */}
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

          {/* Paste undo hint */}
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
                  setOriginalPlainText(null);
                }}
                aria-label={t.hints.closeHint}
              >
                ×
              </button>
            </div>
          )}

          {/* Filename input */}
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
        </div>

        {/* Error message */}
        {error && <div className="error-msg">{error}</div>}

        {/* Generate button */}
        <button
          className="generate-btn"
          onClick={handleGenerate}
          disabled={!text.trim() || isGenerating}
          type="button"
        >
          {isGenerating ? t.buttons.downloading : t.buttons.download}
        </button>
      </main>

      {/* Footer */}
      <footer className="footer-simple">
        <p>{t.footer.tagline}</p>
        <a
          className="footer-feedback"
          href={FEEDBACK_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t.footer.feedback}
        </a>
        <p className="version">v{__APP_VERSION__}</p>
      </footer>

      {/* Settings drawer */}
      <StyleDrawer isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* Loading overlay */}
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
      // Notify App to update state (triggers StyleProvider remount)
      onLanguageChange(lang);

      // Auto-switch template only if current template's category doesn't match language
      const currentCategory = currentTemplate.category;
      const targetCategory = lang === 'cn' ? 'chinese' : 'english';

      if (currentCategory !== targetCategory) {
        // Switch to default template for the new language
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
  // Detect language synchronously before rendering
  const [language, setLanguage] = useState<Language>(() => detectInitialLanguage());

  return (
    // Key forces StyleProvider to remount and reload settings when language changes
    <StyleProvider key={language} language={language}>
      <AppWithLanguage language={language} onLanguageChange={setLanguage} />
    </StyleProvider>
  );
}

export default App;
