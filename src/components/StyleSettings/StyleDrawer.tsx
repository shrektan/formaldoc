import { useStyles } from '../../contexts/useStyles';
import { STYLE_META, type StyleKey } from '../../types/styles';
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
  const { styles, updateStyle, resetStyles } = useStyles();

  if (!isOpen) return null;

  const handleReset = () => {
    if (confirm('确定要恢复默认样式吗？')) {
      resetStyles();
    }
  };

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="style-drawer">
        <div className="drawer-header">
          <h2>文档样式</h2>
          <button className="drawer-close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>

        <div className="drawer-content">
          {STYLE_ORDER.map((key) => (
            <StyleSection
              key={key}
              label={STYLE_META[key].label}
              style={styles[key]}
              meta={STYLE_META[key]}
              onChange={(updates) => updateStyle(key, updates)}
            />
          ))}
        </div>

        <div className="drawer-footer">
          <button className="reset-button" onClick={handleReset}>
            恢复默认
          </button>
        </div>
      </div>
    </>
  );
}
