import { useState, useCallback } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { StyleDrawer } from './components/StyleSettings';
import { TemplateGallery } from './components/TemplateGallery';
import { MarkdownEditor } from './components/Editor/MarkdownEditor';
import { LoadingOverlay } from './components/LoadingOverlay';
import { StyleProvider } from './contexts/StyleContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { useStyles } from './contexts/useStyles';
import { useLanguage } from './hooks/useTranslation';
import { useDocxGenerator } from './hooks/useDocxGenerator';
import { htmlToMarkdown } from './lib/html-to-markdown';
import { examples } from './i18n';
import type { Language } from './i18n';
import type { TemplateName } from './types/styles';
import './styles/app.css';

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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [showHeadingHint, setShowHeadingHint] = useState(false);
  const { styles, currentTemplate, template, setTemplate } = useStyles();
  const { language, t } = useLanguage();
  const { generate, isGenerating, error } = useDocxGenerator();

  const handleTemplateSelect = (templateId: TemplateName) => {
    setTemplate(templateId);
  };

  // Get display name for current template based on language
  const getTemplateDisplayName = () => {
    if (language === 'cn' && currentTemplate.category === 'chinese') {
      return currentTemplate.name;
    }
    return currentTemplate.nameEn;
  };

  /**
   * Check if text contains markdown formatting.
   * We look for common markdown patterns, not just headings.
   */
  const checkForMarkdown = (content: string) => {
    const trimmed = content.trim();
    if (trimmed.length < 50) {
      setShowHeadingHint(false);
      return;
    }

    // Check for various markdown patterns
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

    const hasMarkdown = markdownPatterns.some((pattern) => pattern.test(trimmed));

    if (!hasMarkdown) {
      setShowHeadingHint(true);
    } else {
      setShowHeadingHint(false);
    }
  };

  const handleGenerate = () => {
    generate(text, styles, currentTemplate.documentSettings);
  };

  const handleLoadExample = () => {
    setText(examples[language]);
    setShowHeadingHint(false);
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

  // Handle paste from HTML (e.g., AI chatbots)
  const handlePaste = (html: string): string | null => {
    setShowHeadingHint(false);
    const markdown = htmlToMarkdown(html);
    checkForMarkdown(markdown);
    return markdown;
  };

  // Handle text changes from the editor
  const handleTextChange = (value: string) => {
    setText(value);
    checkForMarkdown(value);
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
        {/* Template selector button */}
        <button
          type="button"
          className="template-selector-btn"
          onClick={() => setIsGalleryOpen(true)}
        >
          <span className="template-icon">📄</span>
          <span className="template-name">{getTemplateDisplayName()}</span>
          <span className="template-arrow">▾</span>
        </button>
      </header>

      {/* Main content */}
      <main className="main-simple">
        {/* Textarea */}
        <div className="input-section">
          <div className="input-header">
            <label htmlFor="content">{t.input.label}</label>
            <div className="input-actions">
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
        <p className="version">v{__APP_VERSION__}</p>
      </footer>

      {/* Settings drawer */}
      <StyleDrawer isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* Template gallery */}
      <TemplateGallery
        isOpen={isGalleryOpen}
        currentTemplate={template}
        onSelect={handleTemplateSelect}
        onClose={() => setIsGalleryOpen(false)}
      />

      {/* Loading overlay */}
      <LoadingOverlay isVisible={isGenerating} message={t.loading.generating} />
    </div>
  );
}

function AppWithLanguage() {
  const { currentTemplate, setTemplate } = useStyles();

  const handleLanguageChange = useCallback(
    (lang: Language) => {
      // Auto-switch template only if current template's category doesn't match language
      const currentCategory = currentTemplate.category;
      const targetCategory = lang === 'cn' ? 'chinese' : 'english';

      if (currentCategory !== targetCategory) {
        // Switch to default template for the new language
        const templateForLang = lang === 'cn' ? 'cn-general' : 'en-standard';
        setTemplate(templateForLang);
      }
    },
    [currentTemplate.category, setTemplate]
  );

  return (
    <LanguageProvider onLanguageChange={handleLanguageChange}>
      <AppContent />
      <Analytics />
    </LanguageProvider>
  );
}

function App() {
  return (
    <StyleProvider>
      <AppWithLanguage />
    </StyleProvider>
  );
}

export default App;
