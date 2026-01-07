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
      <div className="drawer-overlay" onClick={onClose} />
      <div className="style-drawer">
        <div className="drawer-header">
          <h2>{t.styleDrawer.title}</h2>
          <button className="drawer-close" onClick={onClose} aria-label="Close">
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
