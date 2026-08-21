import { NextResponse } from 'next/server'
import { getAIProvider } from '@/lib/ai/provider'
import { buildContext } from '@/lib/ai/context'
import type { ChatMessage } from '@/lib/ai/provider'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { 
      messages, 
      profile, 
      document, 
      jobTarget, 
      atsReport,
      selectedSectionId,
      selectedText 
    } = body

    if (!messages || !profile || !document) {
      return NextResponse.json({ error: 'Missing required parameters (messages, profile, document)' }, { status: 400 })
    }

    // 1. Build the system context messages
    const contextMessages = buildContext({
      profile,
      document,
      jobTarget,
      atsReport,
      selectedSectionId,
      selectedText
    })

    // Combine system context messages with the conversation history
    const history = messages.map((m: ChatMessage) => ({
      role: m.role,
      content: m.content
    }))

    const fullMessages: ChatMessage[] = [...contextMessages, ...history]

    // 2. Check if we should run in mock/simulation mode
    const providerName = process.env.ENVOY_AI_PROVIDER ?? 'openai'
    const hasOpenAI = !!process.env.OPENAI_API_KEY
    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY
    const hasGemini = !!(process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY)
    const hasOpenRouter = !!process.env.OPENROUTER_API_KEY

    const isMissingKey = 
      (providerName === 'openai' && !hasOpenAI) ||
      (providerName === 'anthropic' && !hasAnthropic) ||
      (providerName === 'gemini' && !hasGemini) ||
      (providerName === 'openrouter' && !hasOpenRouter)

    if (isMissingKey || process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
      const currentSummary = profile.summary || 'I am a software engineer.'
      const proposedSummary = `Senior Software Architect and Engineer with a track record of building high-performance systems. Designed and deployed a dual-mode local/cloud persistence database layer, reducing average response latency by 35% and supporting 10,000+ local session transactions.`

      const mockResponseText = `[SIMULATED ASSISTANT] I have analyzed your resume context and target profile.
To optimize your visibility to hiring systems and highlight architectural execution, here is a proposed rewrite of your professional summary.

\`\`\`json
{
  "action": "propose_edit",
  "data": {
    "sectionType": "summary",
    "field": "summary",
    "originalValue": ${JSON.stringify(currentSummary)},
    "newValue": ${JSON.stringify(proposedSummary)},
    "explanation": "Elevates summary impact with quantitative metrics (latency reduction, transaction volumes) and clear architecture ownership indicators."
  }
}
\`\`\``

      const encoder = new TextEncoder()
      const words = mockResponseText.split(/(\s+)/)
      
      const customStream = new ReadableStream({
        async start(controller) {
          let index = 0
          const interval = setInterval(() => {
            if (index >= words.length) {
              clearInterval(interval)
              controller.close()
              return
            }
            controller.enqueue(encoder.encode(words[index]))
            index++
          }, 35)
        }
      })

      return new Response(customStream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
        }
      })
    }

    // 3. Run real streaming completion
    const provider = getAIProvider()
    const rawStream = await provider.stream(fullMessages)

    const encoder = new TextEncoder()
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        controller.enqueue(encoder.encode(chunk))
      }
    })

    const stream = rawStream.pipeThrough(transformStream)

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      }
    })

  } catch (err: unknown) {
    console.error('Chat API Error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'An unexpected error occurred inside the AI Agent endpoint' }, { status: 500 })
  }
}
