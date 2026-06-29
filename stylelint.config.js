export default {
  extends: ["stylelint-config-standard"],
  plugins: ["stylelint-plugin-use-baseline"],
  ignoreFiles: ["dist/**", "dist-docs/**", "**/dist/**"],
  rules: {
    "plugin/use-baseline": [
      true,
      {
        available: 2025
      }
    ],
    "custom-property-pattern": [
      "^(cui|_)-[a-z0-9]+(?:-[a-z0-9]+)*$",
      {
        message: "Combat UI custom properties must start with --cui- or _ for component local."
      }
    ]
  },
  overrides: [
    {
      // Docs-only stylesheet: docs-internal vars use the --docs- namespace
      // (not part of the shipped library API).
      files: ["docs/**/*.css"],
      rules: {
        "custom-property-pattern": [
          "^(cui|_|docs)-[a-z0-9]+(?:-[a-z0-9]+)*$",
          {
            message: "Combat UI custom properties must start with --cui-, --docs-, or _ for component local."
          }
        ]
      }
    }
  ]
};
