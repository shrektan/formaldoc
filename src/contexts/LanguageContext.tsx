import { useState, useCallback, useEffect, type ReactNode } from 'react';
import type { Language } from '../i18n';
import { translations } from '../i18n';
import { LanguageContext } from './language-context';

const STORAGE_KEY = 'formaldoc-language';

/**
 * Detect language from URL path
 * Returns 'cn' for /cn, 'en' for /en, null otherwise
 */
function getLanguageFromPath(): Language | null {
  const path = window.location.pathname;
  if (path === '/cn') return 'cn';
  if (path === '/en') return 'en';
  return null;
}

/**
 * Update URL to reflect current language
 */
function updateUrlPath(lang: Language): void {
  window.history.replaceState({}, '', `/${lang}`);
}

/**
 * Detect browser language preference
 * Returns 'cn' for Chinese variants, 'en' for everything else
 */
function detectBrowserLanguage(): Language {
  const browserLang = navigator.language || navigator.languages?.[0] || 'en';
  // Check for Chinese variants: zh, zh-CN, zh-TW, zh-HK, etc.
  if (browserLang.startsWith('zh')) {
    return 'cn';
  }
  return 'en';
}

/**
 * Load language preference
 * Priority: URL path > localStorage > browser detection
 */
function loadLanguage(): Language {
  // 1. URL path takes highest priority
  const pathLang = getLanguageFromPath();
  if (pathLang) {
    return pathLang;
  }

  // 2. Then localStorage
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'cn' || stored === 'en') {
      return stored;
    }
  } catch {
    // localStorage might be disabled
  }

  // 3. Finally browser detection
  return detectBrowserLanguage();
}

/**
 * Save language preference to localStorage
 */
function saveLanguage(lang: Language): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    console.warn('Failed to save language preference to localStorage');
  }
}

interface LanguageProviderProps {
  children: ReactNode;
  onLanguageChange?: (lang: Language) => void;
}

export function LanguageProvider({ children, onLanguageChange }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(() => loadLanguage());

  // Save to localStorage whenever language changes
  useEffect(() => {
    saveLanguage(language);
  }, [language]);

  const setLanguage = useCallback(
    (lang: Language) => {
      setLanguageState(lang);
      updateUrlPath(lang);
      onLanguageChange?.(lang);
    },
    [onLanguageChange]
  );

  const t = translations[language];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}
