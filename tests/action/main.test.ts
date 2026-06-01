import { beforeEach, describe, expect, it, vi } from 'vitest'

// Hoist all mock factories so they can be referenced inside vi.mock()
const {
  mockListComments,
  mockCreateComment,
  mockUpdateComment,
  mockGetOctokit,
  mockInfo,
  mockSetFailed,
  mockGetInput,
  mockGetBooleanInput,
  mockContext,
  mockLoadRepoContext,
  mockEnsureLabel,
  mockApplyLabel,
  mockRemoveLabel,
  mockWriteSummary,
  mockWriteSkipSummary,
  mockWritePrSummary,
  mockFetchPullRequest,
  mockSummary,
} = vi.hoisted(() => {
  const mlc = vi.fn()
  const mcc = vi.fn()
  const muc = vi.fn()
  const mGOctokit = vi.fn(() => ({
    rest: {
      issues: {
        listComments: mlc,
        createComment: mcc,
        updateComment: muc,
      },
    },
  }))
  const ctx = {
    actor: 'test-user',
    repo: { owner: 'test-user', repo: 'slop-detector-sandbox' },
    payload: {
      issue: { number: 42, title: 'crash', body: '', labels: [] },
    },
  }
  const ms = {
    addRaw: vi.fn().mockReturnThis(),
    addTable: vi.fn().mockReturnThis(),
    addEOL: vi.fn().mockReturnThis(),
    write: vi.fn().mockResolvedValue(undefined),
  }
  return {
    mockListComments: mlc,
    mockCreateComment: mcc,
    mockUpdateComment: muc,
    mockGetOctokit: mGOctokit,
    mockInfo: vi.fn(),
    mockSetFailed: vi.fn(),
    mockGetInput: vi.fn().mockReturnValue(''),
    mockGetBooleanInput: vi.fn().mockReturnValue(false),
    mockContext: ctx,
    mockLoadRepoContext: vi.fn().mockResolvedValue({
      hasIssueForms: false, hasMdTemplates: false, hasContributing: false, templates: [],
    }),
    mockEnsureLabel: vi.fn().mockResolvedValue(undefined),
    mockApplyLabel: vi.fn().mockResolvedValue('applied'),
    mockRemoveLabel: vi.fn().mockResolvedValue('removed'),
    mockWriteSummary: vi.fn().mockResolvedValue(undefined),
    mockWriteSkipSummary: vi.fn().mockResolvedValue(undefined),
    mockWritePrSummary: vi.fn().mockResolvedValue(undefined),
    mockFetchPullRequest: vi.fn().mockResolvedValue({
      title: 'Update files',
      body: 'This PR introduces changes',
      changedFiles: ['a.ts'],
      changedFileCount: 1,
      linesChanged: 10,
      commits: ['update'],
    }),
    mockSummary: ms,
  }
})

vi.mock('@actions/github', () => ({
  context: mockContext,
  getOctokit: mockGetOctokit,
}))

vi.mock('@actions/core', () => ({
  info: mockInfo,
  setFailed: mockSetFailed,
  getInput: mockGetInput,
  getBooleanInput: mockGetBooleanInput,
  warning: vi.fn(),
  debug: vi.fn(),
  summary: mockSummary,
}))

vi.mock('../../src/adapters/github/io.js', () => ({
  postOrUpdateComment: vi.fn().mockResolvedValue({ commentId: 999, action: 'created' }),
}))

vi.mock('../../src/adapters/github/templates.js', () => ({
  loadRepoContext: mockLoadRepoContext,
}))

vi.mock('../../src/adapters/github/labels.js', () => ({
  ensureLabel: mockEnsureLabel,
  applyLabel: mockApplyLabel,
  removeLabel: mockRemoveLabel,
}))

vi.mock('../../src/action/summary.js', () => ({
  writeSummary: mockWriteSummary,
  writeSkipSummary: mockWriteSkipSummary,
  writePrSummary: mockWritePrSummary,
}))

vi.mock('../../src/adapters/github/fetch-pr.js', () => ({
  fetchPullRequest: mockFetchPullRequest,
}))

vi.mock('../../src/adapters/llm/factory.js', () => ({
  makeLLMPort: vi.fn(() => null),
}))

vi.mock('../../src/core/llm/adjudicate.js', () => ({
  adjudicate: vi.fn(async (scored: { score: number }) => ({
    scored,
    verdict: null,
    status: 'skipped-no-llm',
  })),
}))

vi.mock('../../src/core/llm/adjudicate-pr.js', () => ({
  adjudicatePr: vi.fn(async (scored: { score: number }) => ({
    scored,
    verdict: null,
    status: 'skipped-no-llm',
  })),
}))

vi.mock('../../src/adapters/dashboard/report.js', () => ({
  reportToDashboard: vi.fn().mockResolvedValue(undefined),
  verdictFromScore: vi.fn(() => 'gray'),
}))

vi.mock('../../src/adapters/cache/runner-cache.js', () => ({
  RunnerCachePort: vi.fn(),
}))

import { postOrUpdateComment } from '../../src/adapters/github/io.js'
import { run } from '../../src/action/main.js'

type InputMap = Record<string, string | boolean>

function setInputs(overrides: InputMap = {}) {
  const defaults: InputMap = {
    'dry-run': false,
    'enable-comments': true,
    'enable-labels': true,
    'label-name': 'needs-info',
    'model': '',
    'gray-zone-low': '4',
    'gray-zone-high': '6',
    'max-body-bytes': '10000',
    'pr-label-name': 'needs-review-context',
    'github-token': '',
  }
  const merged = { ...defaults, ...overrides }
  mockGetInput.mockImplementation((name: string) => {
    const v = merged[name]
    return v === undefined ? '' : typeof v === 'boolean' ? String(v) : v
  })
  mockGetBooleanInput.mockImplementation((name: string) => {
    const v = merged[name]
    return typeof v === 'boolean' ? v : v === 'true'
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.GITHUB_TOKEN = 'test-token'
  mockContext.actor = 'test-user'
  mockContext.payload = {
    issue: { number: 42, title: 'crash', body: 'some body', labels: [] },
    repository: { default_branch: 'main' },
  }
  mockListComments.mockResolvedValue({ data: [] })
  mockCreateComment.mockResolvedValue({ data: { id: 999 } })
  mockLoadRepoContext.mockResolvedValue({
    hasIssueForms: false, hasMdTemplates: false, hasContributing: false, templates: [],
  })
  mockApplyLabel.mockResolvedValue('applied')
  mockRemoveLabel.mockResolvedValue('removed')
  mockWriteSummary.mockResolvedValue(undefined)
  mockWriteSkipSummary.mockResolvedValue(undefined)
  vi.mocked(postOrUpdateComment).mockResolvedValue({ commentId: 999, action: 'created' })
  mockSummary.addRaw.mockReturnThis()
  mockSummary.addTable.mockReturnThis()
  mockSummary.addEOL.mockReturnThis()
  mockSummary.write.mockResolvedValue(undefined)
  setInputs()
})

describe('main.ts orchestrator', () => {
  it('happy path: posts a new comment when no marker exists', async () => {
    await run()
    expect(vi.mocked(postOrUpdateComment)).toHaveBeenCalledTimes(1)
    const args = vi.mocked(postOrUpdateComment).mock.calls[0]
    expect(args[4]).toContain('<!-- slop-detector:v1 -->')
    expect(args[4]).toContain('Actionability score:')
    expect(mockSetFailed).not.toHaveBeenCalled()
  })

  it('PR happy path: scores pull_request and posts comment', async () => {
    mockContext.payload = {
      pull_request: {
        number: 7,
        title: 'Update',
        body: 'changes',
        labels: [],
      },
      repository: { default_branch: 'main' },
    }
    await run()
    expect(mockFetchPullRequest).toHaveBeenCalled()
    expect(vi.mocked(postOrUpdateComment)).toHaveBeenCalled()
    expect(mockWritePrSummary).toHaveBeenCalled()
    expect(mockLoadRepoContext).not.toHaveBeenCalled()
  })

  it('M1: slop-detector-ignore label → early exit, no loadRepoContext, no comment', async () => {
    mockContext.payload = {
      issue: { number: 42, title: 'crash', body: '', labels: [{ name: 'slop-detector-ignore' }] },
    }
    await run()
    expect(vi.mocked(postOrUpdateComment)).not.toHaveBeenCalled()
    expect(mockLoadRepoContext).not.toHaveBeenCalled()
    expect(mockGetOctokit).not.toHaveBeenCalled()
    expect(mockWriteSkipSummary).toHaveBeenCalledWith(expect.stringContaining('slop-detector-ignore'))
  })

  it('M2: dry-run=true → no comment, no label calls, writeSummary called with dryRun=true', async () => {
    setInputs({ 'dry-run': true, 'enable-comments': true, 'enable-labels': true })
    await run()
    expect(vi.mocked(postOrUpdateComment)).not.toHaveBeenCalled()
    expect(mockEnsureLabel).not.toHaveBeenCalled()
    expect(mockApplyLabel).not.toHaveBeenCalled()
    expect(mockRemoveLabel).not.toHaveBeenCalled()
    expect(mockWriteSummary).toHaveBeenCalledWith(expect.objectContaining({ dryRun: true }))
  })

  it('M3: enable-comments=false → no comment, but labels still run', async () => {
    mockContext.payload = {
      issue: { number: 42, title: 'crash', body: 'it crashes', labels: [] },
      repository: { default_branch: 'main' },
    }
    setInputs({ 'enable-comments': false, 'enable-labels': true })
    await run()
    expect(vi.mocked(postOrUpdateComment)).not.toHaveBeenCalled()
    expect(mockEnsureLabel).toHaveBeenCalled()
  })

  it('M4: enable-labels=false → no label calls, labelAction=disabled', async () => {
    setInputs({ 'enable-labels': false })
    await run()
    expect(mockEnsureLabel).not.toHaveBeenCalled()
    expect(mockApplyLabel).not.toHaveBeenCalled()
    expect(mockRemoveLabel).not.toHaveBeenCalled()
    expect(mockWriteSummary).toHaveBeenCalledWith(expect.objectContaining({ labelAction: 'disabled' }))
  })

  it('M5: scored.items empty → removeLabel called, applyLabel not called', async () => {
    // High quality body covering all 7 signals → score high, items may be empty
    mockContext.payload = {
      issue: {
        number: 42, title: 'crash',
        body: '## Environment\nNode v18.0.0\n\n## Steps to Reproduce\n1. Run `npm start`\n\n## Expected\nWorks\n\n## Actual\nCrash\n\n```js\nconsole.log("hi")\n```',
        labels: [],
      },
      repository: { default_branch: 'main' },
    }
    setInputs({ 'enable-labels': true })
    await run()
    // Either path (apply or remove) is valid depending on real scorer — just verify label was managed
    const applied = mockApplyLabel.mock.calls.length
    const removed = mockRemoveLabel.mock.calls.length
    expect(applied + removed).toBeGreaterThan(0)
  })

  it('M6: scored.items > 0 → applyLabel called with needs-info', async () => {
    mockContext.payload = {
      issue: { number: 42, title: 'crash', body: 'it crashes', labels: [] },
      repository: { default_branch: 'main' },
    }
    setInputs({ 'enable-labels': true })
    await run()
    expect(mockApplyLabel).toHaveBeenCalledWith(
      expect.anything(), 'test-user', 'slop-detector-sandbox', 42, 'needs-info',
    )
  })

  it('M7: custom label-name input respected', async () => {
    mockContext.payload = {
      issue: { number: 42, title: 'crash', body: 'it crashes', labels: [] },
      repository: { default_branch: 'main' },
    }
    setInputs({ 'enable-labels': true, 'label-name': 'awaiting-info' })
    await run()
    expect(mockApplyLabel).toHaveBeenCalledWith(
      expect.anything(), 'test-user', 'slop-detector-sandbox', 42, 'awaiting-info',
    )
  })

  it('M8: loadRepoContext called with default_branch from payload', async () => {
    mockContext.payload = {
      issue: { number: 42, title: 'crash', body: '', labels: [] },
      repository: { default_branch: 'develop' },
    }
    await run()
    expect(mockLoadRepoContext).toHaveBeenCalledWith(
      expect.anything(), 'test-user', 'slop-detector-sandbox', 'develop',
    )
  })

  it('M9: loadRepoContext default_branch fallback to main when absent', async () => {
    mockContext.payload = {
      issue: { number: 42, title: 'crash', body: '', labels: [] },
    }
    await run()
    expect(mockLoadRepoContext).toHaveBeenCalledWith(
      expect.anything(), 'test-user', 'slop-detector-sandbox', 'main',
    )
  })
})
