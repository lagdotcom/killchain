import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import eslintPluginReact from "eslint-plugin-react";
import eslintPluginReactHooks from "eslint-plugin-react-hooks";
import eslintPluginReactRedux from "eslint-plugin-react-redux";

export default defineConfig(
  [
    {
      files: ["**/*.{ts,tsx}"],
      plugins: {
        "simple-import-sort": simpleImportSort,
        react: eslintPluginReact,
        "react-redux": eslintPluginReactRedux.configs.recommended.plugins,
      },
      extends: [
        js.configs.recommended,
        tseslint.configs.eslintRecommended,
        tseslint.configs.recommended,
      ],
      languageOptions: {
        ecmaVersion: 2020,
        globals: globals.browser,
      },
      ignores: ["main.js"],
      rules: {
        "simple-import-sort/imports": "error",
        "simple-import-sort/exports": "error",
        ...eslintPluginReactRedux.rules.recommended,
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
  eslintConfigPrettier,
  eslintPluginPrettierRecommended,
  eslintPluginReact.configs.flat.recommended,
  eslintPluginReact.configs.flat["jsx-runtime"],
  eslintPluginReactHooks.configs.flat.recommended,
);
