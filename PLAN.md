# Layout Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure the FormalDoc layout so the preview panel is a sticky sidebar always visible alongside the editor, template specs fold into the template strip, skeletons become horizontal chips, and mobile uses tab switching.

**Architecture:** Replace the current 2-column grid (editor | 3-card sidebar) with (editor | sticky preview-only sidebar). Template specs become a collapsible `<details>` inside the template strip row. Scenario skeletons become a horizontal chip group below editor hints. Mobile uses Edit/Preview tab switching instead of CSS order rearrangement.

**Tech Stack:** React 19 + TypeScript + CSS (no new dependencies)

---

## Task 1: Add i18n translations for mobile tabs

**Files:**
- Modify: `src/i18n/translations.ts`

**Step 1: Add tab keys to Translations interface**

At line ~53 (after `footer` block), add:

```typescript
  tabs: {
    edit: string;
    preview: string;
  };
```

**Step 2: Add Chinese translations**

Inside the `cn` object (after `filename` block ~line 220):

```typescript
    tabs: {
      edit: '编辑',
      preview: '预览',
    },
```

**Step 3: Add English translations**

Inside the `en` object (after `filename` block ~line 335):

```typescript
    tabs: {
      edit: 'Edit',
      preview: 'Preview',
    },
```

**Step 4: Verify types compile**

Run: `npx tsc --noEmit`
Expected: PASS (no type errors)

**Step 5: Commit**

```bash
git add src/i18n/translations.ts
git commit -m "feat(i18n): add mobile tab translations (edit/preview)"
```

---

## Task 2: Rewrite CSS — grid, sticky preview, skeleton chips, mobile tabs

This is the largest single task. It rewrites `src/styles/app.css` responsive breakpoints and adds new component styles.

**Files:**
- Modify: `src/styles/app.css`

**Step 1: Change workspace-shell grid**

Find (line ~248-254):
```css
.workspace-shell {
  margin-top: 14px;
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) 400px;
  gap: 14px;
  align-items: start;
}
```

Replace with:
```css
.workspace-shell {
  margin-top: 14px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 14px;
  align-items: start;
}
```

**Step 2: Remove composer min-height**

Find (line ~257-262):
```css
.composer-shell {
  min-height: calc(100dvh - 158px);
  display: flex;
  flex-direction: column;
  padding: 18px;
  border-radius: 24px;
}
```

Replace with:
```css
.composer-shell {
  display: flex;
  flex-direction: column;
  padding: 18px;
  border-radius: 24px;
}
```

**Step 3: Replace support-shell/support-card styles with preview-sidebar**

Find the `.support-shell` block (line ~550-554):
```css
.support-shell {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
```

Replace with:
```css
.preview-sidebar {
  position: sticky;
  top: 14px;
  align-self: start;
}
```

Keep `.support-card` styles (line ~556-559) since the preview card still uses that class. But remove `.support-copy` (line ~561-563), `.support-actions` (line ~592-597), `.spec-grid` through `.spec-item strong` (line ~565-590), `.template-details` through `.details-line` (line ~599-628) — these are dead after restructuring. Actually, the spec-grid and template-details will be reused inside the template strip `<details>`, so keep them.

Remove only:
- `.support-actions` (buttons move to toolbar)
- `.support-copy` that was used as sidebar card description

**Step 4: Add skeleton chips styles**

After the hint-row styles (~line 416), add:

```css
.skeleton-chips {
  margin-top: 10px;
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: thin;
}

.skeleton-chip {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.9);
  color: var(--ink);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: transform 0.2s, border-color 0.2s, background 0.2s, box-shadow 0.2s;
}

.skeleton-chip:hover {
  transform: translateY(-1px);
  border-color: var(--border-strong);
  box-shadow: var(--shadow-sm);
}

.skeleton-chip.active {
  border-color: var(--border-strong);
  background: rgba(239, 246, 255, 0.96);
  color: var(--primary);
}
```

**Step 5: Add mobile tab bar styles**

After the skeleton chip styles, add:

```css
.mobile-tab-bar {
  display: none;
}

.tab-panel-edit,
.tab-panel-preview {
  display: block;
}
```

**Step 6: Add template specs details styles**

After the template-strip-row styles (line ~297-303), add:

```css
.strip-specs-details {
  margin-top: 10px;
  border-top: 1px solid var(--border);
  padding-top: 10px;
}

.strip-specs-details summary {
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  color: var(--primary);
  list-style: none;
}

.strip-specs-details summary::-webkit-details-marker {
  display: none;
}

.strip-specs-body {
  margin-top: 10px;
}
```

**Step 7: Rewrite the tablet breakpoint (max-width: 1180px)**

Find the entire `@media (max-width: 1180px)` block (line ~1013-1031):
```css
@media (max-width: 1180px) {
  .workspace-shell {
    grid-template-columns: 1fr;
  }
  .composer-shell {
    min-height: auto;
  }
  .support-shell {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
  .preview-card {
    grid-column: 1 / -1;
  }
}
```

Replace with:
```css
@media (max-width: 1179px) {
  .workspace-shell {
    grid-template-columns: minmax(0, 1fr) 300px;
  }
}
```

**Step 8: Rewrite the mobile breakpoint (max-width: 767px)**

Find the entire `@media (max-width: 767px)` block (line ~1033-1175). Replace it with:

```css
@media (max-width: 767px) {
  .app-shell {
    width: min(100vw - 16px, 100%);
    padding: 8px 0 16px;
  }

  .navbar,
  .composer-shell,
  .support-card,
  .footer-simple {
    border-radius: 18px;
  }

  .navbar {
    height: 48px;
    padding: 0 14px;
  }

  .logo {
    width: 28px;
    height: 28px;
    border-radius: 8px;
  }

  .navbar-title {
    font-size: 14px;
  }

  .hero-section {
    padding: 10px 14px 8px;
    gap: 4px;
  }

  .hero-title {
    font-size: 1.3rem;
  }

  .hero-subtitle {
    font-size: 12px;
  }

  .hero-badges {
    gap: 6px;
  }

  .hero-badge {
    font-size: 11px;
    padding: 3px 9px;
  }

  /* Single column on mobile */
  .workspace-shell {
    grid-template-columns: 1fr;
  }

  .composer-shell {
    padding: 14px;
  }

  .composer-topbar,
  .composer-toolbar,
  .composer-footer,
  .support-card-header {
    flex-direction: column;
    align-items: stretch;
  }

  .composer-heading h2,
  .support-card-header h3 {
    font-size: 20px;
  }

  .composer-heading p,
  .support-copy {
    font-size: 12px;
  }

  .composer-meta {
    justify-content: flex-start;
  }

  .toolbar-group {
    width: 100%;
  }

  .action-btn,
  .primary-cta,
  .secondary-cta {
    width: 100%;
  }

  .content-textarea {
    min-height: 260px;
  }

  .primary-actions {
    width: 100%;
    grid-template-columns: 1fr;
  }

  .spec-grid {
    grid-template-columns: 1fr 1fr;
  }

  .preview-paper {
    min-height: 320px;
    padding: 26px 18px 46px;
  }

  /* Mobile tab bar */
  .mobile-tab-bar {
    display: flex;
    gap: 0;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 4px;
    margin-bottom: 12px;
  }

  .mobile-tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px 0;
    border: none;
    border-radius: 10px;
    background: transparent;
    color: var(--ink-muted);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: color 0.2s, background 0.2s;
  }

  .mobile-tab.active {
    background: var(--primary);
    color: var(--surface-strong);
  }

  .mobile-tab:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  /* Tab panel visibility */
  .tab-panel-edit.hidden,
  .tab-panel-preview.hidden {
    display: none;
  }

  /* Preview sidebar becomes block on mobile */
  .preview-sidebar {
    position: static;
  }
}
```

**Step 9: Run format check**

Run: `npx prettier --write "src/styles/app.css"`
Expected: File formatted

**Step 10: Commit**

```bash
git add src/styles/app.css
git commit -m "feat(css): rewrite layout — sticky preview sidebar, skeleton chips, mobile tabs"
```

---

## Task 3: Update TemplateStrip to accept children (specs details)

**Files:**
- Modify: `src/components/TemplateStrip/TemplateStrip.tsx`
- Modify: `src/components/TemplateStrip/TemplateStrip.css`

**Step 1: Add children prop to TemplateStrip**

In `TemplateStrip.tsx`, change the interface (line ~43-47):

```typescript
interface TemplateStripProps {
  currentTemplate: TemplateName;
  onSelect: (templateId: TemplateName) => void;
  onOpenSettings: () => void;
  children?: React.ReactNode;
}
```

Update the function signature and add children below the strip:

```typescript
export function TemplateStrip({ currentTemplate, onSelect, onOpenSettings, children }: TemplateStripProps) {
```

Add `{children}` after the closing `</div>` of `.template-strip` (the flex row), but still inside the component return. Wrap it:

```tsx
  return (
    <>
      <div className="template-strip">
        {/* existing cards + settings button */}
      </div>
      {children}
    </>
  );
```

**Step 2: Commit**

```bash
git add src/components/TemplateStrip/TemplateStrip.tsx
git commit -m "feat(TemplateStrip): accept children prop for inline specs details"
```

---

## Task 4: Restructure App.tsx — the main layout change

This is the core task. It restructures the JSX to match the new layout.

**Files:**
- Modify: `src/App.tsx`

**Step 1: Add mobile tab state**

Near the top of `AppContent()` (after line ~458 `toastTimerRef`), add:

```typescript
const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
```

**Step 2: Restructure the main JSX return**

Replace the entire `<main>` through `</main>` section (lines ~702-990). The new structure:

```tsx
      <main id="main-content" className="workspace-shell">
        {/* === Mobile Tab Bar === */}
        <div className="mobile-tab-bar" role="tablist" aria-label={language === 'cn' ? '编辑与预览' : 'Edit and preview'}>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'edit'}
            aria-controls="panel-edit"
            className={`mobile-tab ${activeTab === 'edit' ? 'active' : ''}`}
            onClick={() => setActiveTab('edit')}
          >
            {t.tabs.edit}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'preview'}
            aria-controls="panel-preview"
            className={`mobile-tab ${activeTab === 'preview' ? 'active' : ''}`}
            onClick={() => setActiveTab('preview')}
          >
            {t.tabs.preview}
          </button>
        </div>

        {/* === Composer (Edit panel) === */}
        <section
          id="panel-edit"
          role="tabpanel"
          aria-labelledby="tab-edit"
          className={`composer-shell tab-panel-edit ${activeTab !== 'edit' ? 'hidden' : ''}`}
        >
          <div className="composer-topbar">
            <div className="composer-heading">
              <h2>{copy.editorTitle}</h2>
              <p>{copy.editorDescription}</p>
            </div>
            <div className="composer-meta">
              <span className="meta-chip">{templateInsight.standard}</span>
              <span className="meta-chip">{copy.localLabel}</span>
            </div>
          </div>

          <div className="template-strip-row">
            <TemplateStrip
              currentTemplate={template}
              onSelect={setTemplate}
              onOpenSettings={() => setIsTemplateGalleryOpen(true)}
            >
              <details className="strip-specs-details">
                <summary>{copy.detailsSummary}</summary>
                <div className="strip-specs-body">
                  <div className="spec-grid">
                    <div className="spec-item">
                      <span>{copy.bodyLabel}</span>
                      <strong>{currentTemplate.specs.bodyFont}</strong>
                    </div>
                    <div className="spec-item">
                      <span>{copy.headingLabel}</span>
                      <strong>{currentTemplate.specs.headingFont}</strong>
                    </div>
                    <div className="spec-item">
                      <span>{copy.spacingLabel}</span>
                      <strong>{currentTemplate.specs.lineSpacing}</strong>
                    </div>
                    <div className="spec-item">
                      <span>{copy.pageNumberLabel}</span>
                      <strong>{pageNumberSample}</strong>
                    </div>
                  </div>
                  <p style={{ marginTop: 10, fontSize: 13, color: 'var(--ink-muted)' }}>
                    {templateInsight.promise[language]}
                  </p>
                </div>
              </details>
            </TemplateStrip>
          </div>

          <div className="composer-toolbar">
            <div className="toolbar-group">
              <div className="paste-mode">
                <label htmlFor="paste-mode">{t.input.pasteModeLabel}</label>
                <select
                  id="paste-mode"
                  value={pasteMode}
                  onChange={(e) => {
                    const nextMode = e.target.value as PasteMode;
                    setPasteMode(nextMode);
                    savePasteMode(nextMode);
                  }}
                >
                  <option value="auto">{t.input.pasteModeAuto}</option>
                  <option value="plain">{t.input.pasteModePlain}</option>
                </select>
              </div>
              <TextProcessingMenu
                text={text}
                onTextChange={handleTextProcessingChange}
                disabled={!text.trim()}
                onNotify={showToast}
              />
            </div>
            <div className="toolbar-group">
              <button className="action-btn" onClick={() => setIsSettingsOpen(true)} type="button">
                {copy.styleLabel}
              </button>
              <button className="action-btn" onClick={() => setIsTemplateGalleryOpen(true)} type="button">
                {copy.templatesLabel}
              </button>
              <button className="action-btn" onClick={handleLoadExample} type="button">
                {t.buttons.example}
              </button>
              <button
                className="action-btn action-btn-secondary"
                onClick={handleClear}
                type="button"
                disabled={!text.trim()}
              >
                {t.buttons.clear}
              </button>
            </div>
          </div>

          <MarkdownEditor
            value={text}
            onChange={handleTextChange}
            onPaste={handlePaste}
            placeholder={t.input.placeholder}
          />

          {showHeadingHint && (
            <div className="hint-row">
              <span>{t.hints.noHeadings}</span>
              <button
                type="button"
                className="hint-close"
                onClick={() => setShowHeadingHint(false)}
                aria-label={t.hints.closeHint}
              >
                ×
              </button>
            </div>
          )}

          {showEscapedLatexHint && (
            <div className="hint-row">
              <span>{t.hints.escapedLatex}</span>
              <button type="button" className="fix-btn" onClick={handleFixEscapedLatex}>
                {t.hints.fixEscapedLatex}
              </button>
              <button
                type="button"
                className="hint-close"
                onClick={() => setShowEscapedLatexHint(false)}
                aria-label={t.hints.closeHint}
              >
                ×
              </button>
            </div>
          )}

          {showPasteUndoHint && (
            <div className="hint-row">
              <span>{t.hints.pasteConverted}</span>
              <button type="button" className="fix-btn" onClick={handleUndoPaste}>
                {t.hints.undoPaste}
              </button>
              <button
                type="button"
                className="hint-close"
                onClick={() => {
                  setShowPasteUndoHint(false);
                  setPasteUndoState(null);
                }}
                aria-label={t.hints.closeHint}
              >
                ×
              </button>
            </div>
          )}

          {error && (
            <div className="error-msg" role="alert">
              {error}
            </div>
          )}

          {/* Skeleton chips */}
          <div
            className="skeleton-chips"
            role="radiogroup"
            aria-label={language === 'cn' ? '文稿骨架' : 'Document skeletons'}
          >
            {scenarioPresets.map((scenario) => (
              <button
                key={scenario.id}
                type="button"
                role="radio"
                aria-checked={selectedScenario?.id === scenario.id}
                className={`skeleton-chip ${selectedScenario?.id === scenario.id ? 'active' : ''}`}
                onClick={() => setSelectedScenarioId(scenario.id)}
                title={scenario.description}
              >
                {scenario.title}
              </button>
            ))}
          </div>

          <div className="composer-footer">
            <div className="filename-field">
              <label htmlFor="filename">{t.filename.label}</label>
              <div className="filename-input-wrapper">
                <input
                  type="text"
                  id="filename"
                  className="filename-input"
                  value={customFilename || detectedFilename}
                  onChange={(e) => setCustomFilename(e.target.value)}
                  placeholder={t.filename.placeholder}
                  autoComplete="off"
                />
                <span className="filename-ext">.docx</span>
                {customFilename && (
                  <button
                    type="button"
                    className="filename-reset"
                    onClick={() => setCustomFilename('')}
                    title={t.filename.reset}
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            <div className="primary-actions">
              <button
                type="button"
                className="secondary-cta"
                onClick={() => selectedScenario && applyScenario(selectedScenario)}
              >
                {copy.skeletonLabel}
              </button>
              <button
                type="button"
                className="primary-cta"
                onClick={handleGenerate}
                disabled={!text.trim() || isGenerating}
              >
                {isGenerating ? copy.generatingLabel : copy.generateLabel}
              </button>
            </div>
          </div>
        </section>

        {/* === Preview Sidebar === */}
        <aside
          id="panel-preview"
          role="tabpanel"
          aria-labelledby="tab-preview"
          className={`preview-sidebar tab-panel-preview ${activeTab !== 'preview' ? 'hidden' : ''}`}
        >
          <section className="support-card preview-card">
            <div className="support-card-header">
              <div>
                <h3>{copy.previewTitle}</h3>
              </div>
              <span className="meta-chip strong">
                {formatDisplayName(currentTemplate.name, currentTemplate.nameEn, language)}
              </span>
            </div>
            <p className="support-copy">
              {text.trim() ? copy.previewDescription : copy.previewEmpty}
            </p>
            <div className="preview-paper-shell">
              <div className="preview-paper" style={{ lineHeight: previewLineHeight }}>
                {previewBlocks.map((block, index) => (
                  <div
                    key={`${block.type}-${index}`}
                    className={`preview-block preview-${block.type}`}
                    style={getPreviewStyle(styles[block.type])}
                  >
                    {block.type === 'listItem' ? <span className="preview-bullet">•</span> : null}
                    <span>{block.text}</span>
                  </div>
                ))}
                <div className="preview-footer" style={getPreviewStyle(styles.pageFooter)}>
                  {pageNumberSample}
                </div>
              </div>
            </div>
          </section>
        </aside>
      </main>
```

Key changes from current code:
- Entire `<aside class="support-shell">` with 3 cards is removed
- Preview card moves into `<aside class="preview-sidebar">` as direct grid child
- Template specs card content → `<details>` children of `<TemplateStrip>`
- Scenario cards → `.skeleton-chips` horizontal row inside composer
- Mobile tab bar added before composer
- Tab panel classes added for CSS visibility toggling
- "全部模板" and "自定义样式" buttons moved into `composer-toolbar`
- `autoComplete="off"` added to filename input

**Step 3: Remove dead PAGE_COPY keys**

Remove from `PAGE_COPY` (both cn and en):
- `currentTemplateTitle` — no longer has its own card header
- `currentTemplateDescription` — folded into details
- `quickStartTitle` — skeletons are now chips, no card header
- `quickStartDescription` — same

Keep: `detailsSummary`, `previewTitle`, `previewDescription`, `previewEmpty`, all spec labels, `skeletonLabel`, `generateLabel`, etc.

**Step 4: Remove dead TEMPLATE_INSIGHTS sidebar rendering code**

The `templateInsight.audience` and `templateInsight.standard` sidebar card rendering is removed. Keep the `TEMPLATE_INSIGHTS` object itself since `templateInsight.standard` is still used in `composer-meta` chips and `templateInsight.promise` is used in the details.

**Step 5: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 6: Run format + lint**

Run: `npm run format && npm run lint:fix`
Expected: PASS

**Step 7: Commit**

```bash
git add src/App.tsx
git commit -m "feat: restructure layout — preview sidebar, skeleton chips, mobile tabs"
```

---

## Task 5: Run full checks and fix any issues

**Step 1: Run full check suite**

Run: `npm run check`
Expected: Format, lint, build, and tests all pass.

**Step 2: Fix any issues found**

If there are type errors, lint errors, or test failures, fix them.

**Step 3: Commit fixes if any**

```bash
git commit -m "fix: resolve check issues from layout restructure"
```

---

## Task 6: Visual verification with Playwright

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Screenshot desktop (1280x800)**

Navigate to `http://localhost:5173/`, take full-page screenshot.
Verify: 2-column layout with sticky preview sidebar on right.

**Step 3: Screenshot tablet (1024x768)**

Resize to 1024x768, take full-page screenshot.
Verify: 2-column layout with narrower (300px) preview sidebar.

**Step 4: Screenshot tablet portrait (768x1024)**

Resize to 768x1024, take full-page screenshot.
Verify: 2-column layout still maintained at 768px.

**Step 5: Screenshot mobile (375x812)**

Resize to 375x812, take full-page screenshot.
Verify: Tab bar visible, edit tab active, single column, no CSS order weirdness.

**Step 6: Screenshot mobile preview tab**

Click the preview tab, take screenshot.
Verify: Preview panel shown, editor hidden.

**Step 7: Fix any visual issues found**

Adjust CSS as needed for spacing, sizing, alignment.

**Step 8: Final commit**

```bash
git commit -m "fix: visual polish from layout verification"
```

---

## Task 7: Bump version and final commit

**Step 1: Bump minor version in package.json**

This is a significant layout change — bump minor version (e.g., 1.19.1 → 1.20.0).

**Step 2: Run full checks one last time**

Run: `npm run check`
Expected: All pass.

**Step 3: Commit version bump**

```bash
git add package.json
git commit -m "chore: bump version to 1.20.0 for layout redesign"
```
