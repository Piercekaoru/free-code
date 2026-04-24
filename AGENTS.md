# Repository Guidelines

## Project Structure & Module Organization

This is a Bun-based TypeScript CLI workspace. Runtime source lives in `src/`, with the main entrypoint at `src/entrypoints/cli.tsx`. Slash commands are under `src/commands/`, agent tools under `src/tools/`, terminal UI components under `src/components/` and `src/screens/`, and shared infrastructure under `src/services/`, `src/state/`, `src/utils/`, `src/query/`, and `src/remote/`. Build logic is in `scripts/build.ts`. Static project assets are in `assets/`; generated binaries such as `cli`, `cli-dev`, and `dist/cli` should not be treated as source.

## Build, Test, and Development Commands

- `bun install`: install dependencies from `bun.lock`.
- `bun run dev`: run the CLI directly from `src/entrypoints/cli.tsx` for local development.
- `bun run build`: compile the production-like `./cli` binary with the default feature set.
- `bun run build:dev`: compile `./cli-dev` with a development version stamp.
- `bun run build:dev:full`: compile `./cli-dev` with all working experimental flags enabled.
- `bun run compile`: compile to `./dist/cli`.

## Coding Style & Naming Conventions

Use TypeScript/TSX ESM modules and Bun APIs where they are already established. Prefer single quotes, no semicolons, trailing commas in multi-line literals, and two-space indentation. Keep React/Ink UI components in PascalCase (`PromptInput.tsx`), hooks in camelCase with a `use` prefix, and service or utility modules named for their responsibility (`remotePermissionBridge.ts`, `withRetry.ts`). Use the `src/*` path alias when it improves clarity over long relative imports.

## Testing Guidelines

There is no central test runner configured in `package.json` yet. Before submitting changes, run `bun run build` at minimum; for feature-flag work, also run `bun run build:dev:full`. If you add tests, colocate them near the code they cover using `*.test.ts` or `*.spec.ts`, document any new command in `package.json`, and prefer deterministic tests that do not require live model-provider credentials.

## Commit & Pull Request Guidelines

Recent history uses concise Conventional Commit prefixes such as `feat:` and `fix:`, plus direct imperative summaries for refactors. Use messages like `feat: add provider selection guard` or `fix: handle missing OAuth token`. Pull requests should describe the behavioral change, list validation commands run, link related issues, and include screenshots or terminal output for visible CLI/UI changes. Call out provider, auth, or feature-flag impacts explicitly.

## Security & Configuration Tips

Do not commit API keys, OAuth tokens, or provider credentials. Keep provider selection in environment variables such as `ANTHROPIC_API_KEY`, `CLAUDE_CODE_USE_OPENAI`, `CLAUDE_CODE_USE_BEDROCK`, or `CLAUDE_CODE_USE_VERTEX`. Avoid adding network callbacks or telemetry unless the behavior is intentional, documented, and configurable.
