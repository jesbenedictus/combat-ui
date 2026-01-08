import { resolve } from "node:path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

const isDocsRoot = process.argv.some(
  (arg) => arg.replaceAll("\\", "/").endsWith("/docs") || arg === "docs",
);

export default defineConfig({
  plugins: isDocsRoot
    ? []
    : [
        dts({
          tsconfigPath: "./tsconfig.src.json",
          outDir: "dist/types",
          insertTypesEntry: true,
        }),
      ],
  build: isDocsRoot
    ? {
        target: "baseline-widely-available",
        sourcemap: true,
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
