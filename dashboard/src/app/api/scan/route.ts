import { NextResponse } from 'next/server'
import { scanCode, scanGitHub, scanPaste } from '@/lib/scan'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface ScanBody {
  mode: 'github' | 'paste' | 'code'
  ref?: string
  kind?: 'issue' | 'pr'
  title?: string
  body?: string
}

export async function POST(req: Request) {
  let payload: ScanBody
  try {
    payload = (await req.json()) as ScanBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  try {
    if (payload.mode === 'github') {
      if (!payload.ref?.trim()) {
        return NextResponse.json({ error: 'Provide a GitHub issue or PR URL.' }, { status: 400 })
      }
      const result = await scanGitHub(payload.ref)
      return NextResponse.json(result)
    }

    if (payload.mode === 'paste') {
      const kind = payload.kind === 'pr' ? 'pr' : 'issue'
      const body = payload.body ?? ''
      if (!body.trim()) {
        return NextResponse.json({ error: 'Paste some content to scan.' }, { status: 400 })
      }
      const result = await scanPaste(kind, payload.title ?? '', body)
      return NextResponse.json(result)
    }

    if (payload.mode === 'code') {
      const body = payload.body ?? ''
      if (!body.trim()) {
        return NextResponse.json({ error: 'Paste some source code to scan.' }, { status: 400 })
      }
      const result = scanCode(body, payload.title || 'Pasted code')
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'Unknown mode.' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 })
  }
}
