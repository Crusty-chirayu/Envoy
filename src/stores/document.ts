/**
 * ENVOY Document Store
 *
 * Central Zustand store for the active document session.
 * Handles profile, document, save state, AI diffs, and versions.
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { v4 as uuid } from 'uuid'
import type {
  ProfessionalProfile,
  EnvoyDocument,
  DocumentVersion,
  DiffBatch,
  DocumentDiff,
  SaveStatus,
  ATSReport,
  JobTarget,
  AIConversation,
  DocumentSectionConfig,
  SectionType,
  TemplateId,
} from '@/types'

interface DocumentStore {
  // Core state
  profile: ProfessionalProfile | null
  document: EnvoyDocument | null
  saveStatus: SaveStatus
  lastSavedAt: string | null
  isDemoMode: boolean

  // AI state
  activeConversation: AIConversation | null
  pendingDiffs: DiffBatch | null
  isAIThinking: boolean
  aiStreamText: string

  // ATS
  atsReport: ATSReport | null
  isAnalyzingATS: boolean

  // Job targeting
  activeJobTarget: JobTarget | null

  // Versions
  versions: DocumentVersion[]
  isLoadingVersions: boolean

  // UI state
  selectedSectionId: string | null
  selectedText: string | null
  commandPaletteOpen: boolean
  editorZoom: number

  // Actions — Profile
  setProfile: (profile: ProfessionalProfile) => void
  updateProfile: (updates: Partial<ProfessionalProfile>) => void
  updateIdentity: (updates: Partial<ProfessionalProfile['identity']>) => void

  // Actions — Document
  setDocument: (document: EnvoyDocument) => void
  updateDocument: (updates: Partial<EnvoyDocument>) => void
  updateSection: (sectionId: string, updates: Partial<DocumentSectionConfig>) => void
  addSection: (type: SectionType, title: string) => void
  removeSection: (sectionId: string) => void
  reorderSections: (from: number, to: number) => void
  toggleSectionVisibility: (sectionId: string) => void
  setTemplate: (template: TemplateId) => void

  // Actions — Save state
  setSaveStatus: (status: SaveStatus) => void
  markSaved: () => void

  // Actions — AI
  setActiveConversation: (conv: AIConversation | null) => void
  setAIThinking: (thinking: boolean) => void
  setAIStreamText: (text: string) => void
  appendAIStreamText: (chunk: string) => void
  clearAIStreamText: () => void
  setPendingDiffs: (batch: DiffBatch | null) => void
  acceptDiff: (diffId: string) => void
  rejectDiff: (diffId: string) => void
  editDiff: (diffId: string, content: string) => void
  acceptAllDiffs: () => void
  rejectAllDiffs: () => void

  // Actions — ATS
  setATSReport: (report: ATSReport | null) => void
  setAnalyzingATS: (analyzing: boolean) => void

  // Actions — Job target
  setActiveJobTarget: (job: JobTarget | null) => void

  // Actions — Versions
  setVersions: (versions: DocumentVersion[]) => void
  addVersion: (version: DocumentVersion) => void
  createVersion: (label: string, trigger: DocumentVersion['trigger'], description?: string) => DocumentVersion | null

  // Actions — UI
  setSelectedSection: (id: string | null) => void
  setSelectedText: (text: string | null) => void
  setCommandPaletteOpen: (open: boolean) => void
  setEditorZoom: (zoom: number) => void
  setDemoMode: (demo: boolean) => void
}

export const useDocumentStore = create<DocumentStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    profile: null,
    document: null,
    saveStatus: 'idle',
    lastSavedAt: null,
    isDemoMode: false,

    activeConversation: null,
    pendingDiffs: null,
    isAIThinking: false,
    aiStreamText: '',

    atsReport: null,
    isAnalyzingATS: false,

    activeJobTarget: null,

    versions: [],
    isLoadingVersions: false,

    selectedSectionId: null,
    selectedText: null,
    commandPaletteOpen: false,
    editorZoom: 1.0,

    // ─────────────────────────────────────────
    // Profile actions
    // ─────────────────────────────────────────

    setProfile: (profile) => set({ profile }),

    updateProfile: (updates) => {
      set(state => {
        if (!state.profile) return state
        return {
          profile: { ...state.profile, ...updates, updatedAt: new Date().toISOString() },
          saveStatus: 'unsaved',
        }
      })
    },

    updateIdentity: (updates) => {
      set(state => {
        if (!state.profile) return state
        return {
          profile: {
            ...state.profile,
            identity: { ...state.profile.identity, ...updates },
            updatedAt: new Date().toISOString(),
          },
          saveStatus: 'unsaved',
        }
      })
    },

    // ─────────────────────────────────────────
    // Document actions
    // ─────────────────────────────────────────

    setDocument: (document) => set({ document }),

    updateDocument: (updates) => {
      set(state => {
        if (!state.document) return state
        return {
          document: { ...state.document, ...updates, updatedAt: new Date().toISOString() },
          saveStatus: 'unsaved',
        }
      })
    },

    updateSection: (sectionId, updates) => {
      set(state => {
        if (!state.document) return state
        const sections = state.document.sections.map(s =>
          s.id === sectionId ? { ...s, ...updates } : s
        )
        return {
          document: { ...state.document, sections, updatedAt: new Date().toISOString() },
          saveStatus: 'unsaved',
        }
      })
    },

    addSection: (type, title) => {
      set(state => {
        if (!state.document) return state
        const maxOrder = Math.max(0, ...state.document.sections.map(s => s.order))
        const newSection: DocumentSectionConfig = {
          id: uuid(),
          type,
          title,
          visible: true,
          order: maxOrder + 1,
        }
        return {
          document: {
            ...state.document,
            sections: [...state.document.sections, newSection],
            updatedAt: new Date().toISOString(),
          },
          saveStatus: 'unsaved',
        }
      })
    },

    removeSection: (sectionId) => {
      set(state => {
        if (!state.document) return state
        const sections = state.document.sections.filter(s => s.id !== sectionId)
        return {
          document: { ...state.document, sections, updatedAt: new Date().toISOString() },
          saveStatus: 'unsaved',
          selectedSectionId: state.selectedSectionId === sectionId ? null : state.selectedSectionId,
        }
      })
    },

    reorderSections: (from, to) => {
      set(state => {
        if (!state.document) return state
        const sorted = [...state.document.sections].sort((a, b) => a.order - b.order)
        const [moved] = sorted.splice(from, 1)
        sorted.splice(to, 0, moved)
        const reordered = sorted.map((s, idx) => ({ ...s, order: idx }))
        return {
          document: { ...state.document, sections: reordered, updatedAt: new Date().toISOString() },
          saveStatus: 'unsaved',
        }
      })
    },

    toggleSectionVisibility: (sectionId) => {
      const state = get()
      const section = state.document?.sections.find(s => s.id === sectionId)
      if (section) {
        get().updateSection(sectionId, { visible: !section.visible })
      }
    },

    setTemplate: (template) => {
      set(state => {
        if (!state.document) return state
        return {
          document: {
            ...state.document,
            settings: { ...state.document.settings, template },
            updatedAt: new Date().toISOString(),
          },
          saveStatus: 'unsaved',
        }
      })
    },

    // ─────────────────────────────────────────
    // Save state
    // ─────────────────────────────────────────

    setSaveStatus: (saveStatus) => set({ saveStatus }),

    markSaved: () => set({ saveStatus: 'saved', lastSavedAt: new Date().toISOString() }),

    // ─────────────────────────────────────────
    // AI actions
    // ─────────────────────────────────────────

    setActiveConversation: (conv) => set({ activeConversation: conv }),

    setAIThinking: (isAIThinking) => set({ isAIThinking }),

    setAIStreamText: (aiStreamText) => set({ aiStreamText }),

    appendAIStreamText: (chunk) => set(state => ({
      aiStreamText: state.aiStreamText + chunk,
    })),

    clearAIStreamText: () => set({ aiStreamText: '' }),

    setPendingDiffs: (pendingDiffs) => set({ pendingDiffs }),

    acceptDiff: (diffId) => {
      set(state => {
        if (!state.pendingDiffs) return state
        const diffs = state.pendingDiffs.diffs.map(d =>
          d.id === diffId ? { ...d, status: 'accepted' as const } : d
        )
        return { pendingDiffs: { ...state.pendingDiffs, diffs } }
      })
    },

    rejectDiff: (diffId) => {
      set(state => {
        if (!state.pendingDiffs) return state
        const diffs = state.pendingDiffs.diffs.map(d =>
          d.id === diffId ? { ...d, status: 'rejected' as const } : d
        )
        return { pendingDiffs: { ...state.pendingDiffs, diffs } }
      })
    },

    editDiff: (diffId, content) => {
      set(state => {
        if (!state.pendingDiffs) return state
        const diffs = state.pendingDiffs.diffs.map(d =>
          d.id === diffId
            ? { ...d, status: 'edited' as const, editedContent: content }
            : d
        )
        return { pendingDiffs: { ...state.pendingDiffs, diffs } }
      })
    },

    acceptAllDiffs: () => {
      set(state => {
        if (!state.pendingDiffs) return state
        const diffs = state.pendingDiffs.diffs.map(d => ({ ...d, status: 'accepted' as const }))
        return { pendingDiffs: { ...state.pendingDiffs, diffs } }
      })
    },

    rejectAllDiffs: () => {
      set(state => {
        if (!state.pendingDiffs) return state
        const diffs = state.pendingDiffs.diffs.map(d => ({ ...d, status: 'rejected' as const }))
        return { pendingDiffs: { ...state.pendingDiffs, diffs } }
      })
    },

    // ─────────────────────────────────────────
    // ATS
    // ─────────────────────────────────────────

    setATSReport: (atsReport) => set({ atsReport }),
    setAnalyzingATS: (isAnalyzingATS) => set({ isAnalyzingATS }),

    // ─────────────────────────────────────────
    // Job target
    // ─────────────────────────────────────────

    setActiveJobTarget: (activeJobTarget) => set({ activeJobTarget }),

    // ─────────────────────────────────────────
    // Versions
    // ─────────────────────────────────────────

    setVersions: (versions) => set({ versions }),

    addVersion: (version) => {
      set(state => ({ versions: [version, ...state.versions] }))
    },

    createVersion: (label, trigger, description) => {
      const state = get()
      if (!state.profile || !state.document) return null

      const version: DocumentVersion = {
        id: uuid(),
        documentId: state.document.id,
        label,
        trigger,
        profileSnapshot: state.profile,
        documentSnapshot: state.document,
        changedSections: [],
        aiOrigin: trigger === 'ai_accept',
        description,
        createdAt: new Date().toISOString(),
      }

      get().addVersion(version)
      return version
    },

    // ─────────────────────────────────────────
    // UI
    // ─────────────────────────────────────────

    setSelectedSection: (selectedSectionId) => set({ selectedSectionId }),
    setSelectedText: (selectedText) => set({ selectedText }),
    setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
    setEditorZoom: (editorZoom) => set({ editorZoom: Math.max(0.5, Math.min(2.0, editorZoom)) }),
    setDemoMode: (isDemoMode) => set({ isDemoMode }),
  }))
)

// ─────────────────────────────────────────
// Selectors (for performance — prevent unnecessary re-renders)
// ─────────────────────────────────────────

export const useProfile = () => useDocumentStore(s => s.profile)
export const useDocument = () => useDocumentStore(s => s.document)
export const useSaveStatus = () => useDocumentStore(s => s.saveStatus)
export const useAIThinking = () => useDocumentStore(s => s.isAIThinking)
export const useAIStreamText = () => useDocumentStore(s => s.aiStreamText)
export const usePendingDiffs = () => useDocumentStore(s => s.pendingDiffs)
export const useATSReport = () => useDocumentStore(s => s.atsReport)
export const useSelectedSection = () => useDocumentStore(s => s.selectedSectionId)
export const useCommandPaletteOpen = () => useDocumentStore(s => s.commandPaletteOpen)
export const useEditorZoom = () => useDocumentStore(s => s.editorZoom)
export const useVersions = () => useDocumentStore(s => s.versions)
export const useActiveJobTarget = () => useDocumentStore(s => s.activeJobTarget)
