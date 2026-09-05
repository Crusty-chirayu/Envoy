'use client'

import React, { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Logo } from '@/components/Logo'
import { dbDocuments, dbProfile, checkDemoMode, dbATSReports, dbJobTargets, dbVersions } from '@/lib/db'
import { useDocumentStore } from '@/stores/document'
import { A4Canvas } from '@/components/A4Canvas'
import { AgentSidebar } from '@/components/AgentSidebar'
import type { DocumentSectionConfig, AIConversation, AIMessage, JobTarget, ATSReport, TemplateId, DocumentVersion, ExperienceEntry, SkillGroup, ProjectEntry } from '@/types'
import {
  ArrowLeft, Download, Loader, Eye, EyeOff, History, ChevronDown, X,
  FileText, FileType, FileCode, RotateCcw, Sparkles, Clock, Check
} from 'lucide-react'
import { v4 as uuid } from 'uuid'
// NOTE: The docx generator is dynamically imported inside its export handler
// so the large `docx` dependency stays out of the initial editor bundle.
import { generatePlainText } from '@/lib/export/txt'
import { validateProposalBlock, type ValidatedProposal } from '@/lib/validation/proposal'
import { parseNavigationCommand, resolveNavigation } from '@/lib/ai/navigation'

function EditorWorkspace() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const documentId = searchParams.get('id')

  // Zustand Store hooks
  const profile = useDocumentStore(s => s.profile)
  const document = useDocumentStore(s => s.document)
  const saveStatus = useDocumentStore(s => s.saveStatus)
  const setProfile = useDocumentStore(s => s.setProfile)
  const setDocument = useDocumentStore(s => s.setDocument)
  const updateProfile = useDocumentStore(s => s.updateProfile)
  const updateDocument = useDocumentStore(s => s.updateDocument)
  const updateSection = useDocumentStore(s => s.updateSection)
  const toggleSectionVisibility = useDocumentStore(s => s.toggleSectionVisibility)
  const reorderSections = useDocumentStore(s => s.reorderSections)
  const setTemplate = useDocumentStore(s => s.setTemplate)
  const setSaveStatus = useDocumentStore(s => s.setSaveStatus)
  const markSaved = useDocumentStore(s => s.markSaved)
  const createVersion = useDocumentStore(s => s.createVersion)

  // Local state
  const [loading, setLoading] = useState(true)
  const [zoom, setZoom] = useState(0.85)
  const [editingSection, setEditingSection] = useState<DocumentSectionConfig | null>(null)
  const [showExportMenu, setShowExportMenu] = useState(false)

  // Active section focus for AI context + deterministic navigation.
  // Tracks which document section the user is currently working on so the
  // AI request always carries the real editing focus.
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)

  // AI related state
  const [conversation, setConversation] = useState<AIConversation | null>(null)
  const [isThinking, setIsThinking] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [jobTarget, setJobTarget] = useState<JobTarget | null>(null)
  const [atsReport, setAtsReport] = useState<ATSReport | null>(null)

  // Version History states
  const [versions, setVersions] = useState<DocumentVersion[]>([])
  const [showVersionsModal, setShowVersionsModal] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState<DocumentVersion | null>(null)

  // Rollback to selected snapshot version
  const handleRollbackVersion = async (version: DocumentVersion) => {
    if (!window.confirm(`Are you sure you want to rollback to version "${version.label}"? All active changes will be reverted.`)) {
      return
    }

    try {
      // 1. Create a safety backup checkpoint of the active state before rolling back
      if (profile && document) {
        const backupVer = createVersion(
          `Pre-Rollback Backup (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
          'manual',
          `Safety snapshot saved automatically before reverting to "${version.label}"`
        )
        if (backupVer) {
          await dbVersions.save(backupVer, document.userId)
        }
      }

      // 2. Revert profile and document state to selected snapshot
      setProfile(version.profileSnapshot)
      setDocument(version.documentSnapshot)

      await dbProfile.save(version.profileSnapshot)
      await dbDocuments.save(version.documentSnapshot)

      // 3. Refresh version history list
      if (document) {
        const updatedList = await dbVersions.getForDocument(document.id)
        setVersions(updatedList)
      }

      alert('Rollback successful! A safety backup of your previous state has been created in Version History.')
      setShowVersionsModal(false)
      setSelectedVersion(null)
    } catch (err: unknown) {
      console.error('Rollback failed:', err)
      alert(`Rollback failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  // Sync ref for debouncing
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Close the export dropdown when clicking outside of it
  useEffect(() => {
    if (!showExportMenu) return
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-export-menu]')) setShowExportMenu(false)
    }
    window.document.addEventListener('mousedown', onPointerDown)
    return () => window.document.removeEventListener('mousedown', onPointerDown)
  }, [showExportMenu])

  // Close overlays with the Escape key (keyboard accessibility)
  useEffect(() => {
    if (!showVersionsModal && !editingSection) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (showVersionsModal) {
        setShowVersionsModal(false)
        setSelectedVersion(null)
      } else if (editingSection) {
        setEditingSection(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showVersionsModal, editingSection])

  // Keep the AI active-section focus valid when sections are removed/hidden
  useEffect(() => {
    if (!document) return
    const visible = [...document.sections]
      .filter(s => s.visible)
      .sort((a, b) => a.order - b.order)
    if (visible.length === 0) {
      if (activeSectionId !== null) setActiveSectionId(null)
      return
    }
    if (!activeSectionId || !visible.some(s => s.id === activeSectionId)) {
      setActiveSectionId(visible[0].id)
    }
  }, [document, activeSectionId])

  // Load document and profile from DB
  useEffect(() => {
    if (!documentId) {
      router.push('/dashboard')
      return
    }

    const loadData = async () => {
      try {
        const doc = await dbDocuments.getById(documentId)
        if (!doc) {
          router.push('/dashboard')
          return
        }
        setDocument(doc)

        // Initialize the AI active-section focus to the first visible section
        const firstVisible = [...doc.sections]
          .filter(s => s.visible)
          .sort((a, b) => a.order - b.order)[0]
        setActiveSectionId(firstVisible?.id ?? null)

        const prof = await dbProfile.get(doc.userId)
        if (prof) {
          setProfile(prof)
        }

        // Load associated job targets & ATS report
        const report = await dbATSReports.getLatestForDocument(doc.id)
        if (report) setAtsReport(report)

        if (doc.targetJobId) {
          const targets = await dbJobTargets.getAll(doc.userId)
          const matched = targets.find(t => t.id === doc.targetJobId)
          if (matched) setJobTarget(matched)
        }

        // Load versions list
        const list = await dbVersions.getForDocument(doc.id)
        setVersions(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))

        // Initialize empty conversation
        setConversation({
          id: uuid(),
          userId: doc.userId,
          documentId: doc.id,
          title: 'Career Consult',
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })

      } catch (err) {
        console.error('Editor initialization failed:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [documentId, router, setDocument, setProfile])

  // Autosave listener: triggers when store saveStatus === 'unsaved'
  useEffect(() => {
    if (saveStatus !== 'unsaved' || !document || !profile) return

    // Debounce save for 1.5 seconds
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)

    setSaveStatus('saving')
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await dbDocuments.save(document)
        await dbProfile.save(profile)
        markSaved()
      } catch (err) {
        console.error('Autosave sync failed:', err)
        setSaveStatus('error')
      }
    }, 1500)

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [saveStatus, document, profile, setSaveStatus, markSaved])

  // AI chat triggers
  const handleSendMessage = async (text: string) => {
    if (!conversation || !profile || !document) return

    const userMsg: AIMessage = {
      id: uuid(),
      conversationId: conversation.id,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    }

    const updatedMessages = [...conversation.messages, userMsg]
    setConversation({
      ...conversation,
      messages: updatedMessages,
    })

    // ── Deterministic navigation commands ────────────────────────────
    // "next" / "continue" / "go to education" are APPLICATION ACTIONS,
    // not conversation. They are executed here against the document's real
    // section model and never sent to the LLM (which cannot mutate app
    // state). This guarantees the editing workflow actually advances.
    const navCommand = parseNavigationCommand(text)
    if (navCommand) {
      const resolution = resolveNavigation(document.sections, activeSectionId, navCommand)
      let navMessage: string
      if (resolution.ok) {
        setActiveSectionId(resolution.sectionId)
        navMessage =
          resolution.direction === 'goto'
            ? `Switched to the ${resolution.sectionTitle} section (${resolution.index + 1} of ${resolution.total}). Tell me what to improve here, or say "next" to keep moving.`
            : resolution.direction === 'next'
              ? `Moved to the ${resolution.sectionTitle} section (${resolution.index + 1} of ${resolution.total}). Tell me what to improve here, or say "next" to keep moving.`
              : `Moved back to the ${resolution.sectionTitle} section (${resolution.index + 1} of ${resolution.total}).`
      } else if (resolution.reason === 'already-last') {
        navMessage = 'You are already on the last section of this document. Tell me what to refine here, or name another section (e.g. "go to experience").'
      } else if (resolution.reason === 'already-first') {
        navMessage = 'You are already on the first section of this document. Say "next" to move forward, or name a section (e.g. "go to skills").'
      } else if (resolution.reason === 'unknown-target') {
        const target = navCommand.kind === 'goto' ? navCommand.target : 'that'
        const visibleTitles = [...document.sections]
          .filter(s => s.visible)
          .sort((a, b) => a.order - b.order)
          .map(s => s.title)
          .join(', ')
        navMessage = `I could not find a section matching "${target}". This document has: ${visibleTitles}.`
      } else {
        navMessage = 'This document has no visible sections to navigate.'
      }

      setConversation(prev => {
        if (!prev) return null
        return {
          ...prev,
          messages: [
            ...prev.messages,
            {
              id: uuid(),
              conversationId: prev.id,
              role: 'assistant' as const,
              content: navMessage,
              createdAt: new Date().toISOString(),
            },
          ],
        }
      })
      return
    }

    setIsThinking(true)
    setStreamText('')

    try {
      // Bounded conversation memory: the most recent turns give the model
      // real context without unbounded payload growth (server caps at 50).
      const recentMessages = updatedMessages.slice(-20)

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: recentMessages,
          profile,
          document,
          jobTarget,
          atsReport,
          selectedSectionId: activeSectionId,
        }),
      })

      if (!response.ok) {
        let detail = `AI Agent endpoint responded with status ${response.status}`
        try {
          const data = await response.json()
          if (data && typeof data.error === 'string') detail = data.error
        } catch {
          // Non-JSON body — keep the generic status message.
        }
        throw new Error(detail)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('AI response body is null or not readable')
      }

      setIsThinking(false)

      const decoder = new TextDecoder()
      let accumulatedText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        accumulatedText += chunk
        setStreamText(accumulatedText)
      }

      const assistantMsg: AIMessage = {
        id: uuid(),
        conversationId: conversation.id,
        role: 'assistant',
        content: accumulatedText,
        createdAt: new Date().toISOString(),
      }

      setConversation(prev => {
        if (!prev) return null
        return {
          ...prev,
          messages: [...prev.messages, assistantMsg],
        }
      })
    } catch (err: unknown) {
      console.error('Streaming connection failed:', err)
      const errorMsg = `[ERROR] Streaming connection failed: ${err instanceof Error ? err.message : 'Please check API configurations.'}`
      const assistantMsg: AIMessage = {
        id: uuid(),
        conversationId: conversation.id,
        role: 'assistant',
        content: errorMsg,
        createdAt: new Date().toISOString(),
      }
      setConversation(prev => {
        if (!prev) return null
        return {
          ...prev,
          messages: [...prev.messages, assistantMsg],
        }
      })
    } finally {
      setIsThinking(false)
      setStreamText('')
    }
  }

  // Update target job posting using backend extraction route
  const handleUpdateJobTarget = async (desc: string) => {
    if (!document || !profile) return

    try {
      const response = await fetch('/api/jobs/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description: desc }),
      })

      if (!response.ok) {
        throw new Error(`Failed to extract job metrics: ${response.status}`)
      }

      const parsed = await response.json()

      const newTarget: JobTarget = {
        id: uuid(),
        userId: document.userId,
        documentId: document.id,
        title: parsed.role || 'Target Role',
        company: parsed.company || 'Target Company',
        description: desc,
        extracted: parsed.extracted || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await dbJobTargets.save(newTarget)
      setJobTarget(newTarget)

      // Associate with document
      updateDocument({ targetJobId: newTarget.id })

      // Automatically recalculate ATS matching metrics
      const atsResponse = await fetch('/api/ats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profile,
          document,
          jobTarget: newTarget,
        }),
      })

      if (atsResponse.ok) {
        const report = await atsResponse.json()
        await dbATSReports.save(report)
        setAtsReport(report)
      }

      alert('Job target updated and ATS matching recalculated successfully!')
    } catch (err: unknown) {
      console.error('Job target update failed:', err)
      alert(`Job target update failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  // Execute backend algorithmic ATS check
  const handleRunATSAnalysis = async () => {
    if (!profile || !document) return

    try {
      const response = await fetch('/api/ats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profile,
          document,
          jobTarget,
        }),
      })

      if (!response.ok) {
        throw new Error(`ATS Engine responded with status ${response.status}`)
      }

      const report = await response.json()
      await dbATSReports.save(report)
      setAtsReport(report)
    } catch (err: unknown) {
      console.error('ATS scan failed:', err)
      alert(`ATS Scan failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  // Apply AI proposal modifications to the Canonical Profile state.
  //
  // SECURITY GATE (audit finding S3): this is the ONLY path from an AI
  // suggestion to canonical state. Every proposal is re-validated here
  // against the strict allowlist in lib/validation/proposal.ts, and the
  // referenced item must exist in the live profile. The full mutation plan
  // is resolved BEFORE any side effect: invalid proposals, unknown items,
  // or unexpected value shapes are rejected with ZERO canonical side
  // effects — no store update, no persistence, no version checkpoint.
  // Field application uses explicit branches; the model can never select
  // an arbitrary object key.
  const handleAcceptProposal = (rawProposal: ValidatedProposal) => {
    if (!profile || !document) return

    // 1. Re-validate at the mutation boundary (defense in depth).
    const validation = validateProposalBlock({ action: 'propose_edit', data: rawProposal })
    if (!validation.ok) {
      alert(`This AI suggestion was blocked by the safety validator and was NOT applied. Reason: ${validation.error}`)
      return
    }
    const proposal = validation.proposal

    // 2. Resolve the complete mutation plan before touching anything.
    const updatedProfile = { ...profile }
    let rejectionReason: string | null = null

    if (proposal.sectionType === 'summary') {
      if (typeof proposal.newValue === 'string') {
        updatedProfile.summary = proposal.newValue
      } else {
        rejectionReason = 'Summary proposal must be plain text.'
      }
    } else if (proposal.sectionType === 'experience') {
      const itemId = proposal.itemId ?? ''
      const index = updatedProfile.experience.findIndex(exp => exp.id === itemId)
      if (index === -1) {
        rejectionReason = 'The referenced work-experience entry no longer exists.'
      } else {
        const current = updatedProfile.experience[index]
        let next: ExperienceEntry | null = null
        switch (proposal.field) {
          case 'bullets':
            if (Array.isArray(proposal.newValue)) next = { ...current, bullets: proposal.newValue }
            break
          case 'technologies':
            if (Array.isArray(proposal.newValue)) next = { ...current, technologies: proposal.newValue }
            break
          case 'role':
            if (typeof proposal.newValue === 'string') next = { ...current, role: proposal.newValue }
            break
          case 'company':
            if (typeof proposal.newValue === 'string') next = { ...current, company: proposal.newValue }
            break
          case 'location':
            if (typeof proposal.newValue === 'string') next = { ...current, location: proposal.newValue }
            break
        }
        if (!next) {
          rejectionReason = `Unexpected value shape for experience.${proposal.field}.`
        } else {
          const nextList = [...updatedProfile.experience]
          nextList[index] = next
          updatedProfile.experience = nextList
        }
      }
    } else if (proposal.sectionType === 'skills') {
      const itemId = proposal.itemId ?? ''
      const index = updatedProfile.skills.findIndex(group => group.id === itemId)
      if (index === -1) {
        rejectionReason = 'The referenced skills group no longer exists.'
      } else {
        const current = updatedProfile.skills[index]
        let next: SkillGroup | null = null
        switch (proposal.field) {
          case 'skills':
            if (Array.isArray(proposal.newValue)) next = { ...current, skills: proposal.newValue }
            break
          case 'category':
            if (typeof proposal.newValue === 'string') next = { ...current, category: proposal.newValue }
            break
        }
        if (!next) {
          rejectionReason = `Unexpected value shape for skills.${proposal.field}.`
        } else {
          const nextList = [...updatedProfile.skills]
          nextList[index] = next
          updatedProfile.skills = nextList
        }
      }
    } else if (proposal.sectionType === 'projects') {
      const itemId = proposal.itemId ?? ''
      const index = updatedProfile.projects.findIndex(proj => proj.id === itemId)
      if (index === -1) {
        rejectionReason = 'The referenced project no longer exists.'
      } else {
        const current = updatedProfile.projects[index]
        let next: ProjectEntry | null = null
        switch (proposal.field) {
          case 'bullets':
            if (Array.isArray(proposal.newValue)) next = { ...current, bullets: proposal.newValue }
            break
          case 'technologies':
            if (Array.isArray(proposal.newValue)) next = { ...current, technologies: proposal.newValue }
            break
          case 'name':
            if (typeof proposal.newValue === 'string') next = { ...current, name: proposal.newValue }
            break
          case 'description':
            if (typeof proposal.newValue === 'string') next = { ...current, description: proposal.newValue }
            break
        }
        if (!next) {
          rejectionReason = `Unexpected value shape for projects.${proposal.field}.`
        } else {
          const nextList = [...updatedProfile.projects]
          nextList[index] = next
          updatedProfile.projects = nextList
        }
      }
    }

    if (rejectionReason) {
      alert(`This AI suggestion was blocked by the safety validator and was NOT applied. Reason: ${rejectionReason}`)
      return
    }

    // 3. Plan fully resolved — now capture the rollback checkpoint and commit.
    const versionLabel = `AI Auto-Save: ${proposal.sectionType} rewrite`
    const description = `Pre-modification snapshot captured automatically before applying AI suggestion: "${proposal.explanation || ''}"`
    const newVer = createVersion(versionLabel, 'ai_accept', description)
    if (newVer) {
      dbVersions.save(newVer, document.userId)
    }

    // Update store state which sets saveStatus to unsaved and triggers autosave
    updateProfile(updatedProfile)
    alert('AI proposal accepted and applied to Canonical Profile successfully!')
  }

  if (loading || !document || !profile) {
    return (
      <div className="min-h-screen bg-[#050507] text-[#f2f2f7] flex items-center justify-center relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #f2f2f7 1px, transparent 1px), linear-gradient(to bottom, #f2f2f7 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-[36rem] rounded-full bg-[#00d4ff]/10 blur-[120px]"
          aria-hidden="true"
        />
        <div className="relative flex flex-col items-center gap-5 animate-envoy-fade-in">
          <div className="relative flex items-center justify-center">
            <span className="absolute h-14 w-14 rounded-full border border-[#00d4ff]/20 animate-envoy-ring" aria-hidden="true" />
            <Loader className="animate-spin text-[#00d4ff]" size={26} strokeWidth={2} />
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-[#9898b3]">Envoy</p>
            <p className="text-sm text-[#5c5c7a]">Loading A4 canvas elements…</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050507] text-[#f2f2f7] flex flex-col h-screen overflow-hidden antialiased">

      <style jsx global>{`
        @keyframes envoy-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes envoy-fade-in-fast {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes envoy-ring {
          0% { transform: scale(0.85); opacity: 0.7; }
          80%, 100% { transform: scale(1.35); opacity: 0; }
        }
        @keyframes envoy-pulse-dot {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 currentColor; }
          50% { opacity: 0.55; }
        }
        @keyframes envoy-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes envoy-menu-item {
          from { opacity: 0; transform: translateY(-3px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-envoy-fade-in { animation: envoy-fade-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .animate-envoy-ring { animation: envoy-ring 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
        .envoy-menu-item { animation: envoy-menu-item 0.16s ease-out both; }
        .envoy-focus-ring:focus-visible {
          outline: 2px solid #00d4ff;
          outline-offset: 2px;
          border-radius: 6px;
        }
        .envoy-title-input:focus {
          box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.12);
        }
        .envoy-select {
          background-image: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-envoy-fade-in, .animate-envoy-ring, .envoy-menu-item, .animate-spin,
          .animate-scale-in, .animate-slide-in-right {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
          }
        }
      `}</style>

      {/* Editor Header */}
      <header className="border-b border-[#1e1e2e] bg-[#0c0c10]/95 backdrop-blur-sm px-6 py-3.5 flex items-center justify-between shrink-0 relative z-30">
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={() => router.push('/dashboard')}
            className="envoy-focus-ring p-2 rounded-md text-[#9898b3] hover:text-[#f2f2f7] hover:bg-[#16161f] active:scale-95 transition-all duration-150"
            aria-label="Back to Dashboard"
            title="Back to Dashboard"
          >
            <ArrowLeft size={16} strokeWidth={2} />
          </button>

          <div className="h-6 w-px bg-[#1e1e2e] hidden sm:block" aria-hidden="true" />

          <Logo iconSize={32} showText={false} />

          <div className="flex flex-col min-w-0">
            <input
              type="text"
              value={document.title}
              onChange={(e) => updateDocument({ title: e.target.value })}
              aria-label="Document title"
              className="envoy-title-input bg-transparent border-b border-transparent hover:border-[#252535] focus:border-[#00d4ff] focus:outline-none text-sm font-bold text-[#f2f2f7] py-0.5 px-1 -mx-1 rounded-sm w-40 sm:w-56 md:w-64 transition-all duration-150 truncate"
            />
            {/* Save Status Indicators */}
            <div className="text-[10px] px-1 font-semibold flex items-center gap-1.5 mt-0.5" role="status" aria-live="polite">
              {saveStatus === 'saved' && (
                <span className="inline-flex items-center gap-1.5 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                  Saved {checkDemoMode() ? '(Local)' : '(Cloud)'}
                </span>
              )}
              {saveStatus === 'saving' && (
                <span className="inline-flex items-center gap-1.5 text-[#00d4ff]">
                  <Loader size={9} className="animate-spin" aria-hidden="true" />
                  Saving draft…
                </span>
              )}
              {saveStatus === 'unsaved' && (
                <span className="inline-flex items-center gap-1.5 text-amber-400">
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-amber-400"
                    style={{ animation: 'envoy-pulse-dot 1.6s ease-in-out infinite' }}
                    aria-hidden="true"
                  />
                  Unsaved changes
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="inline-flex items-center gap-1.5 text-red-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" aria-hidden="true" />
                  Autosave failed
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Configurations */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          {/* Template gallery switcher */}
          <div className="hidden md:flex items-center gap-2">
            <span className="text-[11px] font-medium text-[#5c5c7a] tracking-wide">Layout</span>
            <div className="relative">
              <select
                value={document.settings.template}
                onChange={(e) => setTemplate(e.target.value as TemplateId)}
                aria-label="Document layout template"
                className="envoy-focus-ring envoy-select appearance-none bg-[#111118] border border-[#252535] rounded-md text-xs font-medium text-[#f2f2f7] py-1.5 pl-3 pr-8 hover:border-[#333349] focus:outline-none focus:border-[#00d4ff] transition-colors duration-150 cursor-pointer"
              >
                <option value="minimal">Minimal</option>
                <option value="modern">Modern</option>
                <option value="developer">Developer</option>
                <option value="academic">Academic (CV)</option>
              </select>
              <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5c5c7a]" aria-hidden="true" />
            </div>
          </div>

          {/* Version History Trigger Button */}
          <button
            onClick={async () => {
              if (documentId) {
                const list = await dbVersions.getForDocument(documentId)
                setVersions(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
              }
              setShowVersionsModal(true)
            }}
            className="envoy-focus-ring btn btn-secondary btn-sm hidden sm:inline-flex items-center gap-1.5 hover:border-[#333349] active:scale-[0.97] transition-all duration-150"
            title="Version Checkpoints"
          >
            <History size={12} aria-hidden="true" />
            <span>History</span>
            {versions.length > 0 && (
              <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-[#1e1e2e] text-[9px] font-bold text-[#9898b3]">
                {versions.length}
              </span>
            )}
          </button>

          <div className="relative" data-export-menu>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              aria-expanded={showExportMenu}
              aria-haspopup="menu"
              className="envoy-focus-ring btn btn-primary btn-sm active:scale-[0.97] transition-transform duration-150"
            >
              <Download size={12} aria-hidden="true" />
              <span>Export</span>
              <ChevronDown size={11} className={`transition-transform duration-200 ${showExportMenu ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>

            {showExportMenu && (
              <div
                role="menu"
                aria-label="Export options"
                className="absolute right-0 mt-2 w-56 surface-card !bg-[#0c0c10] rounded-lg shadow-elevation-3 z-50 py-1.5 text-xs animate-scale-in origin-top-right overflow-hidden"
              >
                <button
                  role="menuitem"
                  onClick={() => {
                    setShowExportMenu(false)
                    window.print()
                  }}
                  style={{ animationDelay: '0ms' }}
                  className="envoy-menu-item group w-full text-left px-3.5 py-2.5 flex items-center gap-3 hover:bg-[#16161f] text-[#f2f2f7] transition-colors duration-100"
                >
                  <span className="flex items-center justify-center w-7 h-7 rounded-md bg-[#111118] text-[#9898b3] group-hover:text-[#00d4ff] group-hover:bg-[#00d4ff]/10 transition-colors duration-150 shrink-0">
                    <FileText size={13} aria-hidden="true" />
                  </span>
                  <span className="flex flex-col">
                    <span className="font-semibold">Download PDF</span>
                    <span className="text-[10px] text-[#5c5c7a] font-normal">Printable, ready to send</span>
                  </span>
                </button>
                <button
                  role="menuitem"
                  onClick={async () => {
                    setShowExportMenu(false)
                    if (!profile || !document) return
                    try {
                      const { generateDocxBlob } = await import('@/lib/export/docx')
                      const blob = await generateDocxBlob(profile, document)
                      const url = URL.createObjectURL(blob)
                      const a = window.document.createElement('a')
                      a.href = url
                      a.download = `${profile.identity.name.replace(/\s+/g, '_')}_Resume.docx`
                      window.document.body.appendChild(a)
                      a.click()
                      window.document.body.removeChild(a)
                      URL.revokeObjectURL(url)
                    } catch (err) {
                      console.error('Word export failed:', err)
                      alert('Word document generation failed. Please check logs.')
                    }
                  }}
                  style={{ animationDelay: '30ms' }}
                  className="envoy-menu-item group w-full text-left px-3.5 py-2.5 flex items-center gap-3 hover:bg-[#16161f] text-[#f2f2f7] transition-colors duration-100"
                >
                  <span className="flex items-center justify-center w-7 h-7 rounded-md bg-[#111118] text-[#9898b3] group-hover:text-[#00d4ff] group-hover:bg-[#00d4ff]/10 transition-colors duration-150 shrink-0">
                    <FileType size={13} aria-hidden="true" />
                  </span>
                  <span className="flex flex-col">
                    <span className="font-semibold">Download Word</span>
                    <span className="text-[10px] text-[#5c5c7a] font-normal">Editable .docx file</span>
                  </span>
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    setShowExportMenu(false)
                    if (!profile) return
                    try {
                      const text = generatePlainText(profile, document)
                      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
                      const url = URL.createObjectURL(blob)
                      const a = window.document.createElement('a')
                      a.href = url
                      a.download = `${profile.identity.name.replace(/\s+/g, '_')}_Resume_ATS.txt`
                      window.document.body.appendChild(a)
                      a.click()
                      window.document.body.removeChild(a)
                      URL.revokeObjectURL(url)
                    } catch (err) {
                      console.error('Text export failed:', err)
                      alert('Plain text generation failed.')
                    }
                  }}
                  style={{ animationDelay: '60ms' }}
                  className="envoy-menu-item group w-full text-left px-3.5 py-2.5 flex items-center gap-3 hover:bg-[#16161f] text-[#f2f2f7] transition-colors duration-100"
                >
                  <span className="flex items-center justify-center w-7 h-7 rounded-md bg-[#111118] text-[#9898b3] group-hover:text-[#00d4ff] group-hover:bg-[#00d4ff]/10 transition-colors duration-150 shrink-0">
                    <FileCode size={13} aria-hidden="true" />
                  </span>
                  <span className="flex flex-col">
                    <span className="font-semibold">Download Plain Text</span>
                    <span className="text-[10px] text-[#5c5c7a] font-normal">ATS-safe .txt file</span>
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Editor Split Columns Pane */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">

        {/* Left Side AI Assistant Sidebar */}
        <AgentSidebar
          profile={profile}
          document={document}
          conversation={conversation}
          isThinking={isThinking}
          streamText={streamText}
          jobTarget={jobTarget}
          atsReport={atsReport}
          onSendMessage={handleSendMessage}
          onUpdateJobTarget={handleUpdateJobTarget}
          onRunATSAnalysis={handleRunATSAnalysis}
          onAcceptProposal={handleAcceptProposal}
        />

        {/* Right Side Canvas Page */}
        <A4Canvas
          profile={profile}
          document={document}
          zoom={zoom}
          setZoom={setZoom}
          onEditSection={(sec) => setEditingSection(sec)}
          onToggleVisibility={(id) => toggleSectionVisibility(id)}
          onReorder={(from, to) => reorderSections(from, to)}
        />

      </div>

      {/* SECTION CONFIG EDIT OVERLAY SIDEBAR */}
      {editingSection && (
        <>
          <div
            className="fixed inset-0 bg-[#050507]/60 backdrop-blur-[2px] z-40 animate-envoy-fade-in"
            style={{ animationDuration: '0.2s' }}
            onClick={() => setEditingSection(null)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Edit section ${editingSection.title}`}
            className="fixed inset-y-0 right-0 w-80 bg-[#0c0c10] border-l border-[#1e1e2e] shadow-2xl z-50 p-6 space-y-6 animate-slide-in-right overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-[#1e1e2e] pb-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5c5c7a] mb-1">Section settings</p>
                <h3 className="text-sm font-bold text-[#f2f2f7]">{editingSection.title}</h3>
              </div>
              <button
                onClick={() => setEditingSection(null)}
                aria-label="Close section settings"
                className="envoy-focus-ring flex items-center justify-center w-7 h-7 rounded-md text-[#9898b3] hover:text-[#f2f2f7] hover:bg-[#16161f] transition-colors duration-150"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label htmlFor="section-title-input" className="block text-[10px] font-semibold text-[#9898b3] uppercase tracking-wider mb-2">
                  Display Title
                </label>
                <input
                  id="section-title-input"
                  type="text"
                  value={editingSection.title}
                  onChange={(e) => {
                    updateSection(editingSection.id, { title: e.target.value })
                    setEditingSection({ ...editingSection, title: e.target.value })
                  }}
                  className="envoy-focus-ring w-full bg-[#111118] border border-[#252535] rounded-md py-2.5 px-3 text-xs text-[#f2f2f7] focus:outline-none focus:border-[#00d4ff] focus:ring-2 focus:ring-[#00d4ff]/15 transition-all duration-150"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-[#9898b3] uppercase tracking-wider mb-2">Visibility</label>
                <button
                  onClick={() => {
                    toggleSectionVisibility(editingSection.id)
                    setEditingSection({ ...editingSection, visible: !editingSection.visible })
                  }}
                  className={`envoy-focus-ring w-full flex items-center justify-between px-3.5 py-2.5 rounded-md border text-xs font-semibold transition-all duration-150 active:scale-[0.98] ${
                    editingSection.visible
                      ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/15'
                      : 'bg-[#16161f] border-[#252535] text-[#5c5c7a] hover:border-[#333349]'
                  }`}
                >
                  <span>{editingSection.visible ? 'Visible on Document' : 'Hidden on Document'}</span>
                  {editingSection.visible ? <Eye size={14} aria-hidden="true" /> : <EyeOff size={14} aria-hidden="true" />}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* VERSION HISTORY MODAL OVERLAY */}
      {showVersionsModal && (
        <div
          className="fixed inset-0 bg-[#050507]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-envoy-fade-in"
          style={{ animationDuration: '0.2s' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowVersionsModal(false)
              setSelectedVersion(null)
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="version-history-title"
            className="surface-card accent-hairline w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden shadow-elevation-3 animate-scale-in"
          >
            <div className="p-5 border-b border-[#1e1e2e] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#00d4ff]/10 text-[#00d4ff] shrink-0">
                  <Clock size={16} aria-hidden="true" />
                </span>
                <div>
                  <h3 id="version-history-title" className="font-bold text-sm text-[#f2f2f7]">Document Version History</h3>
                  <p className="text-[11px] text-[#9898b3] mt-0.5">View and restore past snapshots of this document and profile.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowVersionsModal(false)
                  setSelectedVersion(null)
                }}
                aria-label="Close version history"
                className="envoy-focus-ring flex items-center justify-center w-8 h-8 rounded-md text-[#9898b3] hover:text-[#f2f2f7] hover:bg-[#16161f] transition-colors duration-150"
              >
                <X size={15} aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 flex overflow-hidden min-h-0">
              {/* Left Side: Versions List */}
              <div className="w-1/2 border-r border-[#1e1e2e] overflow-y-auto p-4 space-y-2.5">
                {versions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-14 gap-3">
                    <span className="flex items-center justify-center w-11 h-11 rounded-full bg-[#111118] border border-[#252535] text-[#5c5c7a]">
                      <History size={16} aria-hidden="true" />
                    </span>
                    <p className="text-xs text-[#5c5c7a] max-w-[220px]">
                      No past snapshots recorded yet. Checkpoints are captured automatically during key changes.
                    </p>
                  </div>
                ) : (
                  versions.map((ver, i) => (
                    <button
                      key={ver.id}
                      onClick={() => setSelectedVersion(ver)}
                      style={{ animationDelay: `${Math.min(i, 8) * 25}ms` }}
                      className={`envoy-menu-item group relative w-full text-left p-3.5 rounded-lg border transition-all duration-150 flex flex-col gap-1.5 ${
                        selectedVersion?.id === ver.id
                          ? 'bg-[#16161f] border-[#00d4ff]/60 shadow-[0_0_0_1px_rgba(0,212,255,0.15)]'
                          : 'bg-[#050507]/40 border-[#252535] hover:border-[#333349] hover:bg-[#0d0d13]'
                      }`}
                    >
                      {selectedVersion?.id === ver.id && (
                        <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-[#00d4ff]" aria-hidden="true" />
                      )}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#f2f2f7] truncate flex items-center gap-1.5">
                          {ver.trigger === 'ai_accept' && <Sparkles size={11} className="text-[#00d4ff] shrink-0" aria-hidden="true" />}
                          {ver.label}
                        </span>
                        <span className="shrink-0 text-[8px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded bg-[#111118] text-[#00d4ff] border border-[#252535]">
                          {ver.trigger}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#5c5c7a]">
                        {new Date(ver.createdAt).toLocaleString()}
                      </span>
                    </button>
                  ))
                )}
              </div>

              {/* Right Side: Version Details & Rollback action */}
              <div className="w-1/2 p-5 overflow-y-auto bg-[#050507]/20 flex flex-col justify-between">
                {selectedVersion ? (
                  <div key={selectedVersion.id} className="space-y-4 h-full flex flex-col justify-between animate-envoy-fade-in" style={{ animationDuration: '0.25s' }}>
                    <div className="space-y-3">
                      <div className="p-3.5 bg-[#111118] border border-[#252535] rounded-lg space-y-2">
                        <div className="text-[10px] font-extrabold text-[#00d4ff] uppercase tracking-wider">Snapshot Metadata</div>
                        <div className="text-xs text-gray-200 font-bold">{selectedVersion.label}</div>
                        <div className="text-[10px] text-[#9898b3] flex items-center gap-1.5">
                          <Clock size={10} aria-hidden="true" />
                          {new Date(selectedVersion.createdAt).toLocaleString()}
                        </div>
                        {selectedVersion.description && (
                          <div className="text-[11px] text-[#9898b3] italic border-l-2 border-[#6366f1] pl-2.5 mt-1.5 leading-relaxed">
                            &ldquo;{selectedVersion.description}&rdquo;
                          </div>
                        )}
                      </div>

                      <div className="p-3.5 bg-[#111118] border border-[#252535] rounded-lg space-y-1.5">
                        <div className="text-[10px] font-extrabold text-[#00d4ff] uppercase tracking-wider mb-2">Content Included</div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#5c5c7a]">Name</span>
                          <span className="text-gray-300 font-medium">{selectedVersion.profileSnapshot.identity.name}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#5c5c7a]">Headline</span>
                          <span className="text-gray-300 font-medium truncate max-w-[60%] text-right">{selectedVersion.profileSnapshot.identity.headline || 'None'}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#5c5c7a]">Experience entries</span>
                          <span className="text-gray-300 font-medium">{selectedVersion.profileSnapshot.experience.length}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#5c5c7a]">Skills categories</span>
                          <span className="text-gray-300 font-medium">{selectedVersion.profileSnapshot.skills.length}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#5c5c7a]">Projects</span>
                          <span className="text-gray-300 font-medium">{selectedVersion.profileSnapshot.projects.length}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRollbackVersion(selectedVersion)}
                      className="envoy-focus-ring btn btn-danger w-full mt-auto flex items-center justify-center gap-2 active:scale-[0.98] transition-transform duration-150"
                    >
                      <RotateCcw size={13} aria-hidden="true" />
                      Revert Workspace to this Snapshot
                    </button>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-3 p-6">
                    <span className="flex items-center justify-center w-11 h-11 rounded-full bg-[#111118] border border-[#252535] text-[#5c5c7a]">
                      <Check size={16} aria-hidden="true" />
                    </span>
                    <p className="text-xs text-[#5c5c7a] max-w-[220px]">
                      Select a snapshot from the timeline to view its contents and perform rollback.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}


export default function EditorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050507] text-[#f2f2f7] flex items-center justify-center">
        <Loader className="animate-spin text-[#00d4ff]" size={28} />
      </div>
    }>
      <EditorWorkspace />
    </Suspense>
  )
}