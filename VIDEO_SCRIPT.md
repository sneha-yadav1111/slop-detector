# Slop Detector — 4-Min Video Script (Concise)

**Slop Scan · Track A — Code Review** · Asteam Black Shadow  
**Repo:** github.com/sneha-yadav1111/slop-scan · **Record:** `/app`

---

## Structure (4:00)

| Block | Time | Wow factor |
|---|---|---|
| 1. Hook + Track | 0:25 | The question judges care about |
| 2. Product pitch | 0:20 | One engine · two surfaces · four detectors |
| 3. Live demo | 2:00 | SSE pipeline + explainability + Live Fire |
| 4. Proof | 0:45 | Bake-Off numbers + honest failures |
| 5. Action + close | 0:30 | Zero-config maintainer tool |

---

## Pre-record

`pnpm demo` → **localhost:3000/app** · Full screen · Click order: **Hollow AI PR** → **Live: real PR (vscode)** → **Strong PR** → **Hollow comments**

---

## SCRIPT

### 1 · Hook & Track — [0:00–0:25]

**SHOW:** PR title *"Update files"* or slop gauge at 100

**SAY:**

> **Slop Scan, Track A — Code Review.**  
> Did a human actually read this PR before merging?  
> **Slop Detector** scores **information density** — not “was this AI?”  
> Hollow descriptions, filler commits, empty comments — we catch what wastes reviewer time.

---

### 2 · What we built — [0:25–0:45]

**SHOW:** Dashboard sidebar · Unified scan

**SAY:**

> **One engine. Two surfaces.**  
> **Dashboard** — paste or scan a live GitHub URL.  
> **GitHub Action** — checklist on every new issue and PR.  
> **Cross-track:** PRs, commits, comments, issues — same core, same scores everywhere.

**ON SCREEN (flash):** `scorePr()` · SSE · Action comment *(3 sec each, optional)*

---

### 3 · Live demo — [0:45–2:45]

#### 3a · Slop caught + WHY — [0:45–1:20]

**CLICK:** **Hollow AI PR (paste)** → Scan

**SAY:**

> Classic slop — file list, zero motivation, zero testing.  
> **Verdict: SLOP.** Score near 100.

**EXPAND:** Score breakdown · Evidence

**SAY:**

> **Wow #1 — Explainability.** Every verdict shows *which signals fired* and *why*. Diff overlap, thinness, boilerplate — not keyword hacks.

---

#### 3b · Live Fire + SSE — [1:20–2:00]

**CLICK:** **Live: real PR (vscode)** → Scan

**SAY:**

> **Wow #2 — Live Fire.** Real public PR from GitHub — not a toy fixture.

**NARRATE SSE steps as they appear:**

> Fetching… files… **parsing diff hunks**… analyzing.  
> You *watch* the pipeline — Server-Sent Events, step by step.  
> Same `scorePr()` as CI. Same code as the benchmark.

---

#### 3c · Clean pass + cross-track — [2:00–2:45]

**CLICK:** **Strong PR (paste)** → Scan

**SAY:**

> Strong PR — why, testing, linked issue. **Low slop. Pass.** We flag hollow work, not good work.

**CLICK:** **Hollow comments (code)** → Scan

**SAY:**

> **Track A depth:** hollow inline comments and filler commits — not just PR bodies. Four artifact types, one scan.

---

### 4 · Proof — [2:45–3:30]

**SHOW:** `bench/PR-REPORT.md` → metrics + false negatives

**SAY:**

> **Wow #3 — Honest Bake-Off.** Production detectors on 87 labeled fixtures.  
> **F1 ≈ 0.90. Zero false positives.**  
> And we publish failures: 9 borderline cases at score 4/10 — just above threshold 3.  
> No fake 99%. Disclosed dataset. CI-gated.

---

### 5 · Action + close — [3:30–4:00]

**SHOW:** GitHub Action checklist comment *(or workflow)*

**SAY:**

> **Wow #4 — Ships to maintainers.** GitHub Action on issues and PRs.  
> **No API key needed** — heuristics-first. Optional LLM for gray zones only.  
> Idempotent comments — helpful checklists, not gatekeeping.

**SHOW:** End card

**SAY:**

> **Slop Detector** — Track A. Dashboard + Action + benchmarks. MIT. Link below.  
> `pnpm demo` to try it. Thanks.

---

## End card

```
SLOP DETECTOR · Track A — Code Review
github.com/sneha-yadav1111/slop-scan
Asteam Black Shadow · Slop Scan 2026
```

---

## Wow factors (hit all four)

| # | Feature | Demo moment |
|---|---|---|
| 1 | **Explainability** | Score breakdown + evidence on Hollow PR |
| 2 | **Live Fire + SSE** | Real vscode PR, pipeline steps visible |
| 3 | **Honest Bake-Off** | F1 0.90, 0% FPR, show false negatives |
| 4 | **Production-ready** | Action checklist, zero-config, cross-track |

---

## Bonus tracks covered (one line each if time)

- **Cross-Track Scanner** — PR + commit + comment + issue in Unified scan  
- **Live Fire** — real GitHub URLs  
- **Bake-Off** — `bench/PR-REPORT.md`  
- **Open Source Ready** — MIT, CI, 362+ tests  

---

## YouTube title

**Slop Detector — Live PR scanner + GitHub Action | Slop Scan Track A**

**Description (short):**

Track A Code Review · Information-density scoring · SSE live pipeline · Explainable verdicts · F1≈0.90 bake-off · github.com/sneha-yadav1111/slop-scan

---

## Over time? Cut this

Architecture pan (block 2) → Well-commented code button → workflow YAML

**Never cut:** Hollow PR evidence · Live Fire SSE · Bake-Off FN list · Action one-liner
