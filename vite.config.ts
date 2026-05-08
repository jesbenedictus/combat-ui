import { resolve } from "node:path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

const isDocsRoot = process.argv.some(
  (arg) => arg.replaceAll("\\", "/").endsWith("/docs") || arg === "docs",
);

const docsDir = resolve(__dirname, "docs");
const docsPages = ["index", "foundations", "components", "layouts", "theming"];

export default defineConfig({
  base: isDocsRoot ? "./" : "/",
  plugins: isDocsRoot
    ? []
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
