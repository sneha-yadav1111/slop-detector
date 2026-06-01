# Slop Scan — submission checklist

**Project:** Slop Detector · **Track A — Code Review**  
**Author:** Asteam Black Shadow · **Repository:** [github.com/sneha-yadav1111/slop-scan](https://github.com/sneha-yadav1111/slop-scan)

## Deliverables

- [x] Public GitHub repo with source
- [ ] Live Vercel deploy (root `vercel.json`, build `pnpm --filter slop-detector-web build`)
- [ ] 2–3 minute demo video (Live Fire PR → SSE → verdict → one honest FN)
- [ ] Hackathon form: disclose tools used (e.g. Cursor)

## What to demo (3 minutes)

1. **`pnpm demo`** → http://localhost:3000/app
2. **Unified scan** → “Hollow AI PR (paste)” → slop verdict, score breakdown, evidence
3. **Live URL** → example public PR (SSE: fetch files → parse hunks → analyze)
4. **Strong PR / Well-commented code** → clean verdict
5. **`bench/PR-REPORT.md`** → N=87, F1≈0.90, list false negatives (score 4 borderline)
6. **GitHub Actions** → issue triage + PR triage workflows posting idempotent comments

## Judge commands

```bash
pnpm install
pnpm demo
pnpm test                 # 362+ tests
pnpm bench:expand-pr
pnpm bench:pr             # Track-A confusion matrix
pnpm package              # Action bundle
```

## Bonus challenges

| Bonus | Evidence |
|---|---|
| **Bake-Off** | `bench/PR-REPORT.md` (N=87, Wilson CIs) + `bench/REPORT.md` (issues) |
| **Live Fire** | Dashboard live GitHub URL scan + example buttons |
| **Open Source Ready** | MIT, `CONTRIBUTING.md`, CI with lint/test/bench/bundle/web build |
| **Cross-Track Scanner** | `analyze()` + Unified scan (PR, issue, comments, commits) |

## Honest limitations (say these out loud)

- PR bake-off includes programmatically expanded fixtures (disclosed in `dataset.json` `_meta`); hand-labeled core is 13 items.
- Borderline slop at score **4/10** may pass as “genuine” (binary threshold ≤3).
- Issue benchmark precision **0.66** — tuned for recall; questions use a narrower gray band.
