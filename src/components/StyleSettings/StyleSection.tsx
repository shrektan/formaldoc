import { useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import type { TextStyle, DocumentFont, Template, StyleKey } from '../../types/styles';
import { STYLE_META } from '../../types/styles';

interface StyleSectionProps {
  styleKey: StyleKey;
  label: string;
  style: TextStyle;
  template: Template;
  onChange: (updates: Partial<TextStyle>) => void;
}

export function StyleSection({ styleKey, label, style, template, onChange }: StyleSectionProps) {
  const t = useTranslation();
  const meta = STYLE_META[styleKey];
  const [isOpen, setIsOpen] = useState(false);

  // Use template-specific fonts and sizes
  const availableFonts = template.availableFonts;
  const fontSizes = template.fontSizes;

  // Helper to find size name for a pt size
  const getSizeName = (pt: number): string => {
    const found = fontSizes.find((s) => s.pt === pt);
    return found ? found.name : `${pt}pt`;
  };

  return (
    <div className="style-section">
      <button className="style-section-header" onClick={() => setIsOpen(!isOpen)}>
        <span className="style-section-title">{label}</span>
        <span className="style-section-preview">
          {style.font} {getSizeName(style.size)}
        </span>
        <span className={`style-section-arrow ${isOpen ? 'open' : ''}`}>▶</span>
      </button>

      {isOpen && (
        <div className="style-section-content">
          <div className="style-row">
            <label>
              {t.styleLabels.font}
              <select
                value={style.font}
                onChange={(e) => onChange({ font: e.target.value as DocumentFont })}
              >
                {availableFonts.map((font) => (
                  <option key={font} value={font}>
                    {font}
                  </option>
                ))}
              </select>
            </label>

            <label>
              {t.styleLabels.size}
              <select
                value={style.size}
                onChange={(e) => onChange({ size: Number(e.target.value) })}
              >
                {fontSizes.map(({ name, pt }) => (
                  <option key={pt} value={pt}>
                    {name} ({pt}pt)
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="style-row checkboxes">
            {meta.allowBold && (
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={style.bold ?? false}
                  onChange={(e) => onChange({ bold: e.target.checked })}
                />
                {t.styleLabels.bold}
              </label>
            )}

            {meta.allowItalic && (
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={style.italic ?? false}
                  onChange={(e) => onChange({ italic: e.target.checked })}
                />
                {t.styleLabels.italic}
              </label>
            )}

            {meta.allowCenter && (
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={style.center ?? false}
                  onChange={(e) => onChange({ center: e.target.checked })}
                />
                {t.styleLabels.center}
              </label>
            )}

            {meta.allowIndent && (
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={style.indent ?? false}
                  onChange={(e) => onChange({ indent: e.target.checked })}
                />
                {t.styleLabels.indent}
              </label>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
