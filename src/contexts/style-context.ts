import { createContext } from 'react';
import type { StyleKey, StyleSettings, TextStyle } from '../types/styles';

export interface StyleContextValue {
  styles: StyleSettings;
  updateStyle: (key: StyleKey, style: Partial<TextStyle>) => void;
  resetStyles: () => void;
}

export const StyleContext = createContext<StyleContextValue | null>(null);
