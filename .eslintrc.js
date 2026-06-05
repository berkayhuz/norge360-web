// Root-level ESLint config for the Turborepo monorepo.
// App/package lint rules live in each package's eslint.config.js.
/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  ignorePatterns: [
    "**/node_modules/**",
    "**/.next/**",
    "**/dist/**",
    "**/.turbo/**",
    "**/coverage/**",
  ],
}
