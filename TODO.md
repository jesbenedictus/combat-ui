# Combat UI Website Framework TODO

Priorities re-ordered to reflect what's now built and the natural next-step
sequence: finish the general-purpose surface (interactive components + data
visualization) before vertical-specific blocks (recruitment) and final
validation work (SEO docs, demo sites).

## Priority 1: Website Foundations

- [x] Add `src/styles/website.css` and import it from `src/index.css`.
- [x] Add website-scale spacing tokens for compact, normal, spacious, and hero sections.
- [x] Add content width tokens for narrow prose, standard containers, wide containers, and full-bleed sections.
- [x] Add editorial typography tokens for display headings, lead text, eyebrow/kicker text, captions, and metadata.
- [x] Add foundational website classes: `cui-site`, `cui-container`, `cui-container-narrow`, `cui-container-wide`, `cui-flow`, and `cui-prose`.
- [x] Add section variants: `cui-section`, `cui-section-muted`, `cui-section-inverse`, and `cui-section-accent`.
- [x] Add skip-link styles and document the expected landmark structure for SEO and accessibility.

## Priority 2: High-Design Page Sections

- [x] Add hero patterns: `cui-hero`, `cui-hero-media`, `cui-hero-split`, and `cui-hero-campaign`.
- [x] Add page intro patterns for landing pages, case pages, vacancy pages, and campaign pages.
- [x] Add content grids: feature grid, case grid, card grid, logo strip, and stats grid.
- [x] Add quote and testimonial blocks.
- [x] Add CTA sections: simple CTA, split CTA, full-bleed CTA, and sticky CTA.
- [x] Add image/media blocks: full-bleed media, figure with caption, media card, and overlay card.
- [ ] Add visual rhythm examples for agency, recruitment, and campaign-style pages.

## Priority 3: Interactive Components

- [x] Add `cui-modal` over native `<dialog>` with `data-cui-modal-target` triggers and `data-cui-modal-close` actions.
- [x] Add `.cui-alert` light-DOM classes (variants, tones, dismiss).
- [x] Add floating notifications: `cui-toast-region` + programmatic `toast()` function with sugar variants and a handle API.
- [x] Add `cui-field` and `cui-form` with native-validity-based validation, async validators, server errors, and slot-based i18n (`error-<key>` slots + `cui-field-invalid` event).
- [x] Add `cui-tree` with drag-and-drop reordering, keyboard navigation, and a cancelable context-menu hook.
- [x] Add `cui-reveal` for content reveal driven by scroll stages.
- [x] Add `cui-scroll-stage` sticky 3D track that publishes focus/offset as CSS custom properties.
- [ ] Add `cui-accordion` for FAQ and disclosure groups (single-open and multi-open modes).
- [x] Add `cui-disclosure` for generic toggleable content (lightweight wrapper around `<details>`).
- [ ] Add `cui-tooltip` for inline contextual labels (positioning, focus / hover triggers, keyboard ESC).
- [ ] Add `cui-popover` for richer floating content (delegates positioning anchor logic; pairs with tooltip).
- [ ] Evaluate whether `cui-carousel` is necessary; add only if reference demos need it.

## Priority 4: Data Visualization

_New priority. Marketing, agency, and case-study pages need to surface numbers; dashboards and recruitment metrics build on the same primitives. Keep the two-tier API: CSS-only classes first, optional custom-element upgrade for interactive / animated variants._

- [ ] Add data-viz tokens: `--cui-chart-track`, `--cui-chart-fill`, `--cui-chart-accent-1..n`, sizing scale, grid color, label color, animation duration.
- [ ] Add `.cui-badge` light-DOM class with `data-variant="info|success|warning|danger|neutral"` and a `data-tone` mirror of `.cui-alert` for filled / solid.
- [ ] Add `.cui-progress` and `.cui-progress-bar` light-DOM classes (linear, segmented, with optional label slot).
- [ ] Add `.cui-meter` light-DOM class mirroring the native `<meter>` thresholds (low / optimum / high) with shared accent tokens.
- [ ] Add `cui-progress` component for animated, value-driven progress (`value`, `max`, `indeterminate`).
- [ ] Add `cui-sparkline` component — small inline SVG trend chart from a `data-values="…"` attribute.
- [ ] Add `cui-bar-chart` light-DOM block (HTML data rows → CSS bars; works without JS, accessible by default).
- [ ] Add `cui-ring-chart` / donut for single-value progress and multi-segment ratios (CSS `conic-gradient` first; SVG fallback if needed).
- [ ] Add big-number / delta block (`.cui-stat-delta` extension to `cui-stat`) for "X% growth" call-outs.
- [ ] Add comparison / before-after block (split image or two-column metric).
- [ ] Document recommended JSON shapes so CMS content can drive each chart without JS.

## Priority 5: Navigation System

- [x] Mobile responsive collapse panel via `expanded` attribute on `cui-navbar`.
- [x] Active-link styling via `aria-current="page"`.
- [x] Click-outside and ESC close for nested dropdowns.
- [ ] Extend `cui-navbar` with mega-menu support (multi-column dropdown panel with section headings).
- [ ] Add dropdown alignment options: start, center, end, and full-width.
- [ ] Add a true drawer mode for the mobile navbar (off-canvas, focus trap — leverage the modal primitive).
- [ ] Add active-section styling pattern driven by scroll position (pair with `cui-scroll-stage` or an `IntersectionObserver` helper).
- [ ] Improve nested-dropdown keyboard behavior (arrow-key item traversal, Home / End, type-ahead).
- [ ] Add navbar example variants for agency sites, recruitment sites, and campaign landing pages.
- [ ] Add sidebar navigation component (collapsible groups, active state, sticky positioning).

## Priority 6: Motion System

_Several components (reveal, scroll-stage, modal, toast, navbar, nav dropdowns) already include reduced-motion guards. The remaining work is to unify ad-hoc transitions behind shared tokens and audit coverage._

- [x] `cui-reveal` utility (entry animations driven by ancestor stage focus).
- [x] `cui-scroll-stage` publishes focus, offset, active state as CSS custom properties.
- [x] Reduced-motion guards in modal, toast, dialog backdrop, reveal, scroll-stage, navbar, and nav dropdowns.
- [ ] Add global motion tokens: `--cui-motion-duration-*`, `--cui-motion-easing-*`, `--cui-motion-distance-*`, `--cui-motion-stagger-*`.
- [ ] Migrate existing ad-hoc transition durations / easings in component CSS to the shared tokens.
- [ ] Audit every motion-using component for a `prefers-reduced-motion: reduce` fallback.
- [ ] Add animation examples for dropdowns, heroes, cards, and section reveals tied to the new tokens.

## Priority 7: Recruitment Site Blocks

- [ ] Add `cui-vacancy-card`.
- [ ] Add `cui-vacancy-list`.
- [ ] Add team / category filter layout patterns.
- [ ] Add working-at / story section patterns.
- [ ] Add `cui-value-card` and values grid.
- [ ] Add application CTA blocks (depends on Priority 2 CTA sections).
- [ ] Add external job board CTA blocks.
- [ ] Add location / contact cards.

## Priority 8: SEO, Metadata, And CMS Friendliness

- [ ] Add examples for Organization JSON-LD.
- [ ] Add examples for JobPosting JSON-LD.
- [ ] Add examples for FAQPage JSON-LD.
- [ ] Add Open Graph and Twitter card metadata examples.
- [ ] Add sitemap and robots guidance.
- [ ] Document Web Component SEO rules: light-DOM content, semantic slots, real URLs, and server-rendered markup.
- [ ] Keep class-based block APIs usable from CMS-generated HTML.

## Priority 9: Demo Sites

- [ ] Create `examples/agency.html`.
- [ ] Create `examples/recruitment.html`.
- [ ] Create `examples/campaign.html`.
- [ ] Create `examples/dashboard.html` to exercise the data-visualization surface.
- [ ] Use the demos to validate real website composition, responsive behavior, accessibility, and SEO-friendly markup.
- [ ] Compare demos against reference-site needs and feed missing patterns back into earlier priorities.
