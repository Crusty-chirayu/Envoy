/**
 * ENVOY LocalStorage Persistence
 *
 * Provides full offline/demo functionality when Supabase is not configured.
 * The API is intentionally similar to Supabase so the service layer
 * can swap transparently between backends.
 */

import type {
  ProfessionalProfile,
  EnvoyDocument,
  DocumentVersion,
  AIConversation,
  JobTarget,
  ATSReport,
} from '@/types'

const KEYS = {
  PROFILE: 'envoy:profile',
  DOCUMENTS: 'envoy:documents',
  VERSIONS: 'envoy:versions',
  CONVERSATIONS: 'envoy:conversations',
  JOB_TARGETS: 'envoy:job_targets',
  ATS_REPORTS: 'envoy:ats_reports',
  PREFERENCES: 'envoy:preferences',
} as const

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJSON<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    console.error('[LocalStorage] Write failed:', err)
  }
}

// ─────────────────────────────────────────
// Profile
// ─────────────────────────────────────────

export const localProfile = {
  get(): ProfessionalProfile | null {
    return readJSON<ProfessionalProfile | null>(KEYS.PROFILE, null)
  },
  set(profile: ProfessionalProfile): void {
    writeJSON(KEYS.PROFILE, { ...profile, updatedAt: new Date().toISOString() })
  },
  clear(): void {
    if (typeof window !== 'undefined') localStorage.removeItem(KEYS.PROFILE)
  },
}

// ─────────────────────────────────────────
// Documents
// ─────────────────────────────────────────

export const localDocuments = {
  getAll(): EnvoyDocument[] {
    return readJSON<EnvoyDocument[]>(KEYS.DOCUMENTS, [])
  },
  getById(id: string): EnvoyDocument | null {
    const docs = localDocuments.getAll()
    return docs.find(d => d.id === id) ?? null
  },
  save(doc: EnvoyDocument): void {
    const docs = localDocuments.getAll()
    const idx = docs.findIndex(d => d.id === doc.id)
    const updated = { ...doc, updatedAt: new Date().toISOString() }
    if (idx >= 0) {
      docs[idx] = updated
    } else {
      docs.push(updated)
    }
    writeJSON(KEYS.DOCUMENTS, docs)
  },
  delete(id: string): void {
    const docs = localDocuments.getAll().filter(d => d.id !== id)
    writeJSON(KEYS.DOCUMENTS, docs)
  },
}

// ─────────────────────────────────────────
// Versions
// ─────────────────────────────────────────

export const localVersions = {
  getForDocument(documentId: string): DocumentVersion[] {
    const all = readJSON<DocumentVersion[]>(KEYS.VERSIONS, [])
    return all.filter(v => v.documentId === documentId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  },
  save(version: DocumentVersion): void {
    const all = readJSON<DocumentVersion[]>(KEYS.VERSIONS, [])
    all.unshift(version)
    // Keep max 50 versions in localStorage
    writeJSON(KEYS.VERSIONS, all.slice(0, 50))
  },
  delete(id: string): void {
    const all = readJSON<DocumentVersion[]>(KEYS.VERSIONS, []).filter(v => v.id !== id)
    writeJSON(KEYS.VERSIONS, all)
  },
}

// ─────────────────────────────────────────
// AI Conversations
// ─────────────────────────────────────────

export const localConversations = {
  getAll(): AIConversation[] {
    return readJSON<AIConversation[]>(KEYS.CONVERSATIONS, [])
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  },
  getById(id: string): AIConversation | null {
    return localConversations.getAll().find(c => c.id === id) ?? null
  },
  save(conversation: AIConversation): void {
    const all = localConversations.getAll()
    const idx = all.findIndex(c => c.id === conversation.id)
    const updated = { ...conversation, updatedAt: new Date().toISOString() }
    if (idx >= 0) {
      all[idx] = updated
    } else {
      all.unshift(updated)
    }
    writeJSON(KEYS.CONVERSATIONS, all)
  },
  delete(id: string): void {
    const all = localConversations.getAll().filter(c => c.id !== id)
    writeJSON(KEYS.CONVERSATIONS, all)
  },
}

// ─────────────────────────────────────────
// Job Targets
// ─────────────────────────────────────────

export const localJobTargets = {
  getAll(): JobTarget[] {
    return readJSON<JobTarget[]>(KEYS.JOB_TARGETS, [])
  },
  save(job: JobTarget): void {
    const all = localJobTargets.getAll()
    const idx = all.findIndex(j => j.id === job.id)
    if (idx >= 0) {
      all[idx] = job
    } else {
      all.unshift(job)
    }
    writeJSON(KEYS.JOB_TARGETS, all)
  },
  delete(id: string): void {
    const all = localJobTargets.getAll().filter(j => j.id !== id)
    writeJSON(KEYS.JOB_TARGETS, all)
  },
}

// ─────────────────────────────────────────
// ATS Reports
// ─────────────────────────────────────────

export const localATSReports = {
  getLatestForDocument(documentId: string): ATSReport | null {
    const all = readJSON<ATSReport[]>(KEYS.ATS_REPORTS, [])
    return all
      .filter(r => r.documentId === documentId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null
  },
  save(report: ATSReport): void {
    const all = readJSON<ATSReport[]>(KEYS.ATS_REPORTS, [])
    all.unshift(report)
    writeJSON(KEYS.ATS_REPORTS, all.slice(0, 20))
  },
}

// ─────────────────────────────────────────
// Clear all (for sign-out)
// ─────────────────────────────────────────

export function clearAllLocalData(): void {
  if (typeof window === 'undefined') return
  Object.values(KEYS).forEach(key => localStorage.removeItem(key))
}
