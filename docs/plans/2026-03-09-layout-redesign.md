# Layout Redesign — Preview Sidebar + Tab Mobile

## Problem

Three sidebar cards (template specs, quick skeletons, preview) stacked vertically push the preview panel to the bottom-right where no left-side content exists. The preview — the most important real-time feedback element — is the least visible.

Secondary issues: `min-height: calc(100dvh - 158px)` wastes viewport space, mobile CSS order rearrangement buries controls, 1180px breakpoint collapses the 2-column layout too aggressively.

## Design

### Desktop (≥1180px) — Two columns, sticky preview

```
[Navbar]
[Hero (compact)]
┌─────────────────────────────┬──────────────────┐
│ Composer                    │ Preview (sticky) │
│  ├ Topbar + meta chips      │  ├ Header        │
│  ├ Template strip           │  ├ Paper preview  │
│  │  └ <details> specs       │  └ Page number    │
│  ├ Toolbar (paste/process)  │                   │
│  ├ Editor (textarea)        │                   │
│  ├ Hints                    │                   │
│  ├ Footer (filename+CTA)   │                   │
│  └ Skeleton chips (horiz)   │                   │
└─────────────────────────────┴──────────────────┘
[Footer]
```

- Preview is the ONLY sidebar element, `position: sticky; top: 14px`
- Grid: `grid-template-columns: minmax(0, 1fr) 360px`
- Remove composer `min-height: calc(100dvh - 158px)`

### Tablet (768px–1179px) — Two columns, narrower preview

```
grid-template-columns: minmax(0, 1fr) 300px
```

- Preview stays as sticky sidebar at 300px
- Preview paper font sizes scale down proportionally
- No more 1180px single-column collapse

### Mobile (<768px) — Tab switching (Edit | Preview)

```
[Navbar]
[Hero (minimal)]
┌──────────────────────────────┐
│ [编辑] [预览]    ← tab bar   │
├──────────────────────────────┤
│ Active tab content           │
└──────────────────────────────┘
[Footer]
```

- Tab bar sticky at top of composer
- Edit tab (default): template strip, toolbar, editor, hints, skeleton chips, filename + CTA
- Preview tab: paper preview
- Use `display: none` (not unmount) to preserve editor state
- Remove all CSS order rearrangement

## Component Changes

### Template specs → `<details>` inside template strip

Currently: independent sidebar card with spec-grid (body, heading, spacing, page number), action buttons, and expandable details.

After: a `<details>` element below the template-cards row inside `.template-strip-row`. Contains the spec-grid and template details. The "全部模板" and "自定义样式" buttons move into the toolbar or template strip.

### Quick skeletons → horizontal chip group below editor

Currently: independent sidebar card with vertical scenario-card buttons.

After: a horizontal scrollable row of pill/chip buttons below the editor hints area. Each chip shows the scenario title. Clicking a chip selects it (radio behavior preserved). The "插入完整骨架" CTA remains in the composer footer.

### Mobile tab component

New component: `MobileTabBar` (or inline in App.tsx).

- Two tabs: edit icon + label, preview icon + label
- State: `activeTab: 'edit' | 'preview'`
- Only renders on mobile (CSS `display: none` on ≥768px)
- Both tab panels always mounted, visibility toggled via CSS class

### Support shell removal

The `<aside class="support-shell">` wrapper with 3 cards is removed entirely. Preview moves directly into the workspace-shell grid as a sidebar cell. Template specs fold into template-strip-row. Skeleton chips become a new row in the composer.

## CSS Changes

### app.css

1. `.workspace-shell` grid: `minmax(0, 1.6fr) 400px` → `minmax(0, 1fr) 360px`
2. Remove `.composer-shell` `min-height: calc(100dvh - 158px)`
3. `.support-shell` styles → replace with `.preview-sidebar` (sticky, single card)
4. Add `.preview-sidebar { position: sticky; top: 14px; align-self: start; }`
5. Add `.skeleton-chips` horizontal layout styles
6. Add `.template-specs-details` collapsible styles
7. Add `.mobile-tab-bar` styles
8. `@media (max-width: 1180px)` → change to `@media (max-width: 767px)` for column collapse
9. Add `@media (min-width: 768px) and (max-width: 1179px)` for tablet (300px sidebar)
10. Remove all mobile CSS order rules
11. Add `@media (max-width: 767px)` tab switching styles

### Component CSS files

- `TemplateStrip.css`: add details/specs collapsible styles
- Remove support-card, support-shell, support-actions related styles from app.css (dead code after restructure)

## Files to Modify

1. `src/App.tsx` — restructure JSX layout, add tab state for mobile, move specs into template strip area, convert skeletons to horizontal chips
2. `src/styles/app.css` — grid changes, sticky preview, remove support-shell styles, add new component styles, rewrite responsive breakpoints
3. `src/components/TemplateStrip/TemplateStrip.tsx` — add `<details>` for template specs (passed as children or new props)
4. `src/components/TemplateStrip/TemplateStrip.css` — styles for specs details section

## Files NOT Modified

- `src/components/Editor/MarkdownEditor.tsx` — no changes
- `src/components/StyleSettings/` — no changes
- `src/components/TemplateGallery/` — no changes
- `src/components/LoadingOverlay/` — no changes
- `src/components/TextProcessingMenu/` — no changes
- All lib/, hooks/, contexts/ files — no changes

## Migration Notes

- No data model changes
- No new dependencies
- Preview block generation logic unchanged
- All state management unchanged
- Accessibility: tab bar needs `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`
