import { useState, useCallback, useEffect, type ReactNode } from 'react';
import type { Language } from '../i18n';
import { translations } from '../i18n';
import { LanguageContext } from './language-context';

const STORAGE_KEY = 'formaldoc-language';

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
 * Load language preference from localStorage
 * Falls back to browser language detection
 */
function loadLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'cn' || stored === 'en') {
      return stored;
    }
  } catch {
    // localStorage might be disabled
  }
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
