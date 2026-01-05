import { useContext } from 'react';
import { LanguageContext } from '../contexts/language-context';

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

/**
 * Convenience hook to get translations only
 */
export function useTranslation() {
  const { t } = useLanguage();
  return t;
}
