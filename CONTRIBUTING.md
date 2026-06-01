# Contributing to Slop Detector

Thanks for your interest in improving Slop Detector (Slop Scan · Track A).

## Project layout

| Path | Purpose |
|---|---|
| `src/core/` | Pure scoring engine — **no** Octokit, filesystem, or LLM imports |
| `src/adapters/` | GitHub I/O, LLM providers, cache, dashboard ingest |
| `src/action/` | GitHub Action orchestrator (`runIssue` / `runPullRequest`) |
| `web/` | Next.js dashboard (`slop-detector-web` workspace package) |
| `scripts/` | Benchmarks (`pr-benchmark.ts`, `expand-pr-dataset.ts`, `scrape-prs.ts`) |
| `bench/` | Reports and labeled fixtures |

## Development setup

**Prerequisites:** Node 24+ (see `.nvmrc`), pnpm 10+ (`corepack enable`).

```bash
pnpm install
pnpm test
pnpm lint
pnpm package          # rebuild dist/index.js — commit if CI expects it
pnpm --filter slop-detector-web build
```

Run the dashboard: `pnpm demo` → http://localhost:3000 (scanner at `/app`).

## Testing

- **Unit / integration:** `pnpm test` (Vitest; mocks `@actions/core` and `@actions/github` in Action tests).
- **Track-A bake-off:** `pnpm bench:expand-pr && pnpm bench:pr` → updates `bench/PR-REPORT.md` and `bench/pr-metrics.json`.
- **Issue replay (optional):** `pnpm bench:issues` when `bench/fixtures/` is present.

When changing PR detectors (`src/core/pr/*`), add or adjust cases in `bench/pr-fixtures/dataset.json` and re-run `pnpm bench:pr`.

## Changing detection logic

1. Edit pure functions under `src/core/` (issues: `score-issue.ts`, `heuristics/`; PRs: `pr/extractor.ts`, `pr/score.ts`; comments: `comments/detector.ts`).
2. Add Vitest coverage in `tests/core/`.
3. Regenerate benchmark reports if behavior shifts materially.
4. Keep the **hero output invariant**: checklist comments must still post when labels, LLM, or summary fail.

## Local Action testing

```bash
cp .env.example .env
# Set GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_ACTOR, GITHUB_EVENT_PATH
pnpm package
pnpm local-action
```

Use `./fixtures/event.json` for issues. For PR events, point `GITHUB_EVENT_PATH` at a `pull_request` webhook fixture and set `GITHUB_EVENT_NAME=pull_request`.

## Pull requests

- Match existing Biome formatting (`pnpm format` / `pnpm lint`).
- Keep diffs focused; do not rename branding (`slop-detector` marker, env vars) without discussion.
- Document user-visible behavior in `README.md` when you add inputs, signals, or workflows.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
