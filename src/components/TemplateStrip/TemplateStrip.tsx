import { useMemo } from 'react';
import { getTemplatesByCategory } from '../../lib/styles/templates';
import { useLanguage } from '../../hooks/useTranslation';
import type { TemplateName, Template } from '../../types/styles';
import './TemplateStrip.css';

interface MiniTemplateCardProps {
  template: Template;
  isSelected: boolean;
  onSelect: () => void;
  uiLanguage: 'cn' | 'en';
}

function MiniTemplateCard({ template, isSelected, onSelect, uiLanguage }: MiniTemplateCardProps) {
  // Show Chinese name for Chinese templates, English name for English templates
  const displayName =
    template.category === 'chinese'
      ? uiLanguage === 'cn'
        ? template.name
        : template.nameEn
      : template.nameEn;

  // Get key spec info
  const spec = template.specs;

  return (
    <button
      type="button"
      className={`mini-card ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
      title={template.category === 'chinese' ? template.description : template.descriptionEn}
    >
      {isSelected && <span className="mini-card-check">&#10003;</span>}
      <div className="mini-card-name">{displayName}</div>
      <div className="mini-card-spec">
        {spec.bodyFont} | {spec.lineSpacing} | {spec.indent}
      </div>
    </button>
  );
}

interface TemplateStripProps {
  currentTemplate: TemplateName;
  onSelect: (templateId: TemplateName) => void;
  onOpenSettings: () => void;
}

export function TemplateStrip({ currentTemplate, onSelect, onOpenSettings }: TemplateStripProps) {
  const { language, t } = useLanguage();

  // Determine which category to show based on current template
  const templateCategory = currentTemplate.startsWith('cn-') ? 'chinese' : 'english';

  // Get templates for the current category
  const templates = useMemo(() => {
    return getTemplatesByCategory(templateCategory);
  }, [templateCategory]);

  return (
    <div className="template-strip">
      <div className="template-cards">
        {templates.map((template) => (
          <MiniTemplateCard
            key={template.id}
            template={template}
            isSelected={template.id === currentTemplate}
            onSelect={() => onSelect(template.id)}
            uiLanguage={language}
          />
        ))}
      </div>

      <button
        type="button"
        className="strip-settings-btn"
        onClick={onOpenSettings}
        title={t.buttons.customize}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
        </svg>
      </button>
    </div>
  );
}
