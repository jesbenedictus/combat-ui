// @ts-check

/**
 * CUI Blocks manifest — schema 1.1.0.
 * Describes the light-DOM CSS "blocks" (BEM-ish class families) and the
 * design-token groups they consume. Companion to the Custom Elements
 * Manifest in dist/custom-elements.json.
 *
 * @typedef {object} BlocksManifest
 * @property {string} schemaVersion         Manifest schema version (expected "1.1.0").
 * @property {Block[]} blocks               One entry per CSS block / sub-element.
 * @property {TokenGroup[]} tokenGroups     Design-token groups (typography, color, spacing, etc.).
 */

/**
 * Parses CSSDoc comment blocks from CSS source. A doc block  is a
 * `/** ... *\/` comment immediately preceding a selector and containing
 * an `@block <name>` tag. Comment blocks without an `@block` tag are ignored.
 *
 * Supported tags: `@block`, `@summary`, `@variant`, `@tone`, `@cssvar`, `@example`.
 * Unknown tags are ignored.
 *
 * @typedef {object} NamedItem
 * @property {string} name
 * @property {string} [description]
 *
 * @typedef {object} Block
 * @property {string} name
 * @property {string} selector
 * @property {string} [summary]
 * @property {string} [description]
 * @property {NamedItem[]} variants
 * @property {NamedItem[]} tones
 * @property {NamedItem[]} cssVars
 * @property {string[]} examples
 * @property {string} sourcePath
 * @property {number} sourceLine
 *
 * @typedef {object} TokenGroup
 * @property {string} name
 * @property {string} selector
 * @property {string} [summary]
 * @property {string} [description]
 * @property {NamedItem[]} tokens
 * @property {string[]} examples
 * @property {string} sourcePath
 * @property {number} sourceLine
 */
const DOC_BLOCK = /\/\*\*([\s\S]*?)\*\/[ \t\r\n]*([^{]+?)\{/g;
const TAG_LINE = /^@([\w-]+)(?:[ \t]+(.*))?$/;
const SEPARATOR = / [—-] /;

/**
 * Parses CSSDoc comment blocks from CSS source. A doc block  is a
 * `/** ... *\/` comment immediately preceding a selector and containing
 * an `@block <name>` tag. Comment blocks without an `@block` tag are ignored.
 * @param {string} cssText
 * @param {string} sourcePath
 * @returns {{ blocks: Block[]; tokenGroups: TokenGroup[] }}
 */
export function parseCssDoc(cssText, sourcePath) {
  const text = cssText.replace(/\r\n/g, "\n");
  /** @type {{ blocks: Block[]; tokenGroups: TokenGroup[] }} */
  const result = { blocks: [], tokenGroups: [] };
  for (const match of text.matchAll(DOC_BLOCK)) {
    const [, body, rawSelector] = match;
    const offset = match.index ?? 0;
    const sourceLine = countLinesUpTo(text, offset);
    const parsed = parseCommentBody(body);

    if (parsed.tags.block?.[0]?.trim()) {
      result.blocks.push(
        buildBlock(parsed, rawSelector, sourcePath, sourceLine),
      );
    } else if (parsed.tags["token-group"]?.[0]?.trim()) {
      result.tokenGroups.push(
        buildTokenGroup(parsed, rawSelector, sourcePath, sourceLine),
      );
    }
  }
  return result;
}

/**
 * Counts the number of lines in a string up to a given offset.
 * @param {string} text
 * @param {number} offset
 * @returns {number}
 */
function countLinesUpTo(text, offset) {
  let n = 1;
  for (let i = 0; i < offset; i++) {
    if (text.charCodeAt(i) === 10) n++;
  }
  return n;
}

/**
 * Parses the body of a CSSDoc comment block.
 * @param {string} body
 * @returns {{ description: string, tags: Record<string, string[]> }}
 */
function parseCommentBody(body) {
  const lines = body.split("\n").map(stripCommentPrefix);
  while (lines.length && lines[0].trim() === "") lines.shift();
  while (lines.length && lines.at(-1)?.trim() === "") lines.pop();

  /** @type {string[]} */
  const description = [];
  /** @type {Record<string, string[]>} */
  const tags = Object.create(null);
  /** @type {string | null} */
  let currentTag = null;
  /** @type {string[]} */
  let currentLines = [];

  const flush = () => {
    if (currentTag === null) return;
    (tags[currentTag] ??= []).push(currentLines.join("\n"));
    currentTag = null;
    currentLines = [];
  };

  for (const line of lines) {
    const tagMatch = TAG_LINE.exec(line.trimStart());
    if (tagMatch) {
      flush();
      currentTag = tagMatch[1];
      currentLines = tagMatch[2] !== undefined ? [tagMatch[2]] : [];
    } else if (currentTag !== null) {
      currentLines.push(line);
    } else {
      description.push(line);
    }
  }
  flush();
  return { description: description.join("\n"), tags };
}

/**
 * Strips a single leading ` * ` (or `*` / `* `) from a comment line,
 * preserving any indentation that follows it so `@example` bodies keep
 * their relative layout.
 *
 * @param {string} line
 * @returns {string}
 */
function stripCommentPrefix(line) {
  const match = /^[ \t]*\*[ \t]?(.*)$/.exec(line);
  return match ? match[1] : line;
}

/**
 *
 * @param {{description: string, tags: Record<string, string[]>}} parsed
 * @param {string} rawSelector
 * @param {string} sourcePath
 * @param {number} sourceLine
 * @returns {Block}
 */
function buildBlock(parsed, rawSelector, sourcePath, sourceLine) {
  const { description, tags } = parsed;
  const name = (tags.block?.[0] ?? "").trim();
  const summary = tags.summary?.[0]?.replace(/\s+/g, " ").trim();
  const selector = rawSelector.replace(/\s+/g, " ").trim();

  /** @type {Block} */
  const block = {
    name,
    selector,
    variants: (tags.variant ?? []).flatMap(parseMultiNamed),
    tones: (tags.tone ?? []).flatMap(parseMultiNamed),
    cssVars: (tags.cssvar ?? [])
      .map(parseSingleNamed)
      .filter((item) => item.name.startsWith("--")),
    examples: (tags.example ?? []).map(normalizeExample),
    sourcePath,
    sourceLine,
  };
  if (summary) block.summary = summary;
  if (description) block.description = description;
  return block;
}

/**
 * @param {{ description: string; tags: Record<string, string[]> }} parsed
 * @param {string} rawSelector
 * @param {string} sourcePath
 * @param {number} sourceLine
 * @returns {TokenGroup}
 */
function buildTokenGroup(parsed, rawSelector, sourcePath, sourceLine) {
  const { description, tags } = parsed;
  const name = (tags["token-group"]?.[0] ?? "").trim();
  const summary = tags.summary?.[0]?.replace(/\s+/g, " ").trim();
  const selector = rawSelector.replace(/\s+/g, " ").trim();

  /** @type {TokenGroup} */
  const group = {
    name,
    selector,
    tokens: (tags.cssvar ?? [])
      .map(parseSingleNamed)
      .filter((item) => item.name.startsWith("--")),
    examples: (tags.example ?? []).map(normalizeExample),
    sourcePath,
    sourceLine,
  };
  if (summary) group.summary = summary;
  if (description) group.description = description;
  return group;
}

/**
 * Parsed `"name | name - description"` into multiple NamedItems.
 * @param {string} body
 * @returns {NamedItem[]}
 */
function parseMultiNamed(body) {
  const { namePart, description } = splitNameAndDescription(body);
  return namePart
    .split("|")
    .map((n) => n.trim())
    .filter(Boolean)
    .map((name) => (description ? { name, description } : { name }));
}

/**
 * Parses `"name - description"` into a single NamedItem.
 *
 * @param {string} body
 * @returns {NamedItem}
 */
function parseSingleNamed(body) {
  const { namePart, description } = splitNameAndDescription(body);
  const name = namePart.trim();
  return description ? { name, description } : { name };
}

/**
 * Splits a tag body at the first ` — ` / ` - ` separator on the first line,
 * then merges any continuation lines into the description.
 *
 * @param {string} body
 */
function splitNameAndDescription(body) {
  const newlineIdx = body.indexOf("\n");
  const firstLine = newlineIdx === -1 ? body : body.slice(0, newlineIdx);
  const continuation = newlineIdx === -1 ? "" : body.slice(newlineIdx + 1);

  const sepMatch = SEPARATOR.exec(firstLine);
  const namePart = sepMatch ? firstLine.slice(0, sepMatch.index) : firstLine;
  const inlineDesc = sepMatch
    ? firstLine.slice(sepMatch.index + sepMatch[0].length)
    : "";

  const description = [inlineDesc, continuation]
    .join("\n")
    .trim()
    .replace(/\s+/g, " ");
  return { namePart, description };
}

/**
 * Trims black padding lines from an `@example` body and de-indents by the
 * minimum common leading whitespace so HTML pastes look right.
 *
 * @param {string} body
 * @returns {string}
 */
function normalizeExample(body) {
  const lines = body.split("\n");
  while (lines.length && lines[0].trim() === "") lines.shift();
  while (lines.length && lines.at(-1)?.trim() === "") lines.pop();
  const indents = lines
    .filter((l) => l.trim() !== "")
    .map((l) => /^[ \t]*/.exec(l)?.[0].length ?? 0);
  const min = indents.length ? Math.min(...indents) : 0;
  return lines.map((l) => l.slice(min)).join("\n");
}
