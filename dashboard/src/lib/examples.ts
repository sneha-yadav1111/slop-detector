// Curated one-click examples for the demo. GitHub refs are real, recognizable repos;
// paste examples are realistic synthetic content for offline demos.

export interface Example {
  label: string
  description: string
  mode: 'github' | 'paste' | 'code'
  ref?: string
  kind?: 'issue' | 'pr'
  title?: string
  body?: string
}

export const EXAMPLES: Example[] = [
  {
    label: 'Hollow AI PR (paste)',
    description: 'Diff-restating description + filler commits',
    mode: 'paste',
    kind: 'pr',
    title: 'Update files',
    body: [
      'This PR introduces the following changes:',
      '',
      '- Updated `userService.ts`',
      '- Modified `authController.ts`',
      '- Refactored `helpers.ts`',
      '- Added new utility functions',
      '',
      'These changes improve the codebase and enhance maintainability.',
    ].join('\n'),
  },
  {
    label: 'Strong PR (paste)',
    description: 'Motivation, testing, risk, linked issue',
    mode: 'paste',
    kind: 'pr',
    title: 'Fix race condition in token refresh (#482)',
    body: [
      '## Why',
      'Two concurrent requests can both trigger a token refresh; the second invalidates',
      'the first and logs the user out. Root cause: no mutual exclusion around refresh.',
      '',
      '## What',
      'Serialize refreshes behind a single in-flight promise so concurrent callers await',
      'the same result.',
      '',
      '## Testing',
      'Added a unit test firing 10 concurrent calls asserting exactly one network refresh.',
      'Verified manually against staging.',
      '',
      '## Risk',
      'Low; lock is per-session. Follow-up needed for multi-tab coordination.',
    ].join('\n'),
  },
  {
    label: 'Low-effort issue (paste)',
    description: 'No repro, no version, no code',
    mode: 'paste',
    kind: 'issue',
    title: 'It does not work',
    body: 'The app keeps crashing when I try to use it. Please fix this asap. Thanks.',
  },
  {
    label: 'Good bug report (paste)',
    description: 'Repro + stack + version + minimal example',
    mode: 'paste',
    kind: 'issue',
    title: 'TypeError on null user in profile route',
    body: [
      '## Steps to reproduce',
      '1. Log in as a user with no profile',
      '2. Navigate to `/profile`',
      '3. Page crashes',
      '',
      '## Expected',
      'Empty-state profile renders.',
      '',
      '## Actual',
      'White screen, console error.',
      '',
      '```js',
      'TypeError: Cannot read properties of null (reading "name")',
      '    at ProfilePage (profile.tsx:42)',
      '```',
      '',
      'Version: app v2.3.1, Node v20.11.0',
    ].join('\n'),
  },
  {
    label: 'Hollow comments (code)',
    description: 'AI comments that restate the code',
    mode: 'code',
    title: 'userService.ts',
    body: [
      '// This function gets the user by id',
      'function getUser(id) {',
      '  // increment the counter',
      '  counter++;',
      '  // loop over the users',
      '  for (const user of users) {',
      '    // check if the id matches',
      '    if (user.id === id) {',
      '      // return the user',
      '      return user;',
      '    }',
      '  }',
      '  // return null',
      '  return null;',
      '}',
    ].join('\n'),
  },
  {
    label: 'Well-commented code',
    description: 'Comments that explain WHY',
    mode: 'code',
    title: 'tokenRefresh.ts',
    body: [
      'async function refresh() {',
      '  // Serialize refreshes: two concurrent callers would otherwise each mint a',
      '  // new token and invalidate the other, logging the user out (see #482).',
      '  if (inFlight) return inFlight;',
      '  // 25s keeps us under the 30s API gateway timeout',
      '  inFlight = withTimeout(doRefresh(), 25_000);',
      '  return inFlight;',
      '}',
    ].join('\n'),
  },
  {
    label: 'Live: real PR (vscode)',
    description: 'Live Fire — scans an actual public PR from the wild',
    mode: 'github',
    ref: 'https://github.com/microsoft/vscode/pull/200000',
  },
  {
    label: 'Live: real PR (react)',
    description: 'Live Fire — scans an actual public facebook/react PR',
    mode: 'github',
    ref: 'https://github.com/facebook/react/pull/28000',
  },
  {
    label: 'Live: React issue',
    description: 'Fetches a real facebook/react issue',
    mode: 'github',
    ref: 'https://github.com/facebook/react/issues/34884',
  },
]
