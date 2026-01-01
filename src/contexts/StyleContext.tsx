import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { StyleSettings, StyleKey, TextStyle } from '../types/styles';
import { DEFAULT_STYLES } from '../lib/styles/defaults';
import { loadStyles, saveStyles, resetStyles as resetStoredStyles } from '../lib/styles/storage';

interface StyleContextValue {
  styles: StyleSettings;
  updateStyle: (key: StyleKey, style: Partial<TextStyle>) => void;
  resetStyles: () => void;
}

const StyleContext = createContext<StyleContextValue | null>(null);

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

export function useStyles(): StyleContextValue {
  const context = useContext(StyleContext);
  if (!context) {
    throw new Error('useStyles must be used within a StyleProvider');
  }
  return context;
}
