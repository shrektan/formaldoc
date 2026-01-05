import { useStyles } from '../../contexts/useStyles';
import { useTranslation } from '../../hooks/useTranslation';
import type { StyleKey, TemplateName } from '../../types/styles';
import { TEMPLATES } from '../../lib/styles/templates';
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
  const { styles, template, currentTemplate, updateStyle, setTemplate, resetStyles } = useStyles();
  const t = useTranslation();

  if (!isOpen) return null;

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTemplate = e.target.value as TemplateName;
    if (confirm(t.styleDrawer.confirmTemplateChange)) {
      setTemplate(newTemplate);
    }
  };

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
          {/* Template Selector */}
          <div className="template-selector">
            <label>{t.styleDrawer.template}</label>
            <select value={template} onChange={handleTemplateChange}>
              {Object.values(TEMPLATES).map((tmpl) => (
                <option key={tmpl.id} value={tmpl.id}>
                  {tmpl.name}
                </option>
              ))}
            </select>
            <span className="template-desc">{currentTemplate.description}</span>
          </div>

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
