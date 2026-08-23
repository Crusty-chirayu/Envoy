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
  ArrowLeft, Download, Loader, Eye, History
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
    if (!window.confirm(`Are you sure you want to rollback to version "${version.label}"? All unsaved active changes will be overwritten.`)) {
      return
    }

    try {
      setProfile(version.profileSnapshot)
      setDocument(version.documentSnapshot)

      await dbProfile.save(version.profileSnapshot)
      await dbDocuments.save(version.documentSnapshot)

      alert('Rollback successful! The workspace has been reverted to the selected snapshot.')
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
        throw new Error(`AI Agent endpoint responded with status ${response.status}`)
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
      <div className="min-h-screen bg-[#050507] text-[#f2f2f7] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader className="animate-spin text-[#00d4ff]" size={28} />
          <p className="text-sm text-[#9898b3]">Loading A4 Canvas elements...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050507] text-[#f2f2f7] flex flex-col h-screen overflow-hidden">
      
      {/* Editor Header */}
      <header className="border-b border-[#1e1e2e] bg-[#0c0c10] px-6 py-3.5 flex items-center justify-between shrink-0 relative z-30">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="p-2 rounded-md hover:bg-[#16161f] text-[#9898b3] hover:text-[#f2f2f7] transition-colors"
            aria-label="Back to Dashboard"
            title="Back to Dashboard"
          >
            <ArrowLeft size={16} />
          </button>
          
          <Logo iconSize={32} showText={false} />
          
          <div className="flex flex-col min-w-0">
            <input
              type="text"
              value={document.title}
              onChange={(e) => updateDocument({ title: e.target.value })}
              aria-label="Document title"
              className="bg-transparent border-b border-transparent hover:border-[#252535] focus:border-[#6366f1] focus:outline-none text-sm font-bold text-[#f2f2f7] py-0.5 px-1 w-40 sm:w-56 md:w-64 transition-colors truncate"
            />
            {/* Save Status Indicators */}
            <div className="text-[10px] px-1 font-semibold flex items-center gap-1.5 mt-0.5">
              {saveStatus === 'saved' && (
                <span className="inline-flex items-center gap-1 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                  Saved {checkDemoMode() ? '(Local)' : '(Cloud)'}
                </span>
              )}
              {saveStatus === 'saving' && (
                <span className="inline-flex items-center gap-1 text-[#00d4ff]">
                  <Loader size={9} className="animate-spin" aria-hidden="true" />
                  Saving draft...
                </span>
              )}
              {saveStatus === 'unsaved' && (
                <span className="inline-flex items-center gap-1 text-amber-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" aria-hidden="true" />
                  Unsaved changes
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="inline-flex items-center gap-1 text-red-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" aria-hidden="true" />
                  Autosave failed
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Configurations */}
        <div className="flex items-center gap-4">
          {/* Template gallery switcher */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#9898b3]">Layout:</span>
            <select
              value={document.settings.template}
              onChange={(e) => setTemplate(e.target.value as TemplateId)}
              className="bg-[#16161f] border border-[#252535] rounded-md text-xs text-[#f2f2f7] py-1.5 px-3 focus:outline-none focus:border-[#6366f1]"
            >
              <option value="minimal">Minimal</option>
              <option value="modern">Modern</option>
              <option value="developer">Developer</option>
              <option value="academic">Academic (CV)</option>
            </select>
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
            className="btn btn-secondary btn-sm hidden sm:inline-flex"
            title="Version Checkpoints"
          >
            <History size={12} aria-hidden="true" />
            <span>History ({versions.length})</span>
          </button>

          <div className="relative" data-export-menu>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              aria-expanded={showExportMenu}
              aria-haspopup="menu"
              className="btn btn-primary btn-sm"
            >
              <Download size={12} aria-hidden="true" />
              <span>Export</span>
            </button>

            {showExportMenu && (
              <div role="menu" aria-label="Export options" className="absolute right-0 mt-2 w-52 surface-card !bg-[#0c0c10] rounded-lg shadow-elevation-3 z-50 py-1.5 text-xs animate-scale-in origin-top-right">
                <button
                  role="menuitem"
                  onClick={() => {
                    setShowExportMenu(false)
                    window.print()
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-[#16161f] text-[#f2f2f7] hover:text-[#00d4ff] transition-colors font-semibold"
                >
                  Download PDF (Printable)
                </button>
                <button
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
                  className="w-full text-left px-4 py-2 hover:bg-[#16161f] text-[#f2f2f7] hover:text-[#00d4ff] transition-colors font-semibold"
                >
                  Download Word (.docx)
                </button>
                <button
                  onClick={() => {
                    setShowExportMenu(false)
                    if (!profile) return
                    try {
                      const text = generatePlainText(profile)
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
                  className="w-full text-left px-4 py-2 hover:bg-[#16161f] text-[#f2f2f7] hover:text-[#00d4ff] transition-colors font-semibold"
                >
                  Download Plain Text (.txt)
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
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Edit section ${editingSection.title}`}
          className="fixed inset-y-0 right-0 w-80 bg-[#0c0c10] border-l border-[#1e1e2e] shadow-2xl z-50 p-6 space-y-6 animate-slide-in-right"
        >
          <div className="flex items-center justify-between border-b border-[#1e1e2e] pb-3">
            <h3 className="text-sm font-bold text-[#f2f2f7]">Edit Section: {editingSection.title}</h3>
            <button
              onClick={() => setEditingSection(null)}
              className="text-xs text-[#9898b3] hover:text-[#f2f2f7]"
            >
              Close
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-semibold text-[#9898b3] uppercase tracking-wider mb-2">Display Title</label>
              <input
                type="text"
                value={editingSection.title}
                onChange={(e) => {
                  updateSection(editingSection.id, { title: e.target.value })
                  setEditingSection({ ...editingSection, title: e.target.value })
                }}
                className="w-full bg-[#111118] border border-[#252535] rounded-md py-2 px-3 text-xs text-[#f2f2f7] focus:outline-none focus:border-[#6366f1]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-[#9898b3] uppercase tracking-wider mb-2">Visibility</label>
              <button
                onClick={() => {
                  toggleSectionVisibility(editingSection.id)
                  setEditingSection({ ...editingSection, visible: !editingSection.visible })
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md border text-xs font-semibold ${
                  editingSection.visible 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                    : 'bg-gray-500/10 border-gray-500/20 text-gray-400'
                }`}
              >
                <span>{editingSection.visible ? 'Visible on Document' : 'Hidden on Document'}</span>
                {editingSection.visible ? <Eye size={14} /> : <Eye size={14} className="opacity-55" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VERSION HISTORY MODAL OVERLAY */}
      {showVersionsModal && (
        <div
          className="fixed inset-0 bg-[#050507]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
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
            <div className="p-4 border-b border-[#1e1e2e] flex items-center justify-between">
              <div>
                <h3 id="version-history-title" className="font-bold text-sm text-[#f2f2f7]">Document Version History</h3>
                <p className="text-[10px] text-[#9898b3] mt-0.5">View and restore past snapshots of this document and profile.</p>
              </div>
              <button
                onClick={() => {
                  setShowVersionsModal(false)
                  setSelectedVersion(null)
                }}
                className="text-xs text-[#9898b3] hover:text-[#f2f2f7] font-semibold"
              >
                Close
              </button>
            </div>

            <div className="flex-1 flex overflow-hidden min-h-0">
              {/* Left Side: Versions List */}
              <div className="w-1/2 border-r border-[#1e1e2e] overflow-y-auto p-4 space-y-3">
                {versions.length === 0 ? (
                  <div className="text-center py-8 text-xs text-[#5c5c7a]">
                    No past snapshots recorded for this document yet. Checkpoints are automatically captured during key changes.
                  </div>
                ) : (
                  versions.map(ver => (
                    <button
                      key={ver.id}
                      onClick={() => setSelectedVersion(ver)}
                      className={`w-full text-left p-3 rounded-lg border transition-all flex flex-col gap-1 ${
                        selectedVersion?.id === ver.id
                          ? 'bg-[#16161f] border-[#00d4ff]'
                          : 'bg-[#050507]/40 border-[#252535] hover:border-[#1e1e2e]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#f2f2f7] truncate max-w-[70%]">{ver.label}</span>
                        <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-[#111118] text-[#00d4ff]">
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
              <div className="w-1/2 p-4 overflow-y-auto bg-[#050507]/20 flex flex-col justify-between">
                {selectedVersion ? (
                  <div className="space-y-4 h-full flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="p-3 bg-[#111118] border border-[#252535] rounded-lg space-y-2">
                        <div className="text-[10px] font-extrabold text-[#00d4ff] uppercase tracking-wider">Snapshot Metadata</div>
                        <div className="text-xs text-gray-200 font-bold">{selectedVersion.label}</div>
                        <div className="text-[10px] text-[#9898b3]">
                          Created: {new Date(selectedVersion.createdAt).toLocaleString()}
                        </div>
                        {selectedVersion.description && (
                          <div className="text-[11px] text-[#9898b3] italic border-l-2 border-[#6366f1] pl-2 mt-1">
                            “{selectedVersion.description}”
                          </div>
                        )}
                      </div>

                      <div className="p-3 bg-[#111118] border border-[#252535] rounded-lg space-y-1">
                        <div className="text-[10px] font-extrabold text-[#00d4ff] uppercase tracking-wider mb-2">Content Included</div>
                        <div className="text-xs text-gray-300">Name: {selectedVersion.profileSnapshot.identity.name}</div>
                        <div className="text-xs text-gray-300">Headline: {selectedVersion.profileSnapshot.identity.headline || 'None'}</div>
                        <div className="text-xs text-gray-300">Experience entries: {selectedVersion.profileSnapshot.experience.length}</div>
                        <div className="text-xs text-gray-300">Skills categories: {selectedVersion.profileSnapshot.skills.length}</div>
                        <div className="text-xs text-gray-300">Projects: {selectedVersion.profileSnapshot.projects.length}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRollbackVersion(selectedVersion)}
                      className="btn btn-danger w-full mt-auto"
                    >
                      Revert Workspace to this Snapshot
                    </button>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-center text-xs text-[#5c5c7a] p-6">
                    Select a snapshot from the timeline to view its contents and perform rollback.
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
