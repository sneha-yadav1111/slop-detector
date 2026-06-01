import { NextResponse } from 'next/server'
import { getActivity } from '@/lib/activity'
import { llmAvailable } from '@/lib/scan'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    activity: getActivity(),
    llmAvailable: llmAvailable(),
    githubAuthed: Boolean(process.env.GITHUB_TOKEN),
  })
}
