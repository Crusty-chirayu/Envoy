/**
 * ENVOY — Server-only Supabase service-role client (audit finding S1)
 *
 * Used ONLY by server-side public data assembly to read the minimal public
 * portfolio projection. The service-role key must NEVER appear in client
 * bundles: this module is server-only by construction and is never imported
 * from a 'use client' component.
 *
 * The key is loaded lazily from SUPABASE_SERVICE_ROLE_KEY.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _serviceClient: SupabaseClient | null = null

/**
 * Create (or reuse) the service-role client. Returns null when the required
 * configuration is absent so callers can fail closed.
 */
export function createServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return null

  if (!_serviceClient) {
    _serviceClient = createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }
  return _serviceClient
}

/** Test helper: drop the cached client (forces re-creation). */
export function resetServiceClient(): void {
  _serviceClient = null
}