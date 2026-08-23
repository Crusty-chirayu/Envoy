/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ENVOY Unified Database Abstraction Layer
 *
 * Provides a client-safe persistent storage interface.
 * Transparently dispatches between:
 *  - Connected/Cloud Mode (Supabase / PostgreSQL)
 *  - Demo/Local Mode (localStorage / memory)
 *
 * Saves typescript camelCase entities to database snake_case tables safely.
 */

import { createClient as createBrowserClient } from '@/lib/supabase/client'
import {
  localProfile,
  localDocuments,
  localVersions,
  localConversations,
  localJobTargets,
  localATSReports,
  clearAllLocalData,
} from '@/lib/storage/local'
import type {
  ProfessionalProfile,
  EnvoyDocument,
  DocumentVersion,
  AIConversation,
  JobTarget,
  ATSReport,
  PortfolioSite,
  UserPreferences,
} from '@/types'

// Check if database client parameters are missing or demo mode is explicit
export function checkDemoMode(): boolean {
  if (typeof window === 'undefined') return true
  const isDemoEnv = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
  const hasSupabaseKeys =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return isDemoEnv || !hasSupabaseKeys
}

/**
 * Diagnostic-only serializer for Supabase/PostgREST errors.
 * Exposes ONLY safe, non-sensitive fields (message, code, details, hint,
 * status) so browser logs show the real error instead of `{}`.
 * Never includes tokens, keys, headers, or session data.
 */
export function describeDbError(error: unknown): Record<string, unknown> {
  if (error === null || typeof error !== 'object') {
    return { kind: typeof error, value: String(error) }
  }
  const e = error as Record<string, unknown>
  return {
    name: typeof e.name === 'string' ? e.name : undefined,
    message: typeof e.message === 'string' ? e.message : undefined,
    code: typeof e.code === 'string' ? e.code : undefined,
    details: typeof e.details === 'string' ? e.details : undefined,
    hint: typeof e.hint === 'string' ? e.hint : undefined,
    status: typeof e.status === 'number' ? e.status : undefined,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PROFILES
// ─────────────────────────────────────────────────────────────────────────────

export const dbProfile = {
  async get(userId: string): Promise<ProfessionalProfile | null> {
    if (checkDemoMode()) {
      return localProfile.get()
    }
    const supabase = createBrowserClient()
    // Select the real primary key alongside the JSONB payload. profiles.id is
    // authoritative: FK targets such as portfolio_sites.profile_id and
    // documents.profile_id reference it, so the returned profile must carry
    // the database id rather than the (possibly stale) JSONB `id`.
    const { data, error } = await supabase
      .from('profiles')
      .select('id, data')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      console.error('[DB Profile] Get failed:', error)
      return null
    }
    return data
      ? {
          ...(data.data as ProfessionalProfile),
          id: data.id as string,
        }
      : null
  },

  async save(profile: ProfessionalProfile): Promise<void> {
    if (checkDemoMode()) {
      localProfile.set(profile)
      return
    }
    const supabase = createBrowserClient()
    const { error } = await supabase
      .from('profiles')
      .upsert({
        user_id: profile.userId,
        data: profile,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })

    if (error) {
      console.error('[DB Profile] Save failed:', error)
      throw error
    }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENTS
// ─────────────────────────────────────────────────────────────────────────────

function mapDocToDb(doc: EnvoyDocument) {
  return {
    id: doc.id,
    user_id: doc.userId,
    profile_id: doc.profileId,
    type: doc.type,
    title: doc.title,
    sections: doc.sections,
    settings: doc.settings,
    target_job_id: doc.targetJobId || null,
    created_at: doc.createdAt,
    updated_at: doc.updatedAt,
    last_exported_at: doc.lastExportedAt || null,
  }
}

function mapDocFromDb(row: any): EnvoyDocument {
  return {
    id: row.id,
    userId: row.user_id,
    profileId: row.profile_id,
    type: row.type,
    title: row.title,
    sections: row.sections,
    settings: row.settings,
    targetJobId: row.target_job_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastExportedAt: row.last_exported_at || undefined,
  }
}

export const dbDocuments = {
  async getAll(userId: string): Promise<EnvoyDocument[]> {
    if (checkDemoMode()) {
      return localDocuments.getAll()
    }
    const supabase = createBrowserClient()
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('[DB Documents] GetAll failed:', error)
      return []
    }
    return (data || []).map(mapDocFromDb)
  },

  async getById(id: string): Promise<EnvoyDocument | null> {
    if (checkDemoMode()) {
      return localDocuments.getById(id)
    }
    const supabase = createBrowserClient()
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      console.error('[DB Documents] GetById failed:', error)
      return null
    }
    return data ? mapDocFromDb(data) : null
  },

  async save(doc: EnvoyDocument): Promise<void> {
    if (checkDemoMode()) {
      localDocuments.save(doc)
      return
    }
    const supabase = createBrowserClient()
    const { error } = await supabase
      .from('documents')
      .upsert(mapDocToDb(doc))

    if (error) {
      console.error('[DB Documents] Save failed:', error)
      throw error
    }
  },

  async delete(id: string): Promise<void> {
    if (checkDemoMode()) {
      localDocuments.delete(id)
      return
    }
    const supabase = createBrowserClient()
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[DB Documents] Delete failed:', error)
      throw error
    }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT VERSIONS
// ─────────────────────────────────────────────────────────────────────────────

function mapVersionToDb(version: DocumentVersion, userId: string) {
  return {
    id: version.id,
    document_id: version.documentId,
    user_id: userId,
    label: version.label,
    trigger: version.trigger,
    profile_snapshot: version.profileSnapshot,
    document_snapshot: version.documentSnapshot,
    changed_sections: version.changedSections,
    ai_origin: version.aiOrigin,
    description: version.description || null,
    created_at: version.createdAt,
  }
}

function mapVersionFromDb(row: any): DocumentVersion {
  return {
    id: row.id,
    documentId: row.document_id,
    label: row.label,
    trigger: row.trigger as any,
    profileSnapshot: row.profile_snapshot,
    documentSnapshot: row.document_snapshot,
    changedSections: row.changed_sections || [],
    aiOrigin: row.ai_origin,
    description: row.description || undefined,
    createdAt: row.created_at,
  }
}

export const dbVersions = {
  async getForDocument(documentId: string): Promise<DocumentVersion[]> {
    if (checkDemoMode()) {
      return localVersions.getForDocument(documentId)
    }
    const supabase = createBrowserClient()
    const { data, error } = await supabase
      .from('document_versions')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[DB Versions] GetForDocument failed:', error)
      return []
    }
    return (data || []).map(mapVersionFromDb)
  },

  async save(version: DocumentVersion, userId: string): Promise<void> {
    if (checkDemoMode()) {
      localVersions.save(version)
      return
    }
    const supabase = createBrowserClient()
    const { error } = await supabase
      .from('document_versions')
      .insert(mapVersionToDb(version, userId))

    if (error) {
      console.error('[DB Versions] Save failed:', error)
      throw error
    }
  },

  async delete(id: string): Promise<void> {
    if (checkDemoMode()) {
      localVersions.delete(id)
      return
    }
    const supabase = createBrowserClient()
    const { error } = await supabase
      .from('document_versions')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[DB Versions] Delete failed:', error)
      throw error
    }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// AI CONVERSATIONS & MESSAGES
// ─────────────────────────────────────────────────────────────────────────────

export const dbConversations = {
  async getAll(userId: string): Promise<AIConversation[]> {
    if (checkDemoMode()) {
      return localConversations.getAll()
    }
    const supabase = createBrowserClient()
    const { data, error } = await supabase
      .from('ai_conversations')
      .select('*, ai_messages(*)')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('[DB Conversations] GetAll failed:', error)
      return []
    }
    return (data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      documentId: row.document_id || undefined,
      title: row.title,
      messages: (row.ai_messages || [])
        .map((m: any) => ({
          id: m.id,
          conversationId: m.conversation_id,
          role: m.role as any,
          content: m.content,
          toolCalls: m.tool_calls || undefined,
          toolResults: m.tool_results || undefined,
          createdAt: m.created_at,
        }))
        .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  },

  async save(conv: AIConversation): Promise<void> {
    if (checkDemoMode()) {
      localConversations.save(conv)
      return
    }
    const supabase = createBrowserClient()
    
    // Upsert conversation parent
    const { error: parentError } = await supabase
      .from('ai_conversations')
      .upsert({
        id: conv.id,
        user_id: conv.userId,
        document_id: conv.documentId || null,
        title: conv.title,
        created_at: conv.createdAt,
        updated_at: new Date().toISOString(),
      })

    if (parentError) {
      console.error('[DB Conversations] Save parent failed:', parentError)
      throw parentError
    }

    // Synchronize messages
    if (conv.messages.length > 0) {
      const dbMessages = conv.messages.map(m => ({
        id: m.id,
        conversation_id: conv.id,
        role: m.role,
        content: m.content,
        tool_calls: m.toolCalls || null,
        tool_results: m.toolResults || null,
        created_at: m.createdAt,
      }))

      const { error: msgError } = await supabase
        .from('ai_messages')
        .upsert(dbMessages)

      if (msgError) {
        console.error('[DB Conversations] Save messages failed:', msgError)
        throw msgError
      }
    }
  },

  async delete(id: string): Promise<void> {
    if (checkDemoMode()) {
      localConversations.delete(id)
      return
    }
    const supabase = createBrowserClient()
    const { error } = await supabase
      .from('ai_conversations')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[DB Conversations] Delete failed:', error)
      throw error
    }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// JOB TARGETS
// ─────────────────────────────────────────────────────────────────────────────

function mapJobToDb(job: JobTarget) {
  return {
    id: job.id,
    user_id: job.userId,
    document_id: job.documentId || null,
    title: job.title,
    company: job.company || null,
    description: job.description,
    url: job.url || null,
    extracted: job.extracted || null,
    created_at: job.createdAt,
    updated_at: job.updatedAt,
  }
}

function mapJobFromDb(row: any): JobTarget {
  return {
    id: row.id,
    userId: row.user_id,
    documentId: row.document_id || undefined,
    title: row.title,
    company: row.company || undefined,
    description: row.description,
    url: row.url || undefined,
    extracted: row.extracted || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export const dbJobTargets = {
  async getAll(userId: string): Promise<JobTarget[]> {
    if (checkDemoMode()) {
      return localJobTargets.getAll()
    }
    const supabase = createBrowserClient()
    const { data, error } = await supabase
      .from('job_targets')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('[DB JobTargets] GetAll failed:', error)
      return []
    }
    return (data || []).map(mapJobFromDb)
  },

  async save(job: JobTarget): Promise<void> {
    if (checkDemoMode()) {
      localJobTargets.save(job)
      return
    }
    const supabase = createBrowserClient()
    const { error } = await supabase
      .from('job_targets')
      .upsert(mapJobToDb(job))

    if (error) {
      console.error('[DB JobTargets] Save failed:', error)
      throw error
    }
  },

  async delete(id: string): Promise<void> {
    if (checkDemoMode()) {
      localJobTargets.delete(id)
      return
    }
    const supabase = createBrowserClient()
    const { error } = await supabase
      .from('job_targets')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[DB JobTargets] Delete failed:', error)
      throw error
    }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// ATS REPORTS
// ─────────────────────────────────────────────────────────────────────────────

function mapATSReportToDb(report: ATSReport) {
  return {
    id: report.id,
    document_id: report.documentId,
    user_id: report.userId,
    job_target_id: report.jobTargetId || null,
    overall_score: report.overallScore,
    structure_score: report.structureScore,
    keyword_score: report.keywordScore,
    content_score: report.contentScore,
    readability_score: report.readabilityScore,
    risk_score: report.riskScore,
    issues: report.issues,
    keyword_matches: report.keywordMatches,
    missing_keywords: report.missingKeywords,
    match_percentage: report.matchPercentage || null,
    page_count: report.pageCount,
    word_count: report.wordCount,
    created_at: report.createdAt,
  }
}

function mapATSReportFromDb(row: any): ATSReport {
  return {
    id: row.id,
    documentId: row.document_id,
    userId: row.user_id,
    jobTargetId: row.job_target_id || undefined,
    overallScore: row.overall_score,
    structureScore: row.structure_score,
    keywordScore: row.keyword_score,
    contentScore: row.content_score,
    readabilityScore: row.readability_score,
    riskScore: row.risk_score,
    issues: row.issues || [],
    keywordMatches: row.keyword_matches || [],
    missingKeywords: row.missing_keywords || [],
    matchPercentage: row.match_percentage || undefined,
    pageCount: row.page_count,
    wordCount: row.word_count,
    createdAt: row.created_at,
  }
}

export const dbATSReports = {
  async getLatestForDocument(documentId: string): Promise<ATSReport | null> {
    if (checkDemoMode()) {
      return localATSReports.getLatestForDocument(documentId)
    }
    const supabase = createBrowserClient()
    const { data, error } = await supabase
      .from('ats_reports')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('[DB ATSReports] GetLatest failed:', error)
      return null
    }
    return data ? mapATSReportFromDb(data) : null
  },

  async save(report: ATSReport): Promise<void> {
    if (checkDemoMode()) {
      localATSReports.save(report)
      return
    }
    const supabase = createBrowserClient()
    const { error } = await supabase
      .from('ats_reports')
      .insert(mapATSReportToDb(report))

    if (error) {
      console.error('[DB ATSReports] Save failed:', error)
      throw error
    }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO SITES
// ─────────────────────────────────────────────────────────────────────────────

function mapPortfolioToDb(site: PortfolioSite) {
  return {
    id: site.id,
    user_id: site.userId,
    profile_id: site.profileId,
    slug: site.slug,
    title: site.title,
    description: site.description || null,
    theme: site.theme,
    accent_color: site.accentColor,
    visibility: site.visibility,
    seo_title: site.seoTitle || null,
    seo_description: site.seoDescription || null,
    social_image_url: site.socialImageUrl || null,
    sections: site.sections,
    published_at: site.publishedAt || null,
    custom_domain: site.customDomain || null,
    created_at: site.createdAt,
    updated_at: site.updatedAt,
  }
}

function mapPortfolioFromDb(row: any): PortfolioSite {
  return {
    id: row.id,
    userId: row.user_id,
    profileId: row.profile_id,
    slug: row.slug,
    title: row.title,
    description: row.description || undefined,
    theme: row.theme as any,
    accentColor: row.accent_color,
    visibility: row.visibility as any,
    seoTitle: row.seo_title || undefined,
    seoDescription: row.seo_description || undefined,
    socialImageUrl: row.social_image_url || undefined,
    sections: row.sections || [],
    publishedAt: row.published_at || undefined,
    customDomain: row.custom_domain || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export const dbPortfolios = {
  async getByUserId(userId: string): Promise<PortfolioSite | null> {
    if (checkDemoMode()) {
      // Fetch simulated/mock portfolio from localStorage under a fixed key
      if (typeof window === 'undefined') return null
      const raw = localStorage.getItem(`envoy:portfolio:${userId}`)
      return raw ? JSON.parse(raw) as PortfolioSite : null
    }
    const supabase = createBrowserClient()
    const { data, error } = await supabase
      .from('portfolio_sites')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      console.error('[DB Portfolios] GetByUserId failed:', error)
      return null
    }
    return data ? mapPortfolioFromDb(data) : null
  },

  async getBySlug(slug: string): Promise<PortfolioSite | null> {
    if (checkDemoMode()) {
      if (typeof window === 'undefined') return null
      // Search all keys starting with envoy:portfolio:
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('envoy:portfolio:')) {
          const raw = localStorage.getItem(key)
          if (raw) {
            const site = JSON.parse(raw) as PortfolioSite
            if (site.slug === slug) return site
          }
        }
      }
      return null
    }
    const supabase = createBrowserClient()
    const { data, error } = await supabase
      .from('portfolio_sites')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()

    if (error) {
      console.error('[DB Portfolios] GetBySlug failed:', error)
      return null
    }
    return data ? mapPortfolioFromDb(data) : null
  },

  async save(site: PortfolioSite): Promise<void> {
    if (checkDemoMode()) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(`envoy:portfolio:${site.userId}`, JSON.stringify({
          ...site,
          updatedAt: new Date().toISOString(),
        }))
      }
      return
    }
    const supabase = createBrowserClient()
    const { error } = await supabase
      .from('portfolio_sites')
      .upsert(mapPortfolioToDb(site))

    if (error) {
      console.error('[DB Portfolios] Save failed:', describeDbError(error))
      throw error
    }
  },

  async delete(id: string, userId: string): Promise<void> {
    if (checkDemoMode()) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`envoy:portfolio:${userId}`)
      }
      return
    }
    const supabase = createBrowserClient()
    const { error } = await supabase
      .from('portfolio_sites')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[DB Portfolios] Delete failed:', error)
      throw error
    }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// USER PREFERENCES
// ─────────────────────────────────────────────────────────────────────────────

function mapPreferencesToDb(pref: UserPreferences) {
  return {
    user_id: pref.userId,
    default_template: pref.defaultTemplate,
    default_accent_color: pref.defaultAccentColor,
    default_font_size: pref.defaultFontSize,
    ai_provider: pref.aiProvider,
    ai_model: pref.aiModel || null,
    ai_tone: pref.aiTone,
    allow_public_portfolio: pref.allowPublicPortfolio,
    allow_analytics: pref.allowAnalytics,
    data_retention_days: pref.dataRetentionDays || null,
    theme: pref.theme,
    reduced_motion: pref.reducedMotion,
    editor_zoom: pref.editorZoom,
    updated_at: pref.updatedAt,
  }
}

function mapPreferencesFromDb(row: any): UserPreferences {
  return {
    userId: row.user_id,
    defaultTemplate: row.default_template as any,
    defaultAccentColor: row.default_accent_color,
    defaultFontSize: row.default_font_size as any,
    aiProvider: row.ai_provider as any,
    aiModel: row.ai_model || undefined,
    aiTone: row.ai_tone as any,
    allowPublicPortfolio: row.allow_public_portfolio,
    allowAnalytics: row.allow_analytics,
    dataRetentionDays: row.data_retention_days || undefined,
    theme: row.theme as any,
    reducedMotion: row.reduced_motion,
    editorZoom: Number(row.editor_zoom),
    updatedAt: row.updated_at,
  }
}

export const dbUserPreferences = {
  async get(userId: string): Promise<UserPreferences | null> {
    if (checkDemoMode()) {
      if (typeof window === 'undefined') return null
      const raw = localStorage.getItem(`envoy:preferences:${userId}`)
      return raw ? JSON.parse(raw) as UserPreferences : null
    }
    const supabase = createBrowserClient()
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      console.error('[DB Preferences] Get failed:', error)
      return null
    }
    return data ? mapPreferencesFromDb(data) : null
  },

  async save(pref: UserPreferences): Promise<void> {
    if (checkDemoMode()) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(`envoy:preferences:${pref.userId}`, JSON.stringify({
          ...pref,
          updatedAt: new Date().toISOString(),
        }))
      }
      return
    }
    const supabase = createBrowserClient()
    const { error } = await supabase
      .from('user_preferences')
      .upsert(mapPreferencesToDb(pref))

    if (error) {
      console.error('[DB Preferences] Save failed:', error)
      throw error
    }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH UTILS & DATA RESET
// ─────────────────────────────────────────────────────────────────────────────

export async function clearUserData(userId: string): Promise<void> {
  if (checkDemoMode()) {
    clearAllLocalData()
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`envoy:portfolio:${userId}`)
      localStorage.removeItem(`envoy:preferences:${userId}`)
    }
    return
  }
  // Supabase Auth deletion is handled by system/user triggers cascading deletions.
}
