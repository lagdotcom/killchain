import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import prettierFlatConfig from "eslint-config-prettier/flat";
import prettierPluginRecommended from "eslint-plugin-prettier/recommended";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import reactReduxPlugin from "eslint-plugin-react-redux";

export default defineConfig(
  [
    {
      files: ["**/*.{ts,tsx}"],
      plugins: {
        "simple-import-sort": simpleImportSort,
        react: reactPlugin,
        "react-redux": reactReduxPlugin.configs.all.plugins,
      },
      extends: [js.configs.recommended, tseslint.configs.strictTypeChecked],
      languageOptions: {
        ecmaVersion: 2020,
        globals: globals.browser,
        parserOptions: { projectService: true },
      },
      ignores: ["main.js"],
      rules: {
        "simple-import-sort/imports": "error",
        "simple-import-sort/exports": "error",
        ...reactReduxPlugin.rules.recommended,
        "@typescript-eslint/restrict-template-expressions": "off",
        "@typescript-eslint/no-non-null-assertion": "off",
      },
      settings: {
        react: { version: "19" },
      },
    },
    {
      files: ["**/relay.ts"],
      languageOptions: {
        globals: globals.node,
      },
    },
  ],
  prettierFlatConfig,
  prettierPluginRecommended,
  reactPlugin.configs.flat.recommended,
  reactPlugin.configs.flat["jsx-runtime"],
  reactHooksPlugin.configs.flat.recommended,
);
