import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../hooks/useTranslation';
import {
  convertQuotes,
  removeMarkdownEmphasis,
  removeChineseSpaces,
  cleanAllAiText,
} from '../../lib/text-processing';
import './TextProcessingMenu.css';

interface TextProcessingMenuProps {
  text: string;
  onTextChange: (newText: string) => void;
  disabled?: boolean;
}

export function TextProcessingMenu({ text, onTextChange, disabled }: TextProcessingMenuProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleConvertQuotes = () => {
    const result = convertQuotes(text);
    onTextChange(result.text);
    alert(result.count > 0 ? t.alerts.quotesConverted(result.count) : t.alerts.noQuotesFound);
    setIsOpen(false);
  };

  const handleRemoveEmphasis = () => {
    const result = removeMarkdownEmphasis(text);
    onTextChange(result.text);
    alert(result.count > 0 ? t.alerts.emphasisRemoved(result.count) : t.alerts.noEmphasisFound);
    setIsOpen(false);
  };

  const handleRemoveChineseSpaces = () => {
    const result = removeChineseSpaces(text);
    onTextChange(result.text);
    alert(result.count > 0 ? t.alerts.spacesRemoved(result.count) : t.alerts.noSpacesFound);
    setIsOpen(false);
  };

  const handleCleanAll = () => {
    const result = cleanAllAiText(text);
    onTextChange(result.text);
    const total = result.quotes + result.emphasis + result.spaces;
    alert(
      total > 0
        ? t.alerts.cleanedAll(result.quotes, result.emphasis, result.spaces)
        : t.alerts.nothingToClean
    );
    setIsOpen(false);
  };

  return (
    <div className="text-processing-menu" ref={menuRef}>
      <button
        type="button"
        className="text-processing-trigger"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {t.textProcessing.menuLabel}
        <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`} />
      </button>

      {isOpen && (
        <div className="text-processing-dropdown">
          <button
            type="button"
            className="text-processing-item"
            onClick={handleConvertQuotes}
            disabled={disabled}
          >
            {t.textProcessing.convertQuotes}
          </button>
          <button
            type="button"
            className="text-processing-item"
            onClick={handleRemoveEmphasis}
            disabled={disabled}
          >
            {t.textProcessing.removeEmphasis}
          </button>
          <button
            type="button"
            className="text-processing-item"
            onClick={handleRemoveChineseSpaces}
            disabled={disabled}
          >
            {t.textProcessing.removeChineseSpaces}
          </button>
          <div className="text-processing-divider" />
          <button
            type="button"
            className="text-processing-item clean-all"
            onClick={handleCleanAll}
            disabled={disabled}
          >
            {t.textProcessing.cleanAll}
          </button>
        </div>
      )}
    </div>
  );
}
