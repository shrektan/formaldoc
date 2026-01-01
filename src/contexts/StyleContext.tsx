import { useState, useCallback, useEffect, type ReactNode } from 'react';
import type { StyleKey, StyleSettings, TextStyle } from '../types/styles';
import { DEFAULT_STYLES } from '../lib/styles/defaults';
import { loadStyles, saveStyles, resetStyles as resetStoredStyles } from '../lib/styles/storage';
import { StyleContext } from './style-context';

interface StyleProviderProps {
  children: ReactNode;
}

export function StyleProvider({ children }: StyleProviderProps) {
  const [styles, setStyles] = useState<StyleSettings>(() => loadStyles());

  // Save to localStorage whenever styles change
  useEffect(() => {
    saveStyles(styles);
  }, [styles]);

  const updateStyle = useCallback((key: StyleKey, updates: Partial<TextStyle>) => {
    setStyles((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...updates },
    }));
  }, []);

  const resetStyles = useCallback(() => {
    resetStoredStyles();
    setStyles(DEFAULT_STYLES);
  }, []);

  return (
    <StyleContext.Provider value={{ styles, updateStyle, resetStyles }}>
      {children}
    </StyleContext.Provider>
  );
}
