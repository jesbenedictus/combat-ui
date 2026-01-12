export default {
  extends: ["stylelint-config-standard"],
  plugins: ["stylelint-plugin-use-baseline"],
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
  }
};
