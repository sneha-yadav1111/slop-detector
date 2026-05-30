# Slop Detector · Web Dashboard

Live **Slop Scan** demo UI — **Track A (Code Review)** with supporting issue triage. Built for the [Slop Scan](https://slopscan.dev) hackathon.

**Author:** Asteam Black Shadow · **Repo:** [github.com/sneha-yadav1111/slop-scan](https://github.com/sneha-yadav1111/slop-scan)

The dashboard imports the **same pure core** as the GitHub Action (`../src/core`), so scores match production and the benchmark harness.

## Features

| Feature | Description |
|---|---|
| **Live GitHub scan** | Paste an issue or PR URL; fetches title, body, files, patches, commits via shared [`fetch-pr-rest`](../src/adapters/github/fetch-pr-rest.ts) mapper. |
| **Paste mode** | Offline demo for PR text, issue bodies, or raw source with comments. |
| **SSE pipeline** | `/api/scan/stream` streams progress: fetch → files → commits → hunks → analyze. |
| **Explainability** | Per-signal chips, score breakdown, diff overlap %, evidence snippets (`ResultPanel`). |
| **Unified scan** | One-click cross-track examples (PR, issue, code comments) via `UnifiedScan`. |
| **Activity feed** | In-memory feed of recent scans (`/api/activity`). |
| **Feedback** | `POST /api/feedback` logs incorrect verdicts to `bench/pr-fixtures/feedback.jsonl` (local dev). |
| **Optional LLM** | Gray-zone adjudication for issues and PRs when a provider key is set. |

## Run it

From the **repository root** (pnpm workspace):

```bash
pnpm install
pnpm demo                    # http://localhost:3000 — open /app for the scanner
```

Or from `dashboard/` only (you still need root `pnpm install` once for workspace deps):

```bash
cp .env.example .env.local
pnpm --filter slop-detector-web dev
```

**Zero configuration** runs heuristics-only. Optional env in `dashboard/.env.local`:

| Variable | Purpose |
|---|---|
| `GITHUB_TOKEN` | Higher GitHub API rate limits for live URL scans |
| `OPENROUTER_API_KEY` / `GEMINI_API_KEY` | Free-tier LLM providers (OpenAI-compatible adapter) |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | Paid LLM adjudication |
| `SLOP_DETECTOR_MODEL` | Override model routing (same as Action `model` input semantics) |

## Detection (shared core)

### Pull requests

`scorePr()` in [`../src/core/pr/score.ts`](../src/core/pr/score.ts) uses structural + lexical signals:

| Signal | Role |
|---|---|
| `hasMotivation`, `hasTestingNotes`, `hasIssueLink`, `hasRiskNotes` | Rewards reviewer-useful content |
| `isDiffRestating`, `hasHunkOverlap` | Penalizes restating paths or diff identifiers |
| `isChangelogOnly`, `hasGenericBoilerplate`, `isThin` | Penalizes hollow / AI-shaped descriptions |
| `missingTestsMention`, `requiresRiskNotes` | Flags test-file or sensitive-path changes without context |

Live scans parse diff **patches** into hunk tokens for stronger overlap detection. Commit messages are scored separately (`commitSlopRatio`).

### Issues

Seven content signals → 0–10 actionability score + missing-info checklist (see root `README.md`).

### Code comments

`scanComments()` pairs each comment with the line it annotates; flags restatement, tautology, and generic boilerplate.

## API routes

| Route | Method | Purpose |
|---|---|---|
| `/api/scan` | POST | `{ mode: github \| paste \| code, ... }` → `ScanResult` JSON |
| `/api/scan/stream` | POST | Same body; SSE `progress` + `result` events |
| `/api/activity` | GET | Recent scan feed |
| `/api/feedback` | POST | `{ scanId, correct: boolean }` — dev feedback log |
| `/api/ingest` | POST | Action → dashboard live feed (requires ingest token) |

## Architecture

```
dashboard/src/
  app/app/page.tsx       # Main scanner UI
  app/how-it-works/      # Methodology + benchmark summary
  components/            # Scanner, ResultPanel, UnifiedScan, ActivityFeed
  lib/
    github.ts            # REST client → shared PR mapper
    scan.ts              # Orchestration + optional LLM
    examples.ts          # One-click demo payloads
../src/core/             # Pure detectors (imported via @core/*)
../src/adapters/github/  # map-pr.ts, fetch-pr-rest.ts (web + Action parity)
```

TypeScript path aliases: `@core/*`, `@adapters/*`. Next.js `extensionAlias` resolves core `.js` imports to `.ts` sources.

## Benchmarks

- **Track A (primary):** `pnpm bench:expand-pr && pnpm bench:pr` → [`../bench/PR-REPORT.md`](../bench/PR-REPORT.md)
- **Issues (supporting):** [`../bench/REPORT.md`](../bench/REPORT.md)

## Deploy

Deploy from the **repo root** on Vercel (see root `README.md` and [`vercel.json`](../vercel.json)). Do not set the Vercel root to `dashboard/` alone — the build imports `../src/core`.
