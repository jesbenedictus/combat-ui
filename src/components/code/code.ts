import styles from "./code.css?inline";
import { CombatElement, cssStyleSheet } from "../../internal/base-element";

const javascriptKeywords = new Set([
  "await",
  "async",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "default",
  "else",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "from",
  "function",
  "if",
  "import",
  "let",
  "new",
  "null",
  "return",
  "static",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "undefined",
  "while",
]);

export class CuiCode extends CombatElement {
  static override styles = [cssStyleSheet(styles)];
  static readonly tagName = "cui-code";

  private _source: string = "";

  connectedCallback(): void {
    this.adoptStyles();

    if (!this.shadowRoot?.querySelector(".frame")) {
      this.appendShadowTemplate(this.template());

      this.shadowRoot?.querySelector(".copy")?.addEventListener("click", () => this.copyToClipboard());
    }

    this._source = normalizeSource(this.readSource());
    this.render();
  }

  private readSource(): string {
    const script = this.querySelector<HTMLScriptElement>(":scope > script");

    if (script) {
      return script.textContent ?? "";
    }

    return this.textContent ?? "";
  }

  attributeChangedCallback(): void {
    this.render();
  }

  private template(): string {
    return `
    <div class="frame" part="frame">
      <div class="header" part="header">
        <span class="language" part="language"></span>
        <button class="copy" part="copy" type="button">Copy</button>
      </div>
      <pre part="pre"><code part="code"></code></pre>
    </div>
    `;
  }

  private render(): void {
    const codeEl = this.shadowRoot?.querySelector("code");
    const languageEl = this.shadowRoot?.querySelector(".language");
    if (!codeEl || !languageEl) {
      return;
    }

    const syntax = this.getAttribute("language") ?? "text";
    languageEl.textContent = syntax;
    codeEl.innerHTML = highlight(this._source, syntax);
  }

  private async copyToClipboard(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this._source);
      const copyButton = this.shadowRoot?.querySelector(".copy") as HTMLButtonElement | null;
      if (copyButton) {
        copyButton.textContent = "Copied!";
        setTimeout(() => {
          copyButton.textContent = "Copy";
        }, 1200);
      }
    } catch (error) {
      console.error("Failed to copy text: ", error);
    }
  }
}

export function defineCuiCode(registry: CustomElementRegistry = customElements): void {
  if (!registry.get(CuiCode.tagName)) {
    registry.define(CuiCode.tagName, CuiCode);
  }
}

function normalizeSource(source: string): string {
  const lines = source.replace(/^\n/, "").replace(/\s+$/, "").split("\n");
  const indent = lines.filter(l =>l.trim()).reduce((smallestIndent, line) => {
      const currentIndent = line.match(/^\s*/)?.[0].length ?? 0;
      return Math.min(smallestIndent, currentIndent);
    }, Infinity);

    if (!Number.isFinite(indent) || indent === 0) {
      return lines.join("\n");
    }

    return lines.map(line => line.slice(indent)).join("\n");
}

function highlight(source: string, language: string): string {
  const normalizedLanguage = language.toLowerCase();

  if (["html", "markup", "xml"].includes(normalizedLanguage)) {
    return highlightHtml(source);
  }

  if (normalizedLanguage === "css") {
    return highlightCss(source);
  }

  if (["js", "javascript", "mjs"].includes(normalizedLanguage)) {
    return highlightJavascript(source);
  }

  return escapeHtml(source);
}

function highlightHtml(source: string): string {
  let html = "";
  let index = 0;
  const matcher = /<!--[\s\S]*?-->|<\/?[A-Za-z][^>]*?>/g;

  for (const match of source.matchAll(matcher)) {
    html += escapeHtml(source.slice(index, match.index));
    html += match[0].startsWith("<!--") ? token(match[0], "comment") : highlightHtmlTag(match[0]);
    index = match.index + match[0].length;
  }

  html += escapeHtml(source.slice(index));
  return html;
}

function highlightHtmlTag(tag: string): string {
  let html = "";
  let index = 0;
  const matcher = /(<\/?\s*)([A-Za-z][\w:-]*)|(\s+)([A-Za-z_:][\w:.-]*)(=)("[^"]*"|'[^']*'|[^\s>]+)|(\/?>)/g;

  for (const match of tag.matchAll(matcher)) {
    html += escapeHtml(tag.slice(index, match.index));

    if (match[2]) {
      html += token(match[1], "punctuation") + token(match[2], "tag");
    } else if (match[4]) {
      html += escapeHtml(match[3] ?? "") + token(match[4], "attr") + token(match[5], "operator") + token(match[6], "string");
    } else if (match[7]) {
      html += token(match[7], "punctuation");
    }

    index = match.index + match[0].length;
  }

  html += escapeHtml(tag.slice(index));
  return html;
}

function highlightCss(source: string): string {
  return highlightByPattern(source, /\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|@[A-Za-z-]+|--[\w-]+|#[\da-fA-F]{3,8}\b|\b\d+(?:\.\d+)?(?:rem|em|px|%|deg|vi|vb|s|ms)?\b|[A-Za-z-]+(?=\()|[A-Za-z-]+(?=\s*:)/g, (match, index) => {
    if (match.startsWith("/*")) {
      return "comment";
    }

    if (match.startsWith("\"") || match.startsWith("'")) {
      return "string";
    }

    if (match.startsWith("@")) {
      return "keyword";
    }

    if (match.startsWith("--")) {
      return "variable";
    }

    if (match.startsWith("#") || /^\d/.test(match)) {
      return "value";
    }

    if (source[index + match.length] === "(") {
      return "function";
    }

    return "property";
  });
}

function highlightJavascript(source: string): string {
  return highlightByPattern(source, /\/\/.*|\/\*[\s\S]*?\*\/|`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][\w$]*\b|[=+\-*/<>!]+/g, (match) => {
    if (match.startsWith("//") || match.startsWith("/*")) {
      return "comment";
    }

    if (match.startsWith("\"") || match.startsWith("'") || match.startsWith("`")) {
      return "string";
    }

    if (/^\d/.test(match)) {
      return "number";
    }

    if (javascriptKeywords.has(match)) {
      return "keyword";
    }

    if (/^[=+\-*/<>!]+$/.test(match)) {
      return "operator";
    }

    return "function";
  });
}

function highlightByPattern(source: string, pattern: RegExp, classify: (match: string, index: number) => string): string {
  let html = "";
  let index = 0;

  for (const match of source.matchAll(pattern)) {
    html += escapeHtml(source.slice(index, match.index));
    html += token(match[0], classify(match[0], match.index));
    index = match.index + match[0].length;
  }

  html += escapeHtml(source.slice(index));
  return html;
}

function token(value: any, type: string): string {
  return `<span class="token-${type}">${escapeHtml(value)}</span>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}