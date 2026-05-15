import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import dts from "vite-plugin-dts";

const isDocsRoot = process.argv.some(
  (arg) => arg.replaceAll("\\", "/").endsWith("/docs") || arg === "docs",
);

const docsDir = resolve(__dirname, "docs");
const docsPages = [
  "index",
  "foundations",
  "layouts",
  "theming",
  "sections",
  "components",
  "navigation",
  "atoms",
  "motion",
  "overlays",
  "forms",
  "roadmap",
];

function docsIncludes(): Plugin {
  const partialsDir = resolve(docsDir, "_partials");
  return {
    name: "docs-includes",
    transformIndexHtml(html, ctx) {
      return html.replace(
        /<!--#include\s+(\S+?)(?:\?([^>]+?))?\s*-->/g,
        (_, path, query) => {
          const fullPath = resolve(dirname(ctx.filename), path);
          let partial = readFileSync(fullPath, "utf-8");
          if (query) {
            const params = new URLSearchParams(query);
            const current = params.get("current");
            if (current) {
              partial = partial.replace(
                new RegExp(`(<a[^>]*\\sdata-page="${current}")`),
                `$1 aria-current="page"`,
              );
            }
          }
          return partial;
        },
      );
    },
    configureServer(server) {
      server.watcher.add(partialsDir);
      server.watcher.on("change", (file) => {
        if (file.replaceAll("\\", "/").includes("/docs/_partials/")) {
          server.ws.send({ type: "full-reload" });
        }
      });
    },
  };
}

export default defineConfig({
  base: isDocsRoot ? "./" : "/",
  plugins: isDocsRoot
    ? [docsIncludes()]
    : [
        dts({
          tsconfigPath: "./tsconfig.src.json",
          outDirs: "dist/types",
          insertTypesEntry: true,
        }),
      ],
  build: isDocsRoot
    ? {
        target: "baseline-widely-available",
        sourcemap: true,
        rollupOptions: {
          input: Object.fromEntries(
            docsPages.map((name) => [name, resolve(docsDir, `${name}.html`)]),
          ),
        },
      }
    : {
        target: "baseline-widely-available",
        sourcemap: true,
        lib: {
          entry: resolve(__dirname, "src/index.ts"),
          formats: ["es"],
          fileName: () => "combat-ui.js",
          cssFileName: "combat-ui",
        },
        rollupOptions: {
          output: {
            preserveModules: false,
          },
        },
      },
});
