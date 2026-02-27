import tsEslintPlugin from "@typescript-eslint/eslint-plugin"
import tsEslintParser from "@typescript-eslint/parser"

export default [
  {
    ignores: [".next/**", "node_modules/**", "dist/**"],
  },
  {
    files: ["**/*.{ts,tsx,d.ts}"],
    languageOptions: {
      parser: tsEslintParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "@typescript-eslint": tsEslintPlugin,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "no-restricted-imports": [
        "error",
        {
          patterns: ["@/components/ui/*", "@/components/reui/*"],
        },
      ],
    },
  },
]
