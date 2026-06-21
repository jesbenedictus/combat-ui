# Combat UI

Combat UI is a small web component and CSS framework for building responsive interfaces on modern Baseline browser standards. It combines tokenized CSS, layout primitives, and framework-agnostic custom elements. We strive for a dependency-free library, with the exception of the necessary development dependencies. It is based on our company's real-world use cases.

📚 **Full component reference, API, and live demos: [combat-marketing.github.io/combat-ui](https://combat-marketing.github.io/combat-ui)**

The package is currently in an early stage.

## What Is Included

- CSS reset, design tokens, layout primitives, and utility classes.
- Framework-agnostic custom elements (buttons, navigation, overlays, forms, calendar, map, and more).
- TypeScript source with generated declarations for package builds.
- A standalone bundle plus self-registering per-component entries.
- Vite-based library and docs builds.
- Stylelint and HTML lint checks for project conventions.

## Browser Target

Combat UI targets Baseline 2025 browsers with downstream support, as declared in `package.json`.

The CSS and components assume modern platform features such as custom elements, shadow DOM, CSS custom properties, CSS nesting, OKLCH colors, and `color-mix()`.

## Installation

This package is private right now, so install it from the repository or workspace where it is available.

```sh
npm install
```

## Importing Components

Combat UI works with or without a bundler. Custom elements **auto-register on import** — you never call `customElements.define()` yourself.

### Everything at once

```ts
import "@combat-ui/core";        // registers every element
import "@combat-ui/core/styles"; // design tokens, layout, utilities (load once)
```

Best for quick starts or apps that use many components. This is a single standalone file (`dist/combat-ui.js`).

### One component at a time

Every component is also published as its own self-registering entry, so you only ship what you use:

```ts
import "@combat-ui/core/button";        // registers <cui-button>
import "@combat-ui/core/cookie-banner"; // registers <cui-cookie-banner>
import "@combat-ui/core/styles";        // still load the stylesheet once
```

With a bundler this tree-shakes away every component you don't import. The same entry also re-exports the component's class and types:

```ts
import { CuiButton } from "@combat-ui/core/button";
```

The subpath is the component's folder name (e.g. `@combat-ui/core/theme-toggle`, `@combat-ui/core/day-planner`). See the [docs site](https://combat-marketing.github.io/combat-ui) for the full list.

### Without a bundler

The per-component files are plain ES modules — load them straight from wherever you host the package's `dist/`:

```html
<link rel="stylesheet" href="/vendor/combat-ui/dist/combat-ui.css">
<script type="module" src="/vendor/combat-ui/dist/button.js"></script>

<cui-button variant="primary">Primary action</cui-button>
```

To keep using bare specifiers without a bundler, add an import map (load the stylesheet with a plain `<link>` as above):

```html
<script type="importmap">
{
  "imports": {
    "@combat-ui/core/": "/vendor/combat-ui/dist/"
  }
}
</script>
<script type="module">
  import "@combat-ui/core/button.js";  // resolves to /vendor/combat-ui/dist/button.js
</script>
```

Each per-component file imports a small shared chunk (the element base class) from the same `dist/` folder, so keep the directory intact when you host it.

## Components

The following custom elements are available. See the [docs site](https://combat-marketing.github.io/combat-ui) for each element's slots, attributes, events, and CSS custom properties.

| | | |
| --- | --- | --- |
| `cui-article-filter` | `cui-calendar` | `cui-tree` |
| `cui-button` | `cui-day-planner` | `cui-map` |
| `cui-cta` | `cui-field` | `cui-code` |
| `cui-hero` | `cui-form` | `cui-modal` |
| `cui-navbar` | `cui-tabs` | `cui-disclosure` |
| `cui-page-intro` | `cui-theme-toggle` | `cui-toast-region` |
| `cui-reveal` | `cui-scroll-stage` | `cui-cookie-banner` |

Exported helpers include `defineCombatUi()`, `getTheme()` / `setTheme()`, `toast()`, and `attachCuiParallax()`.

## Styling & Theming

Import the stylesheet once — it provides the design tokens every component reads, plus layout primitives (`cui-page`, `cui-stack`, `cui-cluster`, `cui-grid`, …) and utility classes:

```ts
import "@combat-ui/core/styles";
```

Combat UI uses CSS custom properties with the `--cui-` prefix. The active theme is controlled with `data-theme` on the root element:

```html
<html data-theme="dark">
```

Remove `data-theme` or call `setTheme("auto")` to return to system preference. Component-local properties use the `--_-` prefix internally; public customization points use `--cui-` names. The [Foundations](https://combat-marketing.github.io/combat-ui/foundations.html) and [Theming](https://combat-marketing.github.io/combat-ui/theming.html) pages cover tokens and customization in full.

## Development

```sh
npm run dev        # Vite dev server for the library
npm run dev:docs   # docs site from the docs/ directory
npm run build      # clean, generate entries, typecheck, library + docs build
npm run check      # TypeScript, CSS, and HTML checks
```

When you add a component, run `npm run elements` to (re)generate the per-component entry files and subpath exports. It also runs as part of `npm run build`.

## Project Structure

```text
src/
  components/   # one folder per element (logic + scoped CSS)
  elements/     # generated self-registering entries (one per component)
  styles/       # tokens, reset, layout, utilities, light-DOM blocks
  internal/     # shared base element and helpers
docs/           # documentation site
examples/       # standalone usage examples
scripts/        # build/codegen scripts
```

## Build Output

The library build writes to `dist` (a standalone `combat-ui.js`, `combat-ui.css`, and per-component `dist/<name>.js` files). The docs build writes to `dist-docs`.

```sh
npm run build:lib
npm run build:docs
```

## License

MIT
