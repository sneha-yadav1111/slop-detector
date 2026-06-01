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

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }

      const onProgress = (event: { type: string; message: string }) => {
        sendEvent('progress', event)
      }

      try {
        let result
        if (payload.mode === 'github') {
          if (!payload.ref?.trim()) {
            sendEvent('error', { error: 'Provide a GitHub issue or PR URL.' })
            controller.close()
            return
          }
          result = await scanGitHub(payload.ref, onProgress)
        } else if (payload.mode === 'paste') {
          const kind = payload.kind === 'pr' ? 'pr' : 'issue'
          const body = payload.body ?? ''
          if (!body.trim()) {
            sendEvent('error', { error: 'Paste some content to scan.' })
            controller.close()
            return
          }
          result = await scanPaste(kind, payload.title ?? '', body, 'paste', onProgress)
        } else if (payload.mode === 'code') {
          const body = payload.body ?? ''
          if (!body.trim()) {
            sendEvent('error', { error: 'Paste some source code to scan.' })
            controller.close()
            return
          }
          result = scanCode(body, payload.title || 'Pasted code', 'paste', onProgress)
        } else {
          sendEvent('error', { error: 'Unknown mode.' })
          controller.close()
          return
        }

        sendEvent('result', result)
        controller.close()
      } catch (err) {
        sendEvent('error', { error: (err as Error).message })
        controller.close()
      }
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
