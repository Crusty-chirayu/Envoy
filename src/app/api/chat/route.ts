import { NextResponse } from 'next/server'
import { getAIProvider, ProviderError, resolveMaxOutputTokens } from '@/lib/ai/provider'
import { buildContext } from '@/lib/ai/context'
import { getAuthContext, unauthorizedResponse } from '@/lib/security/auth'
import { checkRateLimit, getClientRateLimitKey } from '@/lib/security/rate-limit'
import {
  jsonError,
  parseJsonBody,
  serverErrorResponse,
  validateChatMessages,
  narrowProfile,
  narrowDocument,
  narrowJobTarget,
  narrowATSReport,
} from '@/lib/security/request'
import type { ChatMessage } from '@/lib/ai/provider'

interface ChatRequestBody {
  messages?: unknown
  profile?: unknown
  document?: unknown
  jobTarget?: unknown
  atsReport?: unknown
  selectedSectionId?: unknown
  selectedText?: unknown
}

export async function POST(request: Request) {
  try {
    // 0. Authentication — AI completions are never served anonymously.
    const auth = await getAuthContext()
    if (!auth) return unauthorizedResponse()

    // 1. Rate limiting — protect provider budgets from runaway clients.
    const rateKey = getClientRateLimitKey(auth.userId, request, 'chat')
    const rate = checkRateLimit(rateKey)
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many AI requests. Please wait before trying again.' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } }
      )
    }

    // 2. Size-capped, structural validation of the request body.
    const body = await parseJsonBody<ChatRequestBody>(request)
    if (!body) {
      return jsonError(400, 'Invalid or oversized request body.')
    }

    const messages = validateChatMessages(body.messages)
    if (!messages) {
      return jsonError(400, 'Invalid conversation history.')
    }

    const profile = narrowProfile(body.profile)
    const document = narrowDocument(body.document)
    if (!profile || !document) {
      return jsonError(400, 'Missing or malformed required parameters (profile, document).')
    }

    const jobTarget = narrowJobTarget(body.jobTarget) ?? undefined
    const atsReport = narrowATSReport(body.atsReport) ?? undefined
    const selectedSectionId =
      typeof body.selectedSectionId === 'string' ? body.selectedSectionId : undefined
    const selectedText =
      typeof body.selectedText === 'string' ? body.selectedText.slice(0, 5000) : undefined

    // 3. Build the system context messages
    const contextMessages = buildContext({
      profile,
      document,
      jobTarget,
      atsReport,
      selectedSectionId,
      selectedText,
    })

    const history: ChatMessage[] = messages.map(m => ({
      role: m.role,
      content: m.content,
    }))

    const fullMessages: ChatMessage[] = [...contextMessages, ...history]

    // 4. Check if we should run in mock/simulation mode
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
      // Simulated mode must still feel conversational: it references the
      // user's latest message and the active section instead of returning a
      // byte-identical canned reply on every turn.
      const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')
      const userTopic = lastUserMessage
        ? lastUserMessage.content.trim().slice(0, 160)
        : 'your request'
      const activeSection = selectedSectionId
        ? document.sections.find(s => s.id === selectedSectionId)
        : undefined
      const sectionLabel = activeSection ? ' (' + activeSection.title + ' section)' : ''
      const priorAssistantTurns = messages.filter(m => m.role === 'assistant').length

      const currentSummary = profile.summary || 'I am a software engineer.'
      const proposedSummary = `Senior Software Architect and Engineer with a track record of building high-performance systems. Designed and deployed a dual-mode local/cloud persistence database layer, reducing average response latency by 35% and supporting 10,000+ local session transactions.`

      const followUpNote =
        priorAssistantTurns > 0
          ? `Building on our conversation${sectionLabel}, and your latest message ("${userTopic}"), here is a refined proposal rather than a repeat of my earlier advice.`
          : `I have analyzed your resume context${sectionLabel} in response to "${userTopic}".`

      const mockResponseText = `[SIMULATED ASSISTANT — no AI provider key configured]

${followUpNote}
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

    // 5. Run real streaming completion
    const provider = getAIProvider()
    const rawStream = await provider.stream(fullMessages, { maxTokens: resolveMaxOutputTokens() })

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
    // Provider-side credit exhaustion (e.g. OpenRouter free tier) is an
    // actionable user condition, not an internal failure — surface it.
    if (err instanceof ProviderError && err.status === 402) {
      return NextResponse.json(
        { error: 'Your AI provider account is out of credits. Add credits at https://openrouter.ai/settings/credits, or set a lower AI_MAX_TOKENS value in .env.local to fit your remaining balance.' },
        { status: 402 }
      )
    }

    return serverErrorResponse('Chat API', err)
  }
}