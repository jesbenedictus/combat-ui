/// @ts-check

import { glob, readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCssDoc } from "./parse-css-doc.mjs";

const HERE = resolve(dirname(fileURLToPath(import.meta.url)));
const ROOT = resolve(HERE, "..");
const GLOBS = [
  "src/styles/components/*.css",
  "src/styles/layout.css",
  "src/styles/tokens.css",
  "src/styles/utilities.css",
  "src/styles/website.css",
];
const OUTPUT = resolve(ROOT, "dist/blocks.json");

const SELECTOR_LINE = /^[ \t]*(\.cui-[A-Za-z0-9-]+)(?=[\s,.[:{>+~])/gm;

async function main() {
  const files = await collectFiles();

  /** @type {import("./parse-css-doc.mjs").Block[]} */
  const allBlocks = [];
  /** @type {import("./parse-css-doc.mjs").TokenGroup[]} */
  const allTokenGroups = [];
  /** @type {Set<string>} */
  const documentedClasses = new Set();

  for (const absPath of files) {
    const rel = toPosix(relative(ROOT, absPath));
    const text = await readFile(absPath, "utf-8");
    const { blocks, tokenGroups } = parseCssDoc(text, rel);
    for (const block of blocks) {
      allBlocks.push(block);
      for (const part of block.selector.split(",")) {
        const leading = /\.([\w-]+)/.exec(part.trim())?.[1];
        if (leading) documentedClasses.add(leading);
      }
    }
    for (const group of tokenGroups) {
      allTokenGroups.push(group);
    }
  }

  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(
    OUTPUT,
    JSON.stringify(
      {
        schemaVersion: "1.1.0",
        blocks: allBlocks,
        tokenGroups: allTokenGroups,
      },
      null,
      2,
    ) + "\n",
    "utf-8",
  );

  const undocumentedCount = await reportUndocumented(files, documentedClasses);

  const parts = [
    `${allBlocks.length} ${allBlocks.length === 1 ? "block" : "blocks"}`,
  ];
  if (allTokenGroups.length > 0) {
    parts.push(
      `${allTokenGroups.length} ${
        allTokenGroups.length === 1 ? "token group" : "token groups"
      }`,
    );
  }
  console.log(
    `Wrote ${parts.join(" and ")} to ${toPosix(relative(ROOT, OUTPUT))}` +
      (undocumentedCount > 0 ? ` (${undocumentedCount} undocumented).` : "."),
  );
}

/**
 * Collects all CSS files matching the specified globs.
 * @return {Promise<string[]>} An array of absolute file paths.
 */
async function collectFiles() {
  /** @type {string[]} */
  const files = [];
  for (const pattern of GLOBS) {
    for await (const file of glob(pattern, { cwd: ROOT })) {
      files.push(resolve(ROOT, file));
    }
  }
  return files.sort();
}

/**
 * Reports any CSS classes that are not documented with an @block tag.
 * @param {string[]} files - An array of absolute file paths to check.
 * @param {Set<string>} documentedClasses - A set of documented class names.
 * @return {Promise<number>} The number of undocumented classes found.
 */
async function reportUndocumented(files, documentedClasses) {
  /** @type {Map<string, Array<{className: string, line: number}>>} */
  const undocumentedByFile = new Map();

  for (const absPath of files) {
    const rel = toPosix(relative(ROOT, absPath));
    const text = await readFile(absPath, "utf-8");
    const seenInFile = new Set();
    for (const match of text.matchAll(SELECTOR_LINE)) {
      const className = match[1].slice(1);
      if (documentedClasses.has(className) || seenInFile.has(className))
        continue;
      seenInFile.add(className);
      const offset = match.index ?? 0;
      const line = countLinesUpTo(text, offset);
      const list = undocumentedByFile.get(rel) ?? [];
      list.push({ className, line });
      undocumentedByFile.set(rel, list);
    }
  }

  let total = [...undocumentedByFile.values()].reduce(
    (n, l) => n + l.length,
    0,
  );
  if (total === 0) return 0;

  process.stderr.write(
    `\n${total} undocumented .cui- block${total > 1 ? "s" : ""} (annotate or ignore):\n`,
  );
  for (const [file, items] of undocumentedByFile) {
    process.stderr.write(`  ${file}:\n`);
    for (const { className, line } of items) {
      process.stderr.write(`    .${className} (line ${line})\n`);
    }
  }
  process.stderr.write("\n");
  return total;
}

/**
 * Counts the number of lines in a string up to a given offset.
 * @param {string} text - The text to count lines in.
 * @param {number} offset - The offset up to which to count lines.
 * @returns {number} The number of lines up to the offset.
 */
function countLinesUpTo(text, offset) {
  let n = 1;
  for (let i = 0; i < offset; i++) {
    if (text.charCodeAt(i) === 10) n++;
  }
  return n;
}

/**
 * Converts a file path to a POSIX-style path.
 * @param {string} path - The file path to convert.
 * @returns {string} The POSIX-style file path.
 */
function toPosix(path) {
  return path.replaceAll("\\", "/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
