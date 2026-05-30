import { appendFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const FEEDBACK_PATH = join(process.cwd(), '..', 'bench', 'pr-fixtures', 'feedback.jsonl')

export async function POST(req: Request) {
  let body: { scanId?: string; correct?: boolean }
  try {
    body = (await req.json()) as { scanId?: string; correct?: boolean }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body.scanId) {
    return NextResponse.json({ error: 'scanId required' }, { status: 400 })
  }
  try {
    mkdirSync(dirname(FEEDBACK_PATH), { recursive: true })
    appendFileSync(
      FEEDBACK_PATH,
      `${JSON.stringify({ ...body, at: new Date().toISOString() })}\n`,
      'utf8',
    )
  } catch {
    return NextResponse.json({ error: 'Could not write feedback' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
