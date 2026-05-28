# Combat UI — Agent Reference

This document is generated from JSDoc and CSSDoc annotations in the Combat
UI source. Use it as context when building UIs with the framework — every
public custom element, light-DOM block class, and design token is listed
below with its complete API.

## What is Combat UI?

Combat UI is a small, opinionated component framework targeting modern
baseline web standards (Baseline 2025+). It ships two complementary
surfaces:

- **Custom elements** (`<cui-*>`) for behavior — focus management,
  validation, animations, drag-and-drop, theme switching. Each element
  manages state and ARIA wiring; visual content stays in light DOM via
  slots.
- **Light-DOM blocks** (`.cui-*` classes) for layout, typography, and
  patterns — alerts, cards, sections, grids, prose. Pure CSS, no JS, fully
  SEO-visible and customizable via design tokens.

Both surfaces are framework-agnostic — they work in any HTML page (static,
SSR, or rendered by React / Vue / Svelte / etc.).

## Loading the bundle

Combat UI ships as a single ES-module JS bundle plus a single CSS file. Drop
them into any HTML page:

```html
<link rel="stylesheet" href="./combat-ui.css">
<script type="module" src="./combat-ui.js"></script>
```
