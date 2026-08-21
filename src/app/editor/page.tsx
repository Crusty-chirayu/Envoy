'use client'

import React, { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Logo } from '@/components/Logo'
import { authService } from '@/lib/auth'
import { dbDocuments, dbProfile, checkDemoMode, dbATSReports, dbJobTargets } from '@/lib/db'
import { useDocumentStore } from '@/stores/document'
import { A4Canvas } from '@/components/A4Canvas'
import { AgentSidebar } from '@/components/AgentSidebar'
import type { EnvoyDocument, ProfessionalProfile, DocumentSectionConfig, AIConversation, AIMessage, JobTarget, ATSReport, TemplateId } from '@/types'
import { 
  ArrowLeft, ChevronDown, Check, Download, Share2, 
  Settings, Loader, Eye, RefreshCw, Sparkles, HelpCircle 
} from 'lucide-react'
import { v4 as uuid } from 'uuid'
import { analyzeATS } from '@/lib/ats/analyzer'

function EditorWorkspace() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const documentId = searchParams.get('id')

  // Zustand Store hooks
  const profile = useDocumentStore(s => s.profile)
  const document = useDocumentStore(s => s.document)
  const saveStatus = useDocumentStore(s => s.saveStatus)
  const lastSavedAt = useDocumentStore(s => s.lastSavedAt)
  const setProfile = useDocumentStore(s => s.setProfile)
  const setDocument = useDocumentStore(s => s.setDocument)
  const updateProfile = useDocumentStore(s => s.updateProfile)
  const updateDocument = useDocumentStore(s => s.updateDocument)
  const updateSection = useDocumentStore(s => s.updateSection)
  const toggleSectionVisibility = useDocumentStore(s => s.toggleSectionVisibility)
  const removeSection = useDocumentStore(s => s.removeSection)
  const reorderSections = useDocumentStore(s => s.reorderSections)
  const setTemplate = useDocumentStore(s => s.setTemplate)
  const setSaveStatus = useDocumentStore(s => s.setSaveStatus)
  const markSaved = useDocumentStore(s => s.markSaved)

  // Local state
  const [loading, setLoading] = useState(true)
  const [zoom, setZoom] = useState(0.85)
  const [editingSection, setEditingSection] = useState<DocumentSectionConfig | null>(null)
  
  // AI related state
  const [conversation, setConversation] = useState<AIConversation | null>(null)
  const [isThinking, setIsThinking] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [jobTarget, setJobTarget] = useState<JobTarget | null>(null)
  const [atsReport, setAtsReport] = useState<ATSReport | null>(null)

  // Sync ref for debouncing
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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

    setIsThinking(true)
    setStreamText('')

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: updatedMessages,
          profile,
          document,
          jobTarget,
          atsReport,
          selectedSectionId: editingSection?.id,
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
    } catch (err: any) {
      console.error('Streaming connection failed:', err)
      const errorMsg = `[ERROR] Streaming connection failed: ${err?.message || 'Please check API configurations.'}`
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

  // Update target job posting
  const handleUpdateJobTarget = async (desc: string) => {
    if (!document || !profile) return
    const newTarget: JobTarget = {
      id: uuid(),
      userId: document.userId,
      documentId: document.id,
      title: 'Target Position',
      description: desc,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await dbJobTargets.save(newTarget)
    setJobTarget(newTarget)
    
    // Associate with document
    updateDocument({ targetJobId: newTarget.id })
  }

  // Execute local algorithmic ATS check
  const handleRunATSAnalysis = async () => {
    if (!profile || !document) return
    const report = analyzeATS(profile, document, document.userId, jobTarget || undefined)
    await dbATSReports.save(report)
    setAtsReport(report)
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
          >
            <ArrowLeft size={16} />
          </button>
          
          <Logo iconSize={32} showText={false} />
          
          <div className="flex flex-col">
            <input
              type="text"
              value={document.title}
              onChange={(e) => updateDocument({ title: e.target.value })}
              className="bg-transparent border-b border-transparent hover:border-[#252535] focus:border-[#6366f1] focus:outline-none text-sm font-bold text-[#f2f2f7] py-0.5 px-1 w-48 transition-colors"
            />
            {/* Save Status Indicators */}
            <div className="text-[10px] text-[#5c5c7a] px-1 font-semibold">
              {saveStatus === 'saved' && (
                <span className="text-emerald-400">Saved {checkDemoMode() ? '(Local)' : '(Cloud)'}</span>
              )}
              {saveStatus === 'saving' && <span className="text-[#00d4ff]">Saving draft...</span>}
              {saveStatus === 'unsaved' && <span className="text-amber-400">Unsaved changes</span>}
              {saveStatus === 'error' && <span className="text-red-400">Autosave failed</span>}
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

          <button
            onClick={() => showNotification?.('Export engine preparing download...', 'info')}
            className="flex items-center gap-2 bg-[#6366f1] text-[#050507] hover:opacity-90 transition-opacity px-4 py-1.5 rounded-md font-bold text-xs shadow-md"
          >
            <Download size={13} />
            <span>Export</span>
          </button>
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
        />

        {/* Right Side Canvas Page */}
        <A4Canvas 
          profile={profile}
          document={document}
          zoom={zoom}
          setZoom={setZoom}
          onEditSection={(sec) => setEditingSection(sec)}
          onToggleVisibility={(id) => toggleSectionVisibility(id)}
          onDeleteSection={(id) => removeSection(id)}
          onReorder={(from, to) => reorderSections(from, to)}
        />

      </div>

      {/* SECTION CONFIG EDIT OVERLAY SIDEBAR */}
      {editingSection && (
        <div className="fixed inset-y-0 right-0 w-80 bg-[#0c0c10] border-l border-[#1e1e2e] shadow-2xl z-50 p-6 space-y-6 animate-slide-in-right">
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

    </div>
  )
}

function showNotification(message: string, type: 'success' | 'error' | 'info' = 'success') {
  // Global simple alert notification
  alert(`${type.toUpperCase()}: ${message}`)
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
