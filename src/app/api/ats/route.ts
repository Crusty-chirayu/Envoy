import { NextResponse } from 'next/server'
import { analyzeATS } from '@/lib/ats/analyzer'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { profile, document, jobTarget } = body

    if (!profile || !document) {
      return NextResponse.json({ error: 'Missing required parameters (profile, document)' }, { status: 400 })
    }

    const report = analyzeATS(profile, document, document.userId || 'anonymous-user', jobTarget || undefined)
    return NextResponse.json(report)
  } catch (err: unknown) {
    console.error('ATS API Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'An unexpected error occurred inside the ATS Engine' }, 
      { status: 500 }
    )
  }
}
