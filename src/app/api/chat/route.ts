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
    const history = messages.map((m: any) => ({
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
      // Return simulated mock stream response
      const mockResponseText = `[SIMULATED ASSISTANT] Thank you for your inquiry regarding "${document.title}". 
I am running in local simulation mode because no active ${providerName.toUpperCase()} API key was found in the environment.

Here is a recommended enhancement:
- Under Technical Skills, group languages by proficiency.
- Quantify your professional experience bullets. For example: "Led deployment of new database adapter" could be upgraded to: "Designed and deployed a dual-mode local/cloud persistence database layer, reducing average response latency by 35% and supporting 10,000+ local session transactions."

To experience real-time AI suggestions, please add your keys to your .env.local file.`

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

  } catch (err: any) {
    console.error('Chat API Error:', err)
    return NextResponse.json({ error: err?.message || 'An unexpected error occurred inside the AI Agent endpoint' }, { status: 500 })
  }
}
