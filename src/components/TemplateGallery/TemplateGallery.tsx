import { useState } from 'react';
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
  onPreview,
  language,
  previewLabel,
  previewAction,
}: {
  template: Template;
  isSelected: boolean;
  onSelect: () => void;
  onPreview: () => void;
  language: 'cn' | 'en';
  previewLabel: string;
  previewAction: string;
}) {
  const isChinese = language === 'cn';
  const specs = template.specs;
  const [thumbFailed, setThumbFailed] = useState(false);
  const hasThumbnail = Boolean(template.thumbnail) && !thumbFailed;

  return (
    <div
      role="button"
      tabIndex={0}
      className={`template-card ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {isSelected && <span className="template-check">✓</span>}
      {hasThumbnail ? (
        <div className="template-thumb-wrap">
          <img
            className="template-thumb-img"
            src={template.thumbnail}
            alt={`${isChinese && template.category === 'chinese' ? template.name : template.nameEn}`}
            loading="lazy"
            decoding="async"
            onError={() => setThumbFailed(true)}
          />
          <button
            className="template-thumb-preview-btn"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPreview();
            }}
          >
            {previewAction}
          </button>
        </div>
      ) : (
        <div className="template-thumb placeholder">
          <span className="template-thumb-label">{previewLabel}</span>
        </div>
      )}
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
          <span className="spec-value">
            {specs.bodyFont}
            {template.category === 'chinese' && specs.bodyEnglishFont && (
              <span className="spec-english-font"> + {specs.bodyEnglishFont}</span>
            )}
          </span>
        </div>
        <div className="spec-row">
          <span className="spec-label">{isChinese ? '标题' : 'Heading'}:</span>
          <span className="spec-value">
            {specs.headingFont}
            {template.category === 'chinese' && specs.headingEnglishFont && (
              <span className="spec-english-font"> + {specs.headingEnglishFont}</span>
            )}
          </span>
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
    </div>
  );
}

export function TemplateGallery({
  isOpen,
  currentTemplate,
  onSelect,
  onClose,
}: TemplateGalleryProps) {
  const { language, t } = useLanguage();
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

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
          <p className="gallery-hint">{t.templateGallery.previewHint}</p>
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
                  onPreview={() => setPreviewTemplate(template)}
                  language={language}
                  previewLabel={t.templateGallery.previewLabel}
                  previewAction={t.templateGallery.previewAction}
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
                  onPreview={() => setPreviewTemplate(template)}
                  language={language}
                  previewLabel={t.templateGallery.previewLabel}
                  previewAction={t.templateGallery.previewAction}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {previewTemplate?.thumbnail && (
        <div className="thumb-lightbox-overlay" onClick={() => setPreviewTemplate(null)}>
          <div className="thumb-lightbox" onClick={(e) => e.stopPropagation()}>
            <div className="thumb-lightbox-header">
              <h3>{t.templateGallery.previewDialogTitle}</h3>
              <button
                className="thumb-lightbox-close"
                onClick={() => setPreviewTemplate(null)}
                aria-label={t.hints.closeHint}
                type="button"
              >
                ×
              </button>
            </div>
            <img
              className="thumb-lightbox-img"
              src={previewTemplate.thumbnail}
              alt={language === 'cn' ? previewTemplate.name : previewTemplate.nameEn}
            />
          </div>
        </div>
      )}
    </>
  );
}
