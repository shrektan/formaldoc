import { useState, useCallback } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { StyleDrawer } from './components/StyleSettings';
import { StyleProvider } from './contexts/StyleContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { useStyles } from './contexts/useStyles';
import { useLanguage } from './hooks/useTranslation';
import { useDocxGenerator } from './hooks/useDocxGenerator';
import { htmlToMarkdown } from './lib/html-to-markdown';
import { detectInitialLanguage } from './lib/language-detection';
import { examples } from './i18n';
import type { Language } from './i18n';
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
  const [showHeadingHint, setShowHeadingHint] = useState(false);
  const { styles, currentTemplate } = useStyles();
  const { language, t } = useLanguage();
  const { generate, isGenerating, error } = useDocxGenerator();

  // Check if text has markdown headings
  const checkForHeadings = (content: string) => {
    const hasHeadings = /^#{1,2}\s+.+$/m.test(content);
    if (!hasHeadings && content.trim().length > 50) {
      setShowHeadingHint(true);
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
    checkForHeadings(converted);
    alert(count > 0 ? t.alerts.quotesConverted(count) : t.alerts.noQuotesFound);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    setShowHeadingHint(false); // Reset hint on new paste
    const html = e.clipboardData.getData('text/html');
    if (html) {
      e.preventDefault();
      const markdown = htmlToMarkdown(html);
      setText(markdown);
      checkForHeadings(markdown);
    }
    // If no HTML, let default paste behavior handle plain text.
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
                {t.buttons.styles}
              </button>
              <button className="action-btn" onClick={handleLoadExample} type="button">
                {t.buttons.example}
              </button>
            </div>
          </div>
          <textarea
            id="content"
            className="content-input"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              checkForHeadings(e.target.value);
            }}
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
    </div>
  );
}

function App() {
  // Detect language synchronously before rendering
  const [language, setLanguage] = useState<Language>(() => detectInitialLanguage());

  // Handle language change from LanguageProvider
  const handleLanguageChange = useCallback((lang: Language) => {
    setLanguage(lang);
  }, []);

  return (
    // Key forces StyleProvider to remount and reload settings when language changes
    <StyleProvider key={language} language={language}>
      <LanguageProvider initialLanguage={language} onLanguageChange={handleLanguageChange}>
        <AppContent />
        <Analytics />
      </LanguageProvider>
    </StyleProvider>
  );
}

export default App;
