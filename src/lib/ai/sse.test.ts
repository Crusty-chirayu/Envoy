/**
 * Tests for AI transport resilience helpers (audit findings S4 / S5).
 *
 * S4: the SSE parser must correctly reassemble events split across network
 * chunk boundaries — including multi-byte UTF-8 characters split mid-sequence
 * — which the previous per-chunk line splitting silently dropped.
 *
 * S5: fetchWithResilience must retry transient failures (network errors,
 * 429, 5xx) with backoff, drain failed bodies, and never retry after a
 * successful response is returned.
 */

import { describe, it, expect, vi } from 'vitest'
import { consumeSSEStream, createSSEParser, fetchWithResilience } from './sse'

// Avoid literal escape sequences in source; derive control characters safely.
const NL = String.fromCharCode(10)
const CR = String.fromCharCode(13)

const encoder = new TextEncoder()

function linesFrom(chunks: Uint8Array[]): string[] {
  const received: string[] = []
  const parser = createSSEParser(line => received.push(line))
  for (const chunk of chunks) parser.push(chunk)
  parser.end()
  return received
}

describe('createSSEParser — chunk-boundary reassembly (S4)', () => {
  it('reassembles an SSE event split across two chunks', () => {
    const full = 'data: {"choices":[{"delta":{"content":"Hello"}}]}' + NL + NL
    const splitAt = 20 // mid-JSON
    const received = linesFrom([
      encoder.encode(full.slice(0, splitAt)),
      encoder.encode(full.slice(splitAt)),
    ])
    expect(received).toEqual([
      'data: {"choices":[{"delta":{"content":"Hello"}}]}',
      '',
    ])
  })

  it('reassembles many tiny fragments of one line', () => {
    const bytes = encoder.encode('data: [DONE]' + NL)
    const chunks = Array.from(bytes, b => new Uint8Array([b]))
    expect(linesFrom(chunks)).toEqual(['data: [DONE]'])
  })

  it('handles a multi-byte UTF-8 character split across chunk boundaries', () => {
    // "é" is 2 bytes (0xC3 0xA9); split between them.
    const bytes = encoder.encode('data: café' + NL)
    const splitIndex = bytes.length - 2 // inside the é sequence
    const received = linesFrom([bytes.slice(0, splitIndex), bytes.slice(splitIndex)])
    // A single trailing newline terminates ONE line; no extra empty line.
    expect(received).toEqual(['data: café'])
  })

  it('emits each complete line immediately as chunks arrive (streaming behavior)', () => {
    const received: string[] = []
    const parser = createSSEParser(line => received.push(line))

    parser.push(encoder.encode('data: one' + NL + 'data: tw'))
    expect(received).toEqual(['data: one'])

    parser.push(encoder.encode('o' + NL + 'data: three' + NL))
    expect(received).toEqual(['data: one', 'data: two', 'data: three'])

    parser.end()
    expect(received).toEqual(['data: one', 'data: two', 'data: three'])
  })

  it('flushes a trailing line without a final newline on end()', () => {
    const received = linesFrom([encoder.encode('data: last-event-no-newline')])
    expect(received).toEqual(['data: last-event-no-newline'])
  })

  it('normalizes CRLF line endings', () => {
    const received = linesFrom([encoder.encode('data: a' + CR + NL + 'data: b' + CR + NL)])
    expect(received).toEqual(['data: a', 'data: b'])
  })

  it('emits nothing extra on clean end() after a final newline', () => {
    const received = linesFrom([encoder.encode('data: x' + NL)])
    expect(received).toEqual(['data: x'])
  })

  it('emits the empty line between double newlines', () => {
    const received = linesFrom([encoder.encode('data: a' + NL + NL + 'data: b' + NL)])
    expect(received).toEqual(['data: a', '', 'data: b'])
  })
})

describe('consumeSSEStream — provider stream consumption (S4)', () => {
  function sseBody(chunks: string[]): ReadableStream<Uint8Array> {
    return new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
        controller.close()
      },
    })
  }

  async function collect(body: ReadableStream<Uint8Array>): Promise<string[]> {
    const payloads: string[] = []
    await consumeSSEStream(body, payload => {
      payloads.push(payload)
    })
    return payloads
  }

  it('delivers multiple events contained in a single chunk', async () => {
    const payloads = await collect(
      sseBody(['data: {"a":1}' + NL + 'data: {"a":2}' + NL + 'data: {"a":3}' + NL])
    )
    expect(payloads).toEqual(['{"a":1}', '{"a":2}', '{"a":3}'])
  })

  it('reassembles one event split across multiple chunks', async () => {
    const full = 'data: {"choices":[{"delta":{"content":"Hi"}}]}' + NL
    const bytes = encoder.encode(full)
    const mid = Math.floor(bytes.length / 2)
    const payloads = await collect(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(bytes.slice(0, mid))
          controller.enqueue(bytes.slice(mid))
          controller.close()
        },
      })
    )
    expect(payloads).toEqual(['{"choices":[{"delta":{"content":"Hi"}}]}'])
  })

  it("stops on [DONE] and does not deliver events after it", async () => {
    const payloads = await collect(
      sseBody([
        'data: first' + NL + 'data: [DONE]' + NL + 'data: after-done' + NL,
      ])
    )
    expect(payloads).toEqual(['first'])
  })

  it('ignores non-data lines (event:, id:, comments, blank separators)', async () => {
    const payloads = await collect(
      sseBody([
        'event: message' + NL +
        'id: 42' + NL +
        ': keep-alive comment' + NL +
        'data: real-payload' + NL +
        NL,
      ])
    )
    expect(payloads).toEqual(['real-payload'])
  })

  it('strips exactly one leading space so JSON payloads parse', async () => {
    const payloads = await collect(sseBody(['data: {"ok":true}' + NL]))
    expect(JSON.parse(payloads[0])).toEqual({ ok: true })
  })

  it('flushes a final event that lacks a trailing newline', async () => {
    const payloads = await collect(sseBody(['data: tail-without-newline']))
    expect(payloads).toEqual(['tail-without-newline'])
  })
})

describe('fetchWithResilience — timeout & retry (S5)', () => {
  function jsonResponse(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), { status })
  }

  function withMockedFetch(mock: ReturnType<typeof vi.fn>): () => void {
    const originalFetch = globalThis.fetch
    globalThis.fetch = mock as unknown as typeof fetch
    return () => {
      globalThis.fetch = originalFetch
    }
  }

  it('retries on 500 and succeeds on the second attempt', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(500, { error: 'boom' }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }))
    const restore = withMockedFetch(fetchMock)

    try {
      const response = await fetchWithResilience(
        'https://provider.test/v1',
        undefined,
        { retries: 1, backoffMs: 1 }
      )
      expect(response.status).toBe(200)
      expect(fetchMock).toHaveBeenCalledTimes(2)
    } finally {
      restore()
    }
  })

  it('retries on 429 then network errors, and throws the last error', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(429, {}))
      .mockRejectedValueOnce(new TypeError('network down'))
    const restore = withMockedFetch(fetchMock)

    try {
      await expect(
        fetchWithResilience('https://provider.test/v1', undefined, { retries: 1, backoffMs: 1 })
      ).rejects.toThrow('network down')
      expect(fetchMock).toHaveBeenCalledTimes(2)
    } finally {
      restore()
    }
  })

  it('does NOT retry non-retryable client errors like 401', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(401, { error: 'bad key' }))
    const restore = withMockedFetch(fetchMock)

    try {
      const response = await fetchWithResilience(
        'https://provider.test/v1',
        undefined,
        { retries: 3, backoffMs: 1 }
      )
      expect(response.status).toBe(401)
      expect(fetchMock).toHaveBeenCalledTimes(1)
    } finally {
      restore()
    }
  })

  it('surfaces a clear timeout error when the provider never responds', async () => {
    const hangingFetch = ((_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError'))
        )
      })) as unknown as typeof fetch
    const restore = withMockedFetch(vi.fn(hangingFetch))

    try {
      await expect(
        fetchWithResilience('https://provider.test/v1', undefined, {
          retries: 0,
          timeoutMs: 30,
        })
      ).rejects.toThrow('timed out')
    } finally {
      restore()
    }
  })
})