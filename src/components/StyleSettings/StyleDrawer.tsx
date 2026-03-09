import { useEffect, useRef } from 'react';
import { useStyles } from '../../contexts/useStyles';
import { useTranslation } from '../../hooks/useTranslation';
import type { StyleKey } from '../../types/styles';
import { StyleSection } from './StyleSection';

interface StyleDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

// Order of style sections in the drawer
const STYLE_ORDER: StyleKey[] = [
  'title',
  'heading1',
  'heading2',
  'heading3',
  'heading4',
  'bodyText',
  'listItem',
  'tableHeader',
  'tableCell',
  'pageFooter',
];

export function StyleDrawer({ isOpen, onClose }: StyleDrawerProps) {
  const { styles, currentTemplate, updateStyle, resetStyles } = useStyles();
  const t = useTranslation();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveRef = useRef<Element | null>(null);

  // Trap focus and handle Escape key while drawer is open
  useEffect(() => {
    if (!isOpen) return;

    // Save the element that had focus before the drawer opened
    previousActiveRef.current = document.activeElement;

    // Focus the close button on open
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Return focus to the previously focused element on close
      (previousActiveRef.current as HTMLElement | null)?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleReset = () => {
    if (confirm(t.styleDrawer.confirmReset)) {
      resetStyles();
    }
  };

  // Get style name from translations
  const getStyleLabel = (key: StyleKey): string => {
    return t.styleNames[key];
  };

  return (
    <>
      <div className="drawer-overlay" aria-hidden="true" onClick={onClose} />
      <div className="style-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <div className="drawer-header">
          <h2 id="drawer-title">{t.styleDrawer.title}</h2>
          <button
            ref={closeButtonRef}
            className="drawer-close"
            onClick={onClose}
            aria-label={t.hints.closeHint}
          >
            ×
          </button>
        </div>

        <div className="drawer-content">
          {/* Style Sections */}
          {STYLE_ORDER.map((key) => (
            <StyleSection
              key={key}
              styleKey={key}
              label={getStyleLabel(key)}
              style={styles[key]}
              template={currentTemplate}
              onChange={(updates) => updateStyle(key, updates)}
            />
          ))}
        </div>

        <div className="drawer-footer">
          <button className="reset-button" onClick={handleReset}>
            {t.styleDrawer.reset}
          </button>
        </div>
      </div>
    </>
  );
}
