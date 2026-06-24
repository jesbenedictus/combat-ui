import { staticTagNamePlugin } from "./scripts/cem-static-tagname.mjs";
import { customElementVsCodePlugin } from "custom-element-vs-code-integration";
import { customElementJetBrainsPlugin } from "custom-element-jet-brains-integration";

export default {
  globs: ["src/components/**/*.ts"],
  exclude: ["src/components/**/index.ts"],
  outdir: "dist",
  litelement: false,
  fast: false,
  plugins: [
    staticTagNamePlugin(),
    // VS Code: emits HTML + CSS custom-data files for tag/attribute completion.
    customElementVsCodePlugin({
      outdir: ".",
      htmlFileName: "vscode.html-custom-data.json",
      cssFileName: "vscode.css-custom-data.json",
    }),
    // PhpStorm / WebStorm: emits a web-types.json referenced from package.json.
    customElementJetBrainsPlugin({
      outdir: ".",
      fileName: "web-types.json",
      packageJson: false,
    }),
  ],
};