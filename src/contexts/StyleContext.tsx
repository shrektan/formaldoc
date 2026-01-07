import { useState, useCallback, useEffect, type ReactNode } from 'react';
import type { Language } from '../i18n';
import type { StyleKey, StyleSettings, TextStyle, TemplateName } from '../types/styles';
import {
  loadStyles,
  saveStyles,
  resetStyles as resetStoredStyles,
  loadTemplate,
  saveTemplate,
} from '../lib/styles/storage';
import { getTemplate, TEMPLATES } from '../lib/styles/templates';
import { StyleContext } from './style-context';

interface StyleProviderProps {
  children: ReactNode;
  language: Language;
}

export function StyleProvider({ children, language }: StyleProviderProps) {
  const [template, setTemplateState] = useState<TemplateName>(() => loadTemplate(language));
  const [styles, setStyles] = useState<StyleSettings>(() => loadStyles(language, template));

  // Save to localStorage whenever styles change
  useEffect(() => {
    saveStyles(styles, language);
  }, [styles, language]);

  // Save to localStorage whenever template changes
  useEffect(() => {
    saveTemplate(template, language);
  }, [template, language]);

  const updateStyle = useCallback((key: StyleKey, updates: Partial<TextStyle>) => {
    setStyles((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...updates },
    }));
  }, []);

  const setTemplate = useCallback(
    (name: TemplateName) => {
      setTemplateState(name);
      // Reset styles to new template defaults
      const newTemplateStyles = getTemplate(name).styles;
      setStyles(newTemplateStyles);
      // Clear custom styles from storage
      resetStoredStyles(language);
    },
    [language]
  );

  const resetStyles = useCallback(() => {
    resetStoredStyles(language);
    setStyles(getTemplate(template).styles);
  }, [template, language]);

  const currentTemplate = TEMPLATES[template];

  return (
    <StyleContext.Provider
      value={{
        styles,
        template,
        currentTemplate,
        updateStyle,
        setTemplate,
        resetStyles,
      }}
    >
      {children}
    </StyleContext.Provider>
  );
}
