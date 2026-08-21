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
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
      throw new Error(`OpenAI API error ${response.status}: ${error}`)
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>
    }
    return data.choices[0]?.message?.content ?? ''
  }

  async stream(messages: ChatMessage[], options: AIRequestOptions = {}): Promise<ReadableStream<string>> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
      throw new Error(`OpenAI API error ${response.status}: ${error}`)
    }

    if (!response.body) {
      throw new Error('OpenAI response has no body')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    return new ReadableStream<string>({
      async pull(controller) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            controller.close()
            return
          }

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n').filter(line => line.trim() !== '')

          for (const line of lines) {
            if (line === 'data: [DONE]') {
              controller.close()
              return
            }
            if (!line.startsWith('data: ')) continue

            try {
              const json = JSON.parse(line.slice(6)) as {
                choices: Array<{ delta: { content?: string } }>
              }
              const content = json.choices[0]?.delta?.content
              if (content) {
                controller.enqueue(content)
              }
            } catch {
              // Skip malformed chunks
            }
          }
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

    const response = await fetch('https://api.anthropic.com/v1/messages', {
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
      throw new Error(`Anthropic API error ${response.status}: ${error}`)
    }

    const data = await response.json() as {
      content: Array<{ type: string; text: string }>
    }
    return data.content.find(c => c.type === 'text')?.text ?? ''
  }

  async stream(messages: ChatMessage[], options: AIRequestOptions = {}): Promise<ReadableStream<string>> {
    const systemMessages = messages.filter(m => m.role === 'system')
    const chatMessages = messages.filter(m => m.role !== 'system')

    const response = await fetch('https://api.anthropic.com/v1/messages', {
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
      throw new Error(`Anthropic API error ${response.status}: ${error}`)
    }

    if (!response.body) throw new Error('Anthropic response has no body')

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    return new ReadableStream<string>({
      async pull(controller) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) { controller.close(); return }

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            try {
              const json = JSON.parse(line.slice(6)) as {
                type: string
                delta?: { type: string; text: string }
              }
              if (json.type === 'content_block_delta' && json.delta?.text) {
                controller.enqueue(json.delta.text)
              }
            } catch {
              // Skip
            }
          }
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
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
      throw new Error(`OpenRouter API error ${response.status}: ${error}`)
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>
    }
    return data.choices[0]?.message?.content ?? ''
  }

  async stream(messages: ChatMessage[], options: AIRequestOptions = {}): Promise<ReadableStream<string>> {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
      throw new Error(`OpenRouter API error ${response.status}: ${error}`)
    }

    if (!response.body) throw new Error('OpenRouter response has no body')

    // OpenRouter uses the same SSE format as OpenAI
    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    return new ReadableStream<string>({
      async pull(controller) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) { controller.close(); return }

          const chunk = decoder.decode(value, { stream: true })
          for (const line of chunk.split('\n')) {
            if (line === 'data: [DONE]') { controller.close(); return }
            if (!line.startsWith('data: ')) continue
            try {
              const json = JSON.parse(line.slice(6)) as {
                choices: Array<{ delta: { content?: string } }>
              }
              const content = json.choices[0]?.delta?.content
              if (content) controller.enqueue(content)
            } catch { /* skip */ }
          }
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
    case 'openrouter':
      _instance = new OpenRouterProvider()
      break
    default:
      throw new Error(
        `Unknown AI provider: "${providerName}". ` +
        `Set ENVOY_AI_PROVIDER to one of: openai, anthropic, openrouter`
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
