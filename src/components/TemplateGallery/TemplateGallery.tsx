import { useLanguage } from '../../hooks/useTranslation';
import type { Template, TemplateName } from '../../types/styles';
import { getTemplatesByCategory } from '../../lib/styles/templates';
import './TemplateGallery.css';

interface TemplateGalleryProps {
  isOpen: boolean;
  currentTemplate: TemplateName;
  onSelect: (templateId: TemplateName) => void;
  onClose: () => void;
}

function TemplateCard({
  template,
  isSelected,
  onSelect,
  language,
}: {
  template: Template;
  isSelected: boolean;
  onSelect: () => void;
  language: 'cn' | 'en';
}) {
  const isChinese = language === 'cn';
  const specs = template.specs;

  return (
    <button
      className={`template-card ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
      type="button"
    >
      {isSelected && <span className="template-check">✓</span>}
      <div className="template-card-name">
        {isChinese && template.category === 'chinese' ? template.name : template.nameEn}
      </div>
      <div className="template-card-desc">
        {isChinese && template.category === 'chinese'
          ? template.description
          : template.descriptionEn}
      </div>
      <div className="template-card-specs">
        <div className="spec-row">
          <span className="spec-label">{isChinese ? '正文' : 'Body'}:</span>
          <span className="spec-value">{specs.bodyFont}</span>
        </div>
        <div className="spec-row">
          <span className="spec-label">{isChinese ? '标题' : 'Heading'}:</span>
          <span className="spec-value">{specs.headingFont}</span>
        </div>
        <div className="spec-row">
          <span className="spec-label">{isChinese ? '行距' : 'Spacing'}:</span>
          <span className="spec-value">{specs.lineSpacing}</span>
        </div>
        <div className="spec-row">
          <span className="spec-label">{isChinese ? '缩进' : 'Indent'}:</span>
          <span className="spec-value">{specs.indent}</span>
        </div>
      </div>
    </button>
  );
}

export function TemplateGallery({
  isOpen,
  currentTemplate,
  onSelect,
  onClose,
}: TemplateGalleryProps) {
  const { language, t } = useLanguage();

  if (!isOpen) return null;

  const chineseTemplates = getTemplatesByCategory('chinese');
  const englishTemplates = getTemplatesByCategory('english');

  const handleSelect = (templateId: TemplateName) => {
    if (templateId !== currentTemplate) {
      onSelect(templateId);
    }
    onClose();
  };

  return (
    <>
      <div className="gallery-overlay" onClick={onClose} />
      <div className="template-gallery">
        <div className="gallery-header">
          <h2>{t.templateGallery.title}</h2>
          <button className="gallery-close" onClick={onClose} aria-label="Close" type="button">
            ×
          </button>
        </div>

        <div className="gallery-content">
          {/* Chinese Templates */}
          <div className="template-category">
            <h3 className="category-title">{t.templateGallery.chinese}</h3>
            <div className="template-grid">
              {chineseTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  isSelected={currentTemplate === template.id}
                  onSelect={() => handleSelect(template.id)}
                  language={language}
                />
              ))}
            </div>
          </div>

          {/* English Templates */}
          <div className="template-category">
            <h3 className="category-title">English</h3>
            <div className="template-grid">
              {englishTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  isSelected={currentTemplate === template.id}
                  onSelect={() => handleSelect(template.id)}
                  language={language}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
