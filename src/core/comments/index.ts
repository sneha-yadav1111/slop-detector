// src/core/comments/index.ts
// Track A (Code Review) public surface — hollow code-comment detection.

export { assessComment, scanComments } from './detector.js'
export { extractComments } from './extractor.js'
export type {
  CommentLang,
  CommentScanResult,
  CommentSlopReason,
  CommentVerdict,
  ExtractedComment,
} from './types.js'
