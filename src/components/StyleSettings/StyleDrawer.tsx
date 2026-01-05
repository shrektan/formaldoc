import { useStyles } from '../../contexts/useStyles';
import { STYLE_META, type StyleKey, type TemplateName } from '../../types/styles';
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

  if (!isOpen) return null;

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTemplate = e.target.value as TemplateName;
    if (
      confirm(
        'Changing template will reset all style settings. Continue?\n切换模板将重置所有样式设置，确定继续吗？'
      )
    ) {
      setTemplate(newTemplate);
    }
  };

  const handleReset = () => {
    if (confirm('Reset to default styles?\n确定要恢复默认样式吗？')) {
      resetStyles();
    }
  };

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="style-drawer">
        <div className="drawer-header">
          <h2>Document Styles</h2>
          <button className="drawer-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="drawer-content">
          {/* Template Selector */}
          <div className="template-selector">
            <label>Template / 模板</label>
            <select value={template} onChange={handleTemplateChange}>
              {Object.values(TEMPLATES).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <span className="template-desc">{currentTemplate.description}</span>
          </div>

          {/* Style Sections */}
          {STYLE_ORDER.map((key) => (
            <StyleSection
              key={key}
              label={STYLE_META[key].label}
              style={styles[key]}
              meta={STYLE_META[key]}
              template={currentTemplate}
              onChange={(updates) => updateStyle(key, updates)}
            />
          ))}
        </div>

        <div className="drawer-footer">
          <button className="reset-button" onClick={handleReset}>
            Reset / 恢复默认
          </button>
        </div>
      </div>
    </>
  );
}
