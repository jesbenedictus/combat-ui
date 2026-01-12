import compat from "eslint-plugin-compat";
import baseline from "eslint-plugin-baseline-js";
import html from "@html-eslint/eslint-plugin";
import htmlParser from "@html-eslint/parser";

export default [
  {
    files: ["src/**/*.js", "examples/**/*.js", "scripts/**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module"
    },
    plugins: {
      compat,
      "baseline-js": baseline
    },
    rules: {
      "compat/compat": "error",
      "baseline-js/use-baseline": ["error", { available: 2025 }]
    }
  },
  {
    files: ["examples/**/*.html", "docs/**/*.html"],
    languageOptions: {
      parser: htmlParser
    },
    plugins: {
      "@html-eslint": html
    },
    rules: {
      "@html-eslint/require-lang": "error",
      "@html-eslint/require-title": "error",
      "@html-eslint/no-duplicate-id": "error",
      "@html-eslint/require-meta-charset": "error",
      "@html-eslint/require-meta-viewport": "error",
      "@html-eslint/use-baseline": ["error", { available: 2025 }]
    }
  }
];
