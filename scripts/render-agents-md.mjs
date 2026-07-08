// @ts-check
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const CEM_PATH = resolve(ROOT, "dist/custom-elements.json");
const BLOCKS_PATH = resolve(ROOT, "dist/blocks.json");
const PREAMBLE_PATH = resolve(ROOT, "docs/agent-preamble.md");
const OUTPUT_PATH = resolve(ROOT, "dist/AGENTS.md");

const EXPECTED_CEM_SCHEMA = "1.0.0";
// Blocks manifest versions are additive within a major; this is the minimum
// version carrying everything the renderer reads.
const MIN_BLOCKS_SCHEMA = "1.1.0";

/**
 * @typedef {import("custom-elements-manifest/schema").Package} CEM
 * @typedef {import("./parse-css-doc.mjs").BlocksManifest} BlocksManifest
 * @typedef {import("custom-elements-manifest/schema").CustomElement} CustomElement
 * @typedef {import("custom-elements-manifest/schema").Declaration} Declaration
 * @property {string|undefined} tagName
 * @typedef {import("custom-elements-manifest/schema").Attribute} Attribute
 * @typedef {import("custom-elements-manifest/schema").Slot} Slot
 * @typedef {import("custom-elements-manifest/schema").Event} Event
 * @typedef {import("custom-elements-manifest/schema").CssCustomProperty} CSSProperty
 */
async function main() {
  const [cemText, blocksText, preamble] = await Promise.all([
    readFile(CEM_PATH, "utf-8"),
    readFile(BLOCKS_PATH, "utf-8"),
    readFile(PREAMBLE_PATH, "utf-8"),
  ]);

  /**
   * @type {CEM}
   */
  const cem = JSON.parse(cemText);
  /**
   * @type {BlocksManifest}
   */
  const blocks = JSON.parse(blocksText);

  validateSchema(cem, blocks);

  const elements = sortByName(extractElements(cem));
  const sortedBlocks = sortByName(blocks.blocks ?? []);
  const sortedTokenGroups = sortByName(blocks.tokenGroups ?? []);

  const content = [
    preamble.trim(),
    "",
    "## Custom Elements",
    "",
    elements.map(renderElement).join("\n\n"),
    "",
    "## Light-DOM Blocks",
    "",
    sortedBlocks.map(renderBlock).join("\n\n"),
    "",
    "## Token Groups",
    "",
    sortedTokenGroups.map(renderTokenGroup).join("\n\n"),
    "",
  ].join("\n");

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, content, "utf-8");

  console.log(
    `Wrote ${elements.length} elements, ${sortedBlocks.length} blocks, ` +
      `and ${sortedTokenGroups.length} token groups to ` +
      `${toPosix(relative(ROOT, OUTPUT_PATH))}`,
  );
}

/**
 * Validates the schema versions of the provided manifests.
 * Throws an error if the schema versions do not match the expected values.
 *
 * @param {CEM} cem
 * @param {BlocksManifest} blocks
 * @throws {Error} If the schema versions do not match the expected values.
 */
function validateSchema(cem, blocks) {
  if (cem.schemaVersion !== EXPECTED_CEM_SCHEMA) {
    throw new Error(
      `Unexpected CEM schema version: ${cem.schemaVersion} (expected ${EXPECTED_CEM_SCHEMA})`,
    );
  }
  if (!isCompatibleBlocksSchema(blocks.schemaVersion)) {
    throw new Error(
      `Unexpected Blocks manifest schema version: ${blocks.schemaVersion} (expected ${MIN_BLOCKS_SCHEMA} or a newer 1.x)`,
    );
  }
}

/**
 * Accepts any manifest sharing the expected major version at or above the
 * minimum minor version.
 *
 * @param {string} version
 * @returns {boolean}
 */
function isCompatibleBlocksSchema(version) {
  const [major, minor] = version.split(".").map(Number);
  const [minMajor, minMinor] = MIN_BLOCKS_SCHEMA.split(".").map(Number);
  return major === minMajor && minor >= minMinor;
}

/**
 * Extracts custom element declarations from the provided Custom Elements Manifest (CEM).
 * @param {CEM} cem
 * @returns {Array<CustomElement & { tagName: string }>}
 */
function extractElements(cem) {
  /** @type {Array<CustomElement & { tagName: string }>} */
  const out = [];
  for (const module of cem.modules ?? []) {
    for (const decl of module.declarations ?? []) {
      if (isCustomElement(decl)) {
        out.push(decl);
      }
    }
  }
  return out;
}

/**
 * @param {Declaration} decl
 * @returns {decl is CustomElement & { tagName: string }}
 */
function isCustomElement(decl) {
  return (
    decl.kind === "class" &&
    "customElement" in decl &&
    decl.customElement === true &&
    "tagName" in decl &&
    typeof decl.tagName === "string"
  );
}

/**
 * Sorts the provided items alphabetically by their `name` property.
 * @template T
 * @param {Array<T & { name: string }>} items
 * @returns {T[]}
 */
function sortByName(items) {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Sorts the provided items alphabetically by their `tagName` property.
 * @param {Declaration[]} items
 */
function sortByTagName(items) {
  const withTagName = /** @type {(Declaration & { tagName: string })[]} */ (
    items
  );
  return [...withTagName].sort((a, b) => a.tagName.localeCompare(b.tagName));
}

/**
 * Renders a custom element declaration as a Markdown string.
 * 
 * @param {CustomElement & {tagName: string}} decl
 * @returns {string}
 */
function renderElement(decl) {
  const lines = [`### \`<${decl.tagName}>\``, ""];

  const description = (decl.description ?? "").trim();
  if (description) lines.push(description, "");

  appendList(
    lines,
    "Attributes",
    decl.attributes,
    (a) => `\`${a.name}\``,
    (a) => a.type?.text,
    (a) => a.description,
  );

  appendList(
    lines,
    "Slots",
    decl.slots,
    (s) => (s.name ? `\`${s.name}\`` : "*(default)*"),
    () => undefined,
    (s) => s.description,
  );

  appendList(
    lines,
    "Events",
    decl.events,
    (e) => `\`${e.name}\``,
    (e) => e.type?.text,
    (e) => e.description,
  );

  appendList(lines, "CSS Properties", decl.cssProperties,
    (c) => `\`${c.name}\``,
    () => undefined,
    (c) => c.description
  );

  for (const example of extractExamples(decl)) {
    lines.push("```html", example.trim(), "```", "");
  }

  return lines.join("\n").trim();
}

/**
 * Renders a block declaration as a Markdown string.
 * @param {import("./parse-css-doc.mjs").Block} block 
 * @returns {string}
 */
function renderBlock(block) {
  const lines = [`### \`.${block.name}\``, ""];

  if (block.selector && block.selector !== `.${block.name}`) {
    lines.push(`Matches: \`${block.selector}\``, "");
  }

  if (block.summary) lines.push(`*${block.summary}*`, "");
  if (block.description) lines.push(block.description, "");

  appendList(
    lines,
    "Variants",
    block.variants,
    (v) => `\`${v.name}\``,
    () => undefined,
    (v) => v.description,
  );

  appendList(
    lines,
    "Tones",
    block.tones,
    (t) => `\`${t.name}\``,
    () => undefined,
    (t) => t.description,
  );

  appendList(
    lines,
    "CSS Variables",
    block.cssVars,
    (c) => `\`${c.name}\``,
    () => undefined,
    (c) => c.description,
  );

  for (const example of block.examples ?? []) {
    lines.push("```html", example.trim(), "```", "");
  }

  return lines.join("\n").trim();
}

/**
 * Renders a token group declaration as a Markdown string.
 * @param {import('./parse-css-doc.mjs').TokenGroup} group 
 * @returns {string}
 */
function renderTokenGroup(group) {
  const lines = [`### \`${group.name}\``, ""];

  if (group.summary) lines.push(`*${group.summary}*`, "");
  if (group.description) lines.push(group.description, "");

  if (group.tokens?.length > 0) {
    lines.push("**Tokens**", "");
    for (const t of group.tokens) {
      const desc = t.description ? ` — ${t.description}` : "";
      lines.push(`- \`${t.name}\`${desc}`);
    }
    lines.push("");
  }

  for (const example of group.examples ?? []) {
    lines.push("```css", example.trim(), "```", "");
  }

  return lines.join("\n").trim();
}


/**
 * Append a labeled bullet list to `lines`. Each entry renders as:
 *   - `<name>` (`<type>`) — <description>
 * with each piece optional.
 *
 * @template T
 * @param {string[]} lines
 * @param {string} label
 * @param {T[] | undefined} items
 * @param {(item: T) => string} nameOf
 * @param {(item: T) => string | undefined} typeOf
 * @param {(item: T) => string | undefined} descriptionOf
 */
function appendList(lines, label, items, nameOf, typeOf, descriptionOf) {
  if (!items || items.length === 0) return;
  lines.push(`**${label}**`, "");
  for (const item of items) {
    const name = nameOf(item);
    const type = typeOf(item);
    const description = descriptionOf(item);
    const typePart = type ? ` (\`${type}\`)` : "";
    const descPart = description ? ` — ${description.trim()}` : "";
    lines.push(`- ${name}${typePart}${descPart}`);
  }
  lines.push("");
}

/** @param {CustomElement & {tagName: string, examples?: any[]}} decl */
function extractExamples(decl) {
  if (Array.isArray(decl.examples) && decl.examples.length > 0) {
    return decl.examples.map((ex) =>
      typeof ex === "string" ? ex : ex.code ?? "",
    );
  }
  return [];
}

/** @param {string} p */
function toPosix(p) {
  return p.replaceAll("\\", "/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
