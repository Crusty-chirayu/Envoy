/**
 * ENVOY AI Provider Abstraction
 *
 * Provider-agnostic interface for all AI operations.
 * UI code never knows which provider is active.
 *
 * Selected via ENVOY_AI_PROVIDER environment variable:
 *   openai | anthropic | gemini | openrouter
 */

import type { AIProviderName } from '@/types'
import { consumeSSEStream, fetchWithResilience } from './sse'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface StreamChunk {
  type: 'text' | 'done' | 'error'
  content?: string
  error?: string
}

export interface AIRequestOptions {
  temperature?: number
  maxTokens?: number
  stream?: boolean
}

export interface AIProvider {
  readonly name: AIProviderName
  readonly model: string

  /**
   * Single-shot completion
   */
  complete(messages: ChatMessage[], options?: AIRequestOptions): Promise<string>

  /**
   * Streaming completion — returns a ReadableStream of StreamChunk objects
   */
  stream(
    messages: ChatMessage[],
    options?: AIRequestOptions
  ): Promise<ReadableStream<string>>

  /**
   * Structured JSON output — asks the model to return valid JSON matching a schema
   */
  structured<T>(
    messages: ChatMessage[],
    jsonSchema: Record<string, unknown>,
    options?: AIRequestOptions
  ): Promise<T>
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// OpenAI Provider
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Typed provider failure carrying the upstream HTTP status so route
 * handlers can map provider-side conditions (e.g. 402 insufficient
 * credits) to actionable client responses without leaking internals.
 */
export class ProviderError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ProviderError'
    this.status = status
  }
}

/**
 * Resolves the maximum OUTPUT tokens per AI request.
 *
 * Configurable via AI_MAX_TOKENS (clamped 64-8192). Default 1024 instead
 * of the previous hardcoded 4096: gateway credit systems such as
 * OpenRouter's free tier reject requests whose max_tokens exceeds the
 * remaining balance (HTTP 402), so a modest default keeps chat working
 * out of the box while staying tunable for paid accounts.
 */
export function resolveMaxOutputTokens(): number {
  const parsed = Number.parseInt(process.env.AI_MAX_TOKENS ?? '', 10)
  if (!Number.isFinite(parsed)) return 1024
  return Math.min(8192, Math.max(64, parsed))
}


class OpenAIProvider implements AIProvider {
  readonly name: AIProviderName = 'openai'
  readonly model: string

  constructor() {
    this.model = process.env.OPENAI_MODEL ?? 'gpt-4o'
  }

  private getHeaders(): Record<string, string> {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set')
    }
    return {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }
  }

  async complete(messages: ChatMessage[], options: AIRequestOptions = {}): Promise<string> {
    // S5 (audit): connection-phase timeout + bounded retry on transient failures.
    const response = await fetchWithResilience('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new ProviderError(`OpenAI API error ${response.status}: ${error}`, response.status)
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>
    }
    return data.choices[0]?.message?.content ?? ''
  }

  async stream(messages: ChatMessage[], options: AIRequestOptions = {}): Promise<ReadableStream<string>> {
    // S5 (audit): timeout + retry; retry only happens before the body is
    // consumed, so a stream can never be rewound or duplicated.
    const response = await fetchWithResilience('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
        stream: true,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new ProviderError(`OpenAI API error ${response.status}: ${error}`, response.status)
    }

    if (!response.body) {
      throw new Error('OpenAI response has no body')
    }

    // S4 (audit): byte-safe SSE parsing — events split across network chunk
    // boundaries are reassembled instead of being silently dropped.
    const body = response.body
    return new ReadableStream<string>({
      async start(controller) {
        try {
          // [DONE] is handled centrally by consumeSSEStream.
          await consumeSSEStream(body, payload => {
            try {
              const json = JSON.parse(payload) as {
                choices: Array<{ delta: { content?: string } }>
              }
              const content = json.choices[0]?.delta?.content
              if (content) {
                controller.enqueue(content)
              }
            } catch {
              // Skip malformed chunks
            }
          })
          controller.close()
        } catch (err) {
          controller.error(err)
        }
      },
    })
  }

  async structured<T>(
    messages: ChatMessage[],
    jsonSchema: Record<string, unknown>,
    options: AIRequestOptions = {}
  ): Promise<T> {
    const systemMessage: ChatMessage = {
      role: 'system',
      content: `You must respond with valid JSON only. No markdown, no prose. 
The response must conform to this JSON Schema:
${JSON.stringify(jsonSchema, null, 2)}`,
    }

    const allMessages = [systemMessage, ...messages]
    const text = await this.complete(allMessages, { ...options, temperature: 0.1 })

    try {
      // Strip potential markdown code fences
      const cleaned = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim()
      return JSON.parse(cleaned) as T
    } catch {
      throw new Error(`AI returned invalid JSON: ${text.slice(0, 200)}`)
    }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Anthropic Provider
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class AnthropicProvider implements AIProvider {
  readonly name: AIProviderName = 'anthropic'
  readonly model: string

  constructor() {
    this.model = process.env.ANTHROPIC_MODEL ?? 'claude-3-5-sonnet-20241022'
  }

  private getHeaders(): Record<string, string> {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')
    return {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    }
  }

  async complete(messages: ChatMessage[], options: AIRequestOptions = {}): Promise<string> {
    const systemMessages = messages.filter(m => m.role === 'system')
    const chatMessages = messages.filter(m => m.role !== 'system')

    // S5 (audit): connection-phase timeout + bounded retry on transient failures.
    const response = await fetchWithResilience('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: this.model,
        max_tokens: options.maxTokens ?? 4096,
        system: systemMessages.map(m => m.content).join('\n'),
        messages: chatMessages.map(m => ({ role: m.role, content: m.content })),
        temperature: options.temperature ?? 0.7,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new ProviderError(`Anthropic API error ${response.status}: ${error}`, response.status)
    }

    const data = await response.json() as {
      content: Array<{ type: string; text: string }>
    }
    return data.content.find(c => c.type === 'text')?.text ?? ''
  }

  async stream(messages: ChatMessage[], options: AIRequestOptions = {}): Promise<ReadableStream<string>> {
    const systemMessages = messages.filter(m => m.role === 'system')
    const chatMessages = messages.filter(m => m.role !== 'system')

    // S5 (audit): timeout + retry before any body consumption.
    const response = await fetchWithResilience('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: this.model,
        max_tokens: options.maxTokens ?? 4096,
        system: systemMessages.map(m => m.content).join('\n'),
        messages: chatMessages.map(m => ({ role: m.role, content: m.content })),
        stream: true,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new ProviderError(`Anthropic API error ${response.status}: ${error}`, response.status)
    }

    if (!response.body) throw new Error('Anthropic response has no body')

    // S4 (audit): byte-safe SSE parsing shared across all providers.
    const body = response.body
    return new ReadableStream<string>({
      async start(controller) {
        try {
          await consumeSSEStream(body, payload => {
            try {
              const json = JSON.parse(payload) as {
                type: string
                delta?: { type: string; text: string }
              }
              if (json.type === 'content_block_delta' && json.delta?.text) {
                controller.enqueue(json.delta.text)
              }
            } catch {
              // Skip malformed events
            }
          })
          controller.close()
        } catch (err) {
          controller.error(err)
        }
      },
    })
  }

  async structured<T>(
    messages: ChatMessage[],
    jsonSchema: Record<string, unknown>,
    options: AIRequestOptions = {}
  ): Promise<T> {
    const systemMessage: ChatMessage = {
      role: 'system',
      content: `Respond with valid JSON only. No markdown. Schema: ${JSON.stringify(jsonSchema)}`,
    }
    const text = await this.complete([systemMessage, ...messages], { ...options, temperature: 0.1 })
    try {
      const cleaned = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim()
      return JSON.parse(cleaned) as T
    } catch {
      throw new Error(`AI returned invalid JSON: ${text.slice(0, 200)}`)
    }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// OpenRouter Provider (multi-model)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class OpenRouterProvider implements AIProvider {
  readonly name: AIProviderName = 'openrouter'
  readonly model: string

  constructor() {
    this.model = process.env.OPENROUTER_MODEL ?? 'openai/gpt-4o'
  }

  private getHeaders(): Record<string, string> {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set')
    return {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'https://envoy.app',
      'X-Title': 'Envoy',
    }
  }

  async complete(messages: ChatMessage[], options: AIRequestOptions = {}): Promise<string> {
    // S5 (audit): connection-phase timeout + bounded retry on transient failures.
    const response = await fetchWithResilience('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new ProviderError(`OpenRouter API error ${response.status}: ${error}`, response.status)
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>
    }
    return data.choices[0]?.message?.content ?? ''
  }

  async stream(messages: ChatMessage[], options: AIRequestOptions = {}): Promise<ReadableStream<string>> {
    // S5 (audit): timeout + retry before any body consumption.
    const response = await fetchWithResilience('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
        stream: true,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new ProviderError(`OpenRouter API error ${response.status}: ${error}`, response.status)
    }

    if (!response.body) throw new Error('OpenRouter response has no body')

    // OpenRouter uses the same SSE format as OpenAI; S4 (audit): byte-safe
    // chunk-boundary reassembly shared across all providers.
    const body = response.body
    return new ReadableStream<string>({
      async start(controller) {
        try {
          // [DONE] is handled centrally by consumeSSEStream.
          await consumeSSEStream(body, payload => {
            try {
              const json = JSON.parse(payload) as {
                choices: Array<{ delta: { content?: string } }>
              }
              const content = json.choices[0]?.delta?.content
              if (content) controller.enqueue(content)
            } catch { /* skip */ }
          })
          controller.close()
        } catch (err) {
          controller.error(err)
        }
      },
    })
  }

  async structured<T>(
    messages: ChatMessage[],
    jsonSchema: Record<string, unknown>,
    options: AIRequestOptions = {}
  ): Promise<T> {
    const systemMessage: ChatMessage = {
      role: 'system',
      content: `Respond with valid JSON only. No markdown. Schema: ${JSON.stringify(jsonSchema)}`,
    }
    const text = await this.complete([systemMessage, ...messages], { ...options, temperature: 0.1 })
    try {
      const cleaned = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim()
      return JSON.parse(cleaned) as T
    } catch {
      throw new Error(`AI returned invalid JSON: ${text.slice(0, 200)}`)
    }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Gemini Provider
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class GeminiProvider implements AIProvider {
  readonly name: AIProviderName = 'gemini'
  readonly model: string

  constructor() {
    this.model = process.env.GEMINI_MODEL ?? 'gemini-1.5-pro'
  }

  private getApiKey(): string {
    const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('GOOGLE_AI_API_KEY or GEMINI_API_KEY environment variable is not set')
    }
    return apiKey
  }

  private mapMessages(messages: ChatMessage[]) {
    const systemMessages = messages.filter(m => m.role === 'system')
    const chatMessages = messages.filter(m => m.role !== 'system')

    const contents = chatMessages.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }))

    const systemInstruction = systemMessages.length > 0 ? {
      parts: [{ text: systemMessages.map(m => m.content).join('\n') }],
    } : undefined

    return { contents, systemInstruction }
  }

  async complete(messages: ChatMessage[], options: AIRequestOptions = {}): Promise<string> {
    const apiKey = this.getApiKey()
    const { contents, systemInstruction } = this.mapMessages(messages)

    // S5 (audit): connection-phase timeout + bounded retry on transient failures.
    const response = await fetchWithResilience(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          systemInstruction,
          generationConfig: {
            temperature: options.temperature ?? 0.7,
            maxOutputTokens: options.maxTokens ?? 4096,
          },
        }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new ProviderError(`Gemini API error ${response.status}: ${error}`, response.status)
    }

    const data = await response.json() as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>
        }
      }>
    }

    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  }

  async stream(messages: ChatMessage[], options: AIRequestOptions = {}): Promise<ReadableStream<string>> {
    const apiKey = this.getApiKey()
    const { contents, systemInstruction } = this.mapMessages(messages)

    // S5 (audit): timeout + retry before any body consumption.
    const response = await fetchWithResilience(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          systemInstruction,
          generationConfig: {
            temperature: options.temperature ?? 0.7,
            maxOutputTokens: options.maxTokens ?? 4096,
          },
        }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new ProviderError(`Gemini API error ${response.status}: ${error}`, response.status)
    }

    if (!response.body) {
      throw new Error('Gemini response has no body')
    }

    // S4 (audit): replaced the ad-hoc buffer with the shared byte-safe SSE
    // parser used by every provider (also handles CRLF and multi-byte splits).
    const body = response.body
    return new ReadableStream<string>({
      async start(controller) {
        try {
          await consumeSSEStream(body, payload => {
            try {
              const json = JSON.parse(payload) as {
                candidates?: Array<{
                  content?: {
                    parts?: Array<{ text?: string }>
                  }
                }>
              }
              const chunkText = json.candidates?.[0]?.content?.parts?.[0]?.text
              if (chunkText) {
                controller.enqueue(chunkText)
              }
            } catch {
              // Ignore malformed events
            }
          })
          controller.close()
        } catch (err) {
          controller.error(err)
        }
      },
    })
  }

  async structured<T>(
    messages: ChatMessage[],
    jsonSchema: Record<string, unknown>,
    options: AIRequestOptions = {}
  ): Promise<T> {
    const systemInstruction: ChatMessage = {
      role: 'system',
      content: `Respond with valid JSON only. No markdown formatting. Schema: ${JSON.stringify(jsonSchema)}`,
    }

    const text = await this.complete([systemInstruction, ...messages], {
      ...options,
      temperature: 0.1,
    })

    try {
      const cleaned = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim()
      return JSON.parse(cleaned) as T
    } catch {
      throw new Error(`Gemini returned invalid JSON structure: ${text.slice(0, 200)}`)
    }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Provider Factory
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let _instance: AIProvider | null = null

export function getAIProvider(): AIProvider {
  if (_instance) return _instance

  const providerName = (process.env.ENVOY_AI_PROVIDER ?? 'openai') as AIProviderName

  switch (providerName) {
    case 'openai':
      _instance = new OpenAIProvider()
      break
    case 'anthropic':
      _instance = new AnthropicProvider()
      break
    case 'gemini':
      _instance = new GeminiProvider()
      break
    case 'openrouter':
      _instance = new OpenRouterProvider()
      break
    default:
      throw new Error(
        `Unknown AI provider: "${providerName}". ` +
        `Set ENVOY_AI_PROVIDER to one of: openai, anthropic, gemini, openrouter`
      )
  }

  return _instance
}

/**
 * Reset provider instance (for testing)
 */
export function resetAIProvider(): void {
  _instance = null
}
