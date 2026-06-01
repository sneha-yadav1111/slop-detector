// src/core/index.ts
// CORE-01: public core surface (barrel). The pure issue score() lives in
// score-issue.ts; the cross-track analyze() lives in analyze.ts — both re-exported
// here. Splitting score() out of this file avoids a barrel import cycle with analyze.ts.
// CRITICAL: This file MUST NOT import from @octokit, @actions, fs, https, or any LLM SDK.

// Cross-Track unified detection engine — one entrypoint for PRs, commits,
// code comments, and issues. Used by the web dashboard, Action summary, and benchmark.
export {
  type AnalyzeInput,
  type ArtifactKind,
  analyze,
  type SlopVerdict,
  type UnifiedResult,
  verdictFromSignal,
} from './analyze.js'
export { score } from './score-issue.js'
