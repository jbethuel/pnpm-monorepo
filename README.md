# pnpm-monorepo

A pnpm workspace monorepo scaffold with a [Hono](https://hono.dev) API, a [Vite](https://vite.dev) + React web app, and shared TypeScript packages consumed directly as source.

## Requirements

- Node `v24.18.0` (see [`.nvmrc`](.nvmrc) — run `nvm use` if you use nvm)
- pnpm `12.4.2` (pinned via `packageManager` in [`package.json`](package.json); Corepack will pick this up automatically)

## Getting started

```bash
pnpm install

# run the API (http://localhost:3000) and the web app (http://localhost:5173) separately
pnpm api dev
pnpm web dev
```

## Repo structure

```
apps/
  api/     @monorepo/api  — Hono HTTP server, run on plain Node
  web/     @monorepo/web  — Vite + React app
packages/
  core/      @monorepo/core      — shared types/utilities (source-only)
  ui/        @monorepo/ui        — shared React components (source-only)
  ts-config/ @monorepo/ts-config — shared base tsconfig, no code
```

### apps/api

A minimal [Hono](https://hono.dev) server on [`@hono/node-server`](https://github.com/honojs/node-server), exposing:

- `GET /` — returns a greeting from `@monorepo/core`
- `GET /user` — returns a sample `User`

| Script | Command | Purpose |
| --- | --- | --- |
| `dev` | `tsx watch src` | Run from source with hot reload |
| `build` | `tsc --noEmit` then `esbuild --bundle` | Typecheck, then bundle `src/index.ts` (inlining `@monorepo/core`) into a single `build/index.js`. Only real npm dependencies (`hono`, `@hono/node-server`) stay external — everything workspace-local is inlined. |
| `start` | `node build/index.js` | Run the bundled production artifact |
| `typecheck` | `tsc --noEmit` | Typecheck only |

### apps/web

A Vite + React app that imports `@monorepo/core` and `@monorepo/ui` directly from source — Vite bundles them like any other module, so there's no separate build step for those packages to keep in sync.

| Script | Command | Purpose |
| --- | --- | --- |
| `dev` | `vite` | Dev server at `http://localhost:5173` |
| `build` | `tsc` then `vite build` | Typecheck, then production build to `dist/` |
| `preview` | `vite preview` | Serve the production build locally |
| `typecheck` | `tsc --noEmit` | Typecheck only |

### packages/core, packages/ui

Both are **source-only** packages — no build step. `package.json`'s `main`/`types` point straight at `./src/index.ts`:

```json
"main": "./src/index.ts",
"types": "./src/index.ts"
```

They're never run directly by plain Node — only consumed by tools with their own module resolver: Vite (`apps/web`, dev and build), esbuild (`apps/api`'s bundle step), and `tsx` (`apps/api`'s dev script). Because of that, relative imports inside these packages (e.g. `packages/core/src/index.ts`) are written **without** file extensions — normal TypeScript style — since nothing here needs Node's stricter native ESM resolution rules.

The only script either package has is `typecheck` (`tsc --noEmit`).

- `@monorepo/core` — `greet()` util and the `User` type, framework-agnostic.
- `@monorepo/ui` — a `Button` component, depends on `react`.

### packages/ts-config

Holds [`base.json`](packages/ts-config/base.json), the shared `tsconfig` every package/app extends via `"extends": "@monorepo/ts-config/base.json"`. Notable choices:

- `moduleResolution: "Bundler"` — matches how everything in this repo is actually consumed (bundlers/`tsx`), not Node's native resolver.
- `strict`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, etc. — strict-by-default.
- Each package/app overrides `target`, `module`, `jsx`, and sets `noEmit: true` (nothing in this repo emits JS via `tsc` directly anymore — `apps/api` bundles with esbuild, `apps/web` bundles with Vite).

## Root scripts

| Script | Command | Purpose |
| --- | --- | --- |
| `api` / `core` / `ui` / `web` | `pnpm --filter <name>` | Shorthand to target one workspace, e.g. `pnpm api dev` |
| `precheck` | `prettier:check` + `lint:check` | Format + lint check, no type info |
| `typecheck` | `pnpm -r typecheck` | Typecheck every package |
| `lint:check` | `oxlint --max-warnings=0` | Lint the whole repo |
| `prettier:check` / `prettier:write` | `prettier --check/--write ./apps ./packages` | Format check / auto-format |

## Tooling

- **oxlint** ([`.oxlintrc.json`](.oxlintrc.json)): `correctness` + `suspicious` categories as errors, with the `typescript` and `oxc` plugins. The rules from the old ESLint setup's `@eslint/js` / `typescript-eslint` recommended sets that fall outside those categories are listed explicitly. The `react` plugin (the `eslint-plugin-react-hooks` recommended rules plus `only-export-components`) applies only to `apps/web`/`packages/ui`.
- **Prettier** ([`.prettierrc.json`](.prettierrc.json)): no semicolons, double quotes, 100-char print width, trailing commas everywhere.
- **TypeScript 7** (`~7.0.2`, the Go-native compiler) is what `tsc` runs. It ships no JS compiler API, which is why linting is oxlint rather than ESLint: `typescript-eslint` can't run on TypeScript 7. Editors won't find a `tsserver` in `node_modules` and fall back to their bundled TypeScript.

## CI

[`.github/workflows/precheck_build.yml`](.github/workflows/precheck_build.yml) runs on every push to `main`: install (`--frozen-lockfile`) → `pnpm precheck` → `pnpm typecheck` → build `api` → build `web`.

## Conventions worth knowing

- **Nothing runs raw, multi-file `tsc` output through plain `node` anymore.** `apps/api`'s production artifact is a single esbuild bundle; `apps/web`'s is a Vite bundle. `tsc` across the repo is typecheck-only (`noEmit: true` everywhere).
- **Workspace packages (`core`, `ui`) have no build output** — they're TypeScript source, consumed directly by whatever bundles the app that needs them.
- Package manager is pnpm; `pnpm-workspace.yaml` defines the workspace globs and `allowBuilds` (esbuild's native-binary postinstall is explicitly approved — required for Vite to run).
