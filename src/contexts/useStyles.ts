import { useContext } from 'react';
import { StyleContext, type StyleContextValue } from './style-context';

export function useStyles(): StyleContextValue {
  const context = useContext(StyleContext);
  if (!context) {
    throw new Error('useStyles must be used within a StyleProvider');
  }
  return context;
}
