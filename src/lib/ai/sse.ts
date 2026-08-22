/**
 * ENVOY — AI Transport Resilience Helpers (audit findings S4 / S5)
 *
 * S4 — SSE parsing: `createSSEParser` buffers BYTES across network chunks
 * using an incremental TextDecoder, so Server-Sent Events split across TCP
 * packet boundaries (or multi-byte UTF-8 characters split mid-sequence) are
 * reassembled correctly instead of being silently dropped by per-chunk
 * `split('\n')`.
 *
 * S5 — Timeouts & retry: `fetchWithResilience` wraps provider requests with
 * a connection-phase timeout (abortable) and a bounded retry with jittered
 * backoff for transient failures (network errors, 429, 5xx). Retry is only
 * ever performed BEFORE any response body is consumed, so streams can never
 * be rewound or duplicated.
 */

// ─────────────────────────────────────────
// SSE line parser (S4)
// ─────────────────────────────────────────

export interface SSEParser {
  /** Feed the next raw network chunk. Emits zero or more complete lines. */
  push(chunk: Uint8Array): void
  /**
   * Flush any buffered partial line. Call exactly once when the stream ends;
   * emits the trailing line only if it is non-empty.
   */
  end(): void
}

/**
 * Creates a byte-safe SSE line splitter. Lines are delivered WITHOUT their
 * newline terminator; a trailing carriage return is stripped so CRLF streams
 * behave identically to LF streams.
 */
export function createSSEParser(onLine: (line: string) => void): SSEParser {
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  return {
    push(chunk: Uint8Array) {
      // stream:true keeps incomplete multi-byte sequences buffered inside
      // the decoder until their continuation bytes arrive.
      buffer += decoder.decode(chunk, { stream: true })

      let newlineIndex = buffer.indexOf('\n')
      while (newlineIndex !== -1) {
        const line = buffer.slice(0, newlineIndex)
        buffer = buffer.slice(newlineIndex + 1)
        onLine(line.endsWith('\r') ? line.slice(0, -1) : line)
        newlineIndex = buffer.indexOf('\n')
      }
    },

    end() {
      const remainder = buffer + decoder.decode()
      buffer = ''
      if (remainder.trim().length > 0) {
        onLine(remainder.endsWith('\r') ? remainder.slice(0, -1) : remainder)
      }
    },
  }
}

// ─────────────────────────────────────────
// Timeout + bounded retry (S5)
// ─────────────────────────────────────────

/** Connection-phase timeout for AI provider requests (ms). */
const DEFAULT_TIMEOUT_MS = 60_000

function resolveTimeoutMs(explicit?: number): number {
  if (typeof explicit === 'number' && Number.isFinite(explicit) && explicit > 0) {
    return explicit
  }
  const envValue = Number.parseInt(process.env.AI_TIMEOUT_MS ?? '', 10)
  if (Number.isFinite(envValue) && envValue > 0) return envValue
  return DEFAULT_TIMEOUT_MS
}

/**
 * Fetch with a connection-phase timeout. The timer covers the period until
 * response HEADERS arrive; once headers are received the timer is cleared so
 * long-lived streaming bodies are not cut off mid-flight. An externally
 * supplied signal still aborts the entire request including the body.
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit | undefined,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController()
  const externalSignal = init?.signal

  const forwardAbort = () => controller.abort()
  externalSignal?.addEventListener('abort', forwardAbort)

  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } catch (err) {
    // Distinguish our timeout from an externally-triggered abort.
    if (controller.signal.aborted && !externalSignal?.aborted) {
      throw new Error(`AI provider request timed out after ${timeoutMs}ms`)
    }
    throw err
  } finally {
    clearTimeout(timer)
    externalSignal?.removeEventListener('abort', forwardAbort)
  }
}

// ─────────────────────────────────────────
// Shared SSE body consumer (S4)
// ─────────────────────────────────────────

/**
 * Consume an SSE response body with byte-safe chunk-boundary reassembly.
 *
 * Every complete `data:` line is delivered to `handleData` with the `data:`
 * prefix stripped. The OpenAI-family `[DONE]` sentinel is treated as a
 * control frame: it terminates consumption (upstream connection cancelled)
 * and is NOT delivered to the handler. Handlers may also return `'stop'` to
 * terminate early. Non-data lines (`event:`, `id:`, comments, blank
 * separators) are ignored. A final event without a trailing newline is
 * flushed on stream end. Malformed payloads are the handler's concern —
 * this layer guarantees they arrive COMPLETE, never split.
 */
export async function consumeSSEStream(
  body: ReadableStream<Uint8Array>,
  handleData: (payload: string) => void | 'stop'
): Promise<void> {
  const reader = body.getReader()
  let stopped = false

  const parser = createSSEParser(line => {
    if (stopped) return
    if (!line.startsWith('data:')) return
    const payload = line.slice(5).replace(/^ /, '')
    if (payload === '[DONE]') {
      stopped = true
      return
    }
    if (handleData(payload) === 'stop') {
      stopped = true
    }
  })

  try {
    while (!stopped) {
      const { done, value } = await reader.read()
      if (done) break
      parser.push(value)
    }
    // Flush a final event that lacks a trailing newline.
    if (!stopped) parser.end()
  } finally {
    if (stopped) {
      // Politely terminate the upstream connection after [DONE]/abort.
      try {
        await reader.cancel()
      } catch {
        // Stream may already be closed; nothing to do.
      }
    }
    reader.releaseLock()
  }
}

export interface ResilienceOptions {
  /** Extra attempts after the first failure. Default: 1. */
  retries?: number
  /** Connection-phase timeout in ms. Default: 60s (or AI_TIMEOUT_MS env). */
  timeoutMs?: number
  /** Base backoff between attempts in ms (jitter added). Default: 400. */
  backoffMs?: number
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500
}

/**
 * Fetch with timeout + bounded retry for transient failures.
 *
 * Guarantees:
 *  - A failed attempt's body is fully drained before retrying so sockets
 *    are released and no response is ever partially consumed twice.
 *  - On success the response is returned untouched; callers own the body.
 *  - The final error is always an Error instance with a useful message.
 */
export async function fetchWithResilience(
  url: string,
  init: RequestInit | undefined,
  options?: ResilienceOptions
): Promise<Response> {
  const retries = Math.max(0, options?.retries ?? 1)
  const timeoutMs = resolveTimeoutMs(options?.timeoutMs)
  const backoffMs = options?.backoffMs ?? 400

  let lastError: unknown = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, init, timeoutMs)

      if (!isRetryableStatus(response.status) || attempt === retries) {
        return response
      }

      // Drain and discard the failed attempt's body before backing off.
      await response.arrayBuffer().catch(() => undefined)
      lastError = new Error(`AI provider responded with status ${response.status}`)
    } catch (err) {
      lastError = err
      if (attempt === retries) break
    }

    // Jittered linear backoff avoids synchronized retry storms.
    const delay = backoffMs * (attempt + 1) + Math.random() * 150
    await new Promise(resolve => setTimeout(resolve, delay))
  }

  if (lastError instanceof Error) throw lastError
  throw new Error('AI provider request failed')
}