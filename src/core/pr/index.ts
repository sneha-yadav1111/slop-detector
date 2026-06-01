// src/core/pr/index.ts
// Track A (Code Review) public surface — PR / commit slop detection.

export { assessCommit, assessCommits } from './commits.js'
export { extractPrSignals } from './extractor.js'
export { scorePr } from './score.js'
export type {
  CommitVerdict,
  PrScored,
  PrSignals,
  PullRequestInput,
} from './types.js'
