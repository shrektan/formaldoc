import { useState } from 'react';
import type { TextStyle, StyleMeta, DocumentFont, Template } from '../../types/styles';

interface StyleSectionProps {
  label: string;
  style: TextStyle;
  meta: StyleMeta;
  template: Template;
  onChange: (updates: Partial<TextStyle>) => void;
}

export function StyleSection({ label, style, meta, template, onChange }: StyleSectionProps) {
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
              Font
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
              Size
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
                Bold
              </label>
            )}

            {meta.allowItalic && (
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={style.italic ?? false}
                  onChange={(e) => onChange({ italic: e.target.checked })}
                />
                Italic
              </label>
            )}

            {meta.allowCenter && (
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={style.center ?? false}
                  onChange={(e) => onChange({ center: e.target.checked })}
                />
                Center
              </label>
            )}

            {meta.allowIndent && (
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={style.indent ?? false}
                  onChange={(e) => onChange({ indent: e.target.checked })}
                />
                Indent
              </label>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
