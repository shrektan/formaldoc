import { useState, useCallback, useEffect, type ReactNode } from 'react';
import type { Language } from '../i18n';
import { translations } from '../i18n';
import { LanguageContext } from './language-context';

const STORAGE_KEY = 'formaldoc-language';

/**
 * Update URL to reflect current language
 */
function updateUrlPath(lang: Language): void {
  const { search, hash } = window.location;
  window.history.replaceState({}, '', `/${lang}${search}${hash}`);
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
  initialLanguage: Language;
  onLanguageChange?: (lang: Language) => void;
}

export function LanguageProvider({
  children,
  initialLanguage,
  onLanguageChange,
}: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  // Save to localStorage whenever language changes
  useEffect(() => {
    saveLanguage(language);
  }, [language]);

  // Notify parent when language changes
  useEffect(() => {
    onLanguageChange?.(language);
  }, [language, onLanguageChange]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    updateUrlPath(lang);
  }, []);

  const t = translations[language];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}
