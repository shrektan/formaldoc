import { useState } from 'react';
import type { TextStyle, StyleMeta, ChineseFont, FontSize } from '../../types/styles';
import { AVAILABLE_FONTS, AVAILABLE_SIZES } from '../../types/styles';

interface StyleSectionProps {
  label: string;
  style: TextStyle;
  meta: StyleMeta;
  onChange: (updates: Partial<TextStyle>) => void;
}

export function StyleSection({ label, style, meta, onChange }: StyleSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="style-section">
      <button className="style-section-header" onClick={() => setIsOpen(!isOpen)}>
        <span className="style-section-title">{label}</span>
        <span className="style-section-preview">
          {style.font} {style.size}pt
        </span>
        <span className={`style-section-arrow ${isOpen ? 'open' : ''}`}>▶</span>
      </button>

      {isOpen && (
        <div className="style-section-content">
          <div className="style-row">
            <label>
              字体
              <select
                value={style.font}
                onChange={(e) => onChange({ font: e.target.value as ChineseFont })}
              >
                {AVAILABLE_FONTS.map((font) => (
                  <option key={font} value={font}>
                    {font}
                  </option>
                ))}
              </select>
            </label>

            <label>
              字号
              <select
                value={style.size}
                onChange={(e) => onChange({ size: Number(e.target.value) as FontSize })}
              >
                {AVAILABLE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}pt
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
                加粗
              </label>
            )}

            {meta.allowItalic && (
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={style.italic ?? false}
                  onChange={(e) => onChange({ italic: e.target.checked })}
                />
                斜体
              </label>
            )}

            {meta.allowCenter && (
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={style.center ?? false}
                  onChange={(e) => onChange({ center: e.target.checked })}
                />
                居中
              </label>
            )}

            {meta.allowIndent && (
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={style.indent ?? false}
                  onChange={(e) => onChange({ indent: e.target.checked })}
                />
                首行缩进
              </label>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
