'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/Logo'
import { authService } from '@/lib/auth'
import { dbProfile, dbDocuments, checkDemoMode, dbPortfolios, describeDbError } from '@/lib/db'
import { DEFAULT_PORTFOLIO_VISIBILITY, resolvePublishedAt } from '@/lib/portfolio/visibility'
import type { ProfessionalProfile, EnvoyDocument, ExperienceEntry, EducationEntry, SkillGroup, ProjectEntry, AppUser, DocumentType, TemplateId, PortfolioSite, PortfolioTheme, PortfolioVisibility } from '@/types'
import { 
  Plus, FileText, User, LogOut, CheckCircle, 
  Trash2, Cloud, CloudOff, AlertCircle, Edit, Briefcase, GraduationCap, Code, FolderGit, Layout, Upload, Loader
} from 'lucide-react'
import { v4 as uuid } from 'uuid'

export default function DashboardPage() {
  const router = useRouter()
  
  // Auth state
  const [user, setUser] = useState<AppUser | null>(null)
  const [isDemo, setIsDemo] = useState(true)
  const [loading, setLoading] = useState(true)

  // Store profile/doc state
  const [profile, setProfileState] = useState<ProfessionalProfile | null>(null)
  const [portfolio, setPortfolioState] = useState<PortfolioSite | null>(null)
  const [documents, setDocuments] = useState<EnvoyDocument[]>([])
  
  // Dashboard navigation
  const [activeTab, setActiveTab] = useState<'docs' | 'profile' | 'portfolio' | 'settings'>('docs')
  const [profileTab, setProfileTab] = useState<'identity' | 'experience' | 'education' | 'skills' | 'projects' | 'certifications'>('identity')

  // Document creation form state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newDocTitle, setNewDocTitle] = useState('')
  const [newDocType, setNewDocType] = useState<DocumentType>('resume')
  const [newDocTemplate, setNewDocTemplate] = useState<TemplateId>('minimal')

  // Notification states
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  // Document Ingestion state & handler
  const [isIngesting, setIsIngesting] = useState(false)

  const handleIngestFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsIngesting(true)
    showNotification('Ingesting resume file...', 'info')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/ingest', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || `Upload failed with status ${response.status}`)
      }

      const parsedProfile = await response.json()
      
      const finalProfile = {
        ...parsedProfile,
        userId: user?.id || 'demo-user-id-1234'
      }

      await dbProfile.save(finalProfile)
      setProfileState(finalProfile)
      showNotification('Resume parsed and master profile updated successfully!', 'success')
    } catch (err: unknown) {
      console.error('Ingestion failed:', err)
      showNotification(err instanceof Error ? err.message : 'Ingestion failed', 'error')
      alert(`Resume ingestion failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsIngesting(false)
    }
  }

  // Close the create-document modal with the Escape key (keyboard accessibility)
  useEffect(() => {
    if (!showCreateModal) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowCreateModal(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showCreateModal])

  // Load initial data
  useEffect(() => {
    setIsDemo(checkDemoMode())

    const init = async () => {
      try {
        const currentUser = await authService.getUser()
        if (!currentUser) {
          // If no user and not in demo mode, redirect to login
          if (!checkDemoMode()) {
            router.push('/login')
            return
          }
          // Set a default demo user
          const demoUser = { id: 'demo-user-id-1234', email: 'demo@envoy.app', name: 'Demo Professional' }
          setUser(demoUser)
          await loadUserWorkspace(demoUser.id)
        } else {
          setUser(currentUser)
          await loadUserWorkspace(currentUser.id)
        }
      } catch (err) {
        console.error('Workspace load error:', describeDbError(err))
      } finally {
        setLoading(false)
      }
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  // Fetch documents and profile for the logged in user
  const loadUserWorkspace = async (userId: string) => {
    // 1. Get profile or create default if not found
    let userProfile = await dbProfile.get(userId)
    if (!userProfile) {
      userProfile = {
        id: uuid(),
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        identity: {
          name: user?.name || 'Your Name',
          headline: 'Software Engineer',
          email: user?.email || 'yourname@example.com',
          phone: '',
          location: '',
          socials: [],
        },
        experience: [],
        education: [],
        skills: [],
        projects: [],
        certifications: [],
        achievements: [],
        publications: [],
        awards: [],
        volunteering: [],
        languages: [],
        interests: [],
        customSections: [],
      }
      await dbProfile.save(userProfile)
      // Re-read so the authoritative database primary key (profiles.id)
      // replaces the locally generated id before it feeds FK references
      // such as portfolio_sites.profile_id / documents.profile_id.
      const savedProfile = await dbProfile.get(userId)
      if (savedProfile) userProfile = savedProfile
    }
    setProfileState(userProfile)

    // 2. Get documents
    const userDocs = await dbDocuments.getAll(userId)
    setDocuments(userDocs)

    // 3. Get portfolio or create default
    let userPortfolio = await dbPortfolios.getByUserId(userId)
    if (!userPortfolio) {
      const defaultPortfolio: PortfolioSite = {
        id: uuid(),
        userId,
        profileId: userProfile.id,
        slug: userProfile.identity.name.toLowerCase().replace(/\s+/g, '-') || 'john-doe',
        title: `${userProfile.identity.name}'s Portfolio`,
        theme: 'minimal',
        accentColor: '#6366f1',
        // Privacy default (audit finding S7): portfolios start PRIVATE.
        // Publishing requires an explicit user action in Portfolio Setup.
        visibility: DEFAULT_PORTFOLIO_VISIBILITY,
        sections: [
          { id: uuid(), type: 'hero', visible: true, order: 0, title: 'Introduction' },
          { id: uuid(), type: 'about', visible: true, order: 1, title: 'About' },
          { id: uuid(), type: 'experience', visible: true, order: 2, title: 'Work Experience' },
          { id: uuid(), type: 'projects', visible: true, order: 3, title: 'Featured Projects' },
          { id: uuid(), type: 'skills', visible: true, order: 4, title: 'Technical Skills' },
          { id: uuid(), type: 'education', visible: true, order: 5, title: 'Education' },
          { id: uuid(), type: 'contact', visible: true, order: 6, title: 'Get In Touch' },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      try {
        await dbPortfolios.save(defaultPortfolio)
        userPortfolio = defaultPortfolio
      } catch (err) {
        // Concurrent-initialization race (React StrictMode double-mount in
        // dev, rapid double navigation, or a second tab): another instance
        // may have created the default portfolio between our existence
        // check and this save. Adopt the winner's row instead of failing
        // the whole workspace load with a duplicate-slug error.
        userPortfolio = await dbPortfolios.getByUserId(userId)
        if (!userPortfolio) throw err
      }
    }
    
    if (userPortfolio) {
      setPortfolioState(userPortfolio)
    }
  }

  // Handle Logout
  const handleSignOut = async () => {
    await authService.signOut()
    router.push('/login')
    router.refresh()
  }

  // Save profile helper
  const saveProfile = async (updated: ProfessionalProfile) => {
    setProfileState(updated)
    await dbProfile.save(updated)
    showNotification('Master Profile autosaved', 'success')
  }

  // Profile Identity updates
  const handleIdentityChange = (field: string, value: string) => {
    if (!profile) return
    const updated = {
      ...profile,
      identity: {
        ...profile.identity,
        [field]: value,
      },
      updatedAt: new Date().toISOString(),
    }
    saveProfile(updated)
  }

  // Profile Experience actions
  const addExperience = () => {
    if (!profile) return
    const newExp: ExperienceEntry = {
      id: uuid(),
      company: 'New Company',
      role: 'Software Engineer',
      location: '',
      startDate: '2024-01',
      current: true,
      bullets: ['Describe your impact and achievements here.'],
      technologies: [],
    }
    const updated = {
      ...profile,
      experience: [...profile.experience, newExp],
      updatedAt: new Date().toISOString(),
    }
    saveProfile(updated)
  }

  const updateExperience = (id: string, field: keyof ExperienceEntry, value: string | string[] | boolean | undefined) => {
    if (!profile) return
    const updatedExpList = profile.experience.map(exp => {
      if (exp.id === id) {
        return { ...exp, [field]: value }
      }
      return exp
    })
    const updated = {
      ...profile,
      experience: updatedExpList,
      updatedAt: new Date().toISOString(),
    }
    saveProfile(updated)
  }

  const deleteExperience = (id: string) => {
    if (!profile) return
    const updated = {
      ...profile,
      experience: profile.experience.filter(exp => exp.id !== id),
      updatedAt: new Date().toISOString(),
    }
    saveProfile(updated)
  }

  // Profile Education actions
  const addEducation = () => {
    if (!profile) return
    const newEdu: EducationEntry = {
      id: uuid(),
      institution: 'University Name',
      degree: 'B.S. in Computer Science',
      startDate: '2020-09',
      current: true,
    }
    const updated = {
      ...profile,
      education: [...profile.education, newEdu],
      updatedAt: new Date().toISOString(),
    }
    saveProfile(updated)
  }

  const updateEducation = (id: string, field: keyof EducationEntry, value: string | boolean | undefined) => {
    if (!profile) return
    const updatedEduList = profile.education.map(edu => {
      if (edu.id === id) {
        return { ...edu, [field]: value }
      }
      return edu
    })
    const updated = {
      ...profile,
      education: updatedEduList,
      updatedAt: new Date().toISOString(),
    }
    saveProfile(updated)
  }

  const deleteEducation = (id: string) => {
    if (!profile) return
    const updated = {
      ...profile,
      education: profile.education.filter(edu => edu.id !== id),
      updatedAt: new Date().toISOString(),
    }
    saveProfile(updated)
  }

  // Profile Skill actions
  const addSkillGroup = () => {
    if (!profile) return
    const newGroup: SkillGroup = {
      id: uuid(),
      category: 'Languages & Frameworks',
      skills: ['TypeScript', 'React', 'Next.js'],
    }
    const updated = {
      ...profile,
      skills: [...profile.skills, newGroup],
      updatedAt: new Date().toISOString(),
    }
    saveProfile(updated)
  }

  const updateSkillGroup = (id: string, field: keyof SkillGroup, value: string | string[] | undefined) => {
    if (!profile) return
    const updatedSkillGroups = profile.skills.map(group => {
      if (group.id === id) {
        return { ...group, [field]: value }
      }
      return group
    })
    const updated = {
      ...profile,
      skills: updatedSkillGroups,
      updatedAt: new Date().toISOString(),
    }
    saveProfile(updated)
  }

  const deleteSkillGroup = (id: string) => {
    if (!profile) return
    const updated = {
      ...profile,
      skills: profile.skills.filter(group => group.id !== id),
      updatedAt: new Date().toISOString(),
    }
    saveProfile(updated)
  }

  // Profile Project actions
  const addProject = () => {
    if (!profile) return
    const newProj: ProjectEntry = {
      id: uuid(),
      name: 'Project Name',
      description: 'A brief description of what you designed and built.',
      technologies: [],
    }
    const updated = {
      ...profile,
      projects: [...profile.projects, newProj],
      updatedAt: new Date().toISOString(),
    }
    saveProfile(updated)
  }

  const updateProject = (id: string, field: keyof ProjectEntry, value: string | string[] | undefined) => {
    if (!profile) return
    const updatedProjList = profile.projects.map(proj => {
      if (proj.id === id) {
        return { ...proj, [field]: value }
      }
      return proj
    })
    const updated = {
      ...profile,
      projects: updatedProjList,
      updatedAt: new Date().toISOString(),
    }
    saveProfile(updated)
  }

  const deleteProject = (id: string) => {
    if (!profile) return
    const updated = {
      ...profile,
      projects: profile.projects.filter(proj => proj.id !== id),
      updatedAt: new Date().toISOString(),
    }
    saveProfile(updated)
  }

  // Document creation handler
  const handleCreateDocument = async () => {
    if (!profile || !user) return
    if (!newDocTitle.trim()) {
      showNotification('Title is required', 'error')
      return
    }

    const newDoc: EnvoyDocument = {
      id: uuid(),
      userId: user.id,
      profileId: profile.id,
      type: newDocType,
      title: newDocTitle,
      sections: [
        { id: uuid(), type: 'summary', title: 'Summary', visible: true, order: 0 },
        { id: uuid(), type: 'experience', title: 'Professional Experience', visible: true, order: 1 },
        { id: uuid(), type: 'education', title: 'Education', visible: true, order: 2 },
        { id: uuid(), type: 'skills', title: 'Technical Skills', visible: true, order: 3 },
        { id: uuid(), type: 'projects', title: 'Featured Projects', visible: true, order: 4 },
      ],
      settings: {
        template: newDocTemplate,
        accentColor: '#6366f1',
        fontFamily: 'inter',
        fontSize: 'normal',
        pageMargin: 'normal',
        showPhoto: false,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await dbDocuments.save(newDoc)
    setDocuments([newDoc, ...documents])
    setShowCreateModal(false)
    setNewDocTitle('')
    
    showNotification('Document created successfully', 'success')
    // Open in editor
    router.push(`/editor?id=${newDoc.id}`)
  }

  const handleDeleteDocument = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return
    await dbDocuments.delete(id)
    setDocuments(documents.filter(doc => doc.id !== id))
    showNotification('Document deleted', 'info')
  }

  const calculateProfileCompleteness = (): number => {
    if (!profile) return 0
    let score = 0
    if (profile.identity.name) score += 15
    if (profile.identity.email) score += 15
    if (profile.identity.headline) score += 10
    if (profile.summary) score += 15
    if (profile.experience.length > 0) score += 15
    if (profile.education.length > 0) score += 15
    if (profile.skills.length > 0) score += 15
    return score
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050507] text-[#f2f2f7] flex items-center justify-center" role="status" aria-live="polite">
        <div className="flex flex-col items-center gap-4">
          <Logo iconSize={48} showText={false} className="animate-spin-slow" />
          <p className="text-sm text-[#9898b3]">Restoring workspace session...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050507] text-[#f2f2f7] flex flex-col relative overflow-hidden">
      {/* Glows */}
      <div className="absolute top-[-10%] left-[-15%] w-[50%] h-[50%] rounded-full bg-gradient-radial from-[rgba(99,102,241,0.05)] to-transparent blur-3xl pointer-events-none" />

      {/* Top Banner */}
      <header className="border-b border-[#1e1e2e] bg-[#0c0c10]/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <Logo iconSize={34} />
        
        <div className="flex items-center gap-6">
          {/* Cloud vs Demo Mode Indicator */}
          <div className={`chip !px-3 text-[11px] ${isDemo ? 'chip-warning' : 'chip-indigo'}`}>
            {isDemo ? (
              <>
                <CloudOff size={13} />
                <span>Demo (Local Storage)</span>
              </>
            ) : (
              <>
                <Cloud size={13} />
                <span>Connected (Supabase Cloud)</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end hidden sm:flex">
              <span className="text-sm font-semibold text-[#f2f2f7]">{user?.name || 'Guest User'}</span>
              <span className="text-xs text-[#9898b3]">{user?.email}</span>
            </div>
            <button 
              onClick={handleSignOut}
              className="btn btn-ghost"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile section switcher — the sidebar is hidden below md,
          so tabs must remain reachable on small screens */}
      <div className="md:hidden sticky top-[64px] z-30 border-b border-[#1e1e2e] bg-[#050507]/92 backdrop-blur-md px-4 py-2.5">
        <div className="segmented w-full justify-between" role="tablist" aria-label="Dashboard sections">
          <button role="tab" aria-selected={activeTab === 'docs'} onClick={() => setActiveTab('docs')} className={`segmented-item flex-1 justify-center ${activeTab === 'docs' ? 'segmented-item-active' : ''}`}>
            <FileText size={14} aria-hidden="true" />
            <span>Documents</span>
          </button>
          <button role="tab" aria-selected={activeTab === 'profile'} onClick={() => setActiveTab('profile')} className={`segmented-item flex-1 justify-center ${activeTab === 'profile' ? 'segmented-item-active' : ''}`}>
            <User size={14} aria-hidden="true" />
            <span>Profile</span>
          </button>
          <button role="tab" aria-selected={activeTab === 'portfolio'} onClick={() => setActiveTab('portfolio')} className={`segmented-item flex-1 justify-center ${activeTab === 'portfolio' ? 'segmented-item-active' : ''}`}>
            <Layout size={14} aria-hidden="true" />
            <span>Portfolio</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-elevation-3 border bg-[#0c0c10] flex items-center gap-3 text-sm animate-fade-in border-[#252535]"
        >
          {notification.type === 'success' && <CheckCircle size={16} className="text-emerald-400 shrink-0" aria-hidden="true" />}
          {notification.type === 'error' && <AlertCircle size={16} className="text-[#ef4444] shrink-0" aria-hidden="true" />}
          {notification.type === 'info' && <Cloud size={16} className="text-[#00d4ff] shrink-0" aria-hidden="true" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto p-6 gap-6 relative z-10">
        
        {/* Left Nav Menu */}
        <aside className="w-64 shrink-0 flex flex-col gap-2 hidden md:flex">
          <div className="surface-inset p-4 mb-4">
            <div className="flex justify-between items-center text-xs font-semibold text-[#9898b3] uppercase tracking-wider mb-2.5">
              <span>Profile Progress</span>
              <span className="font-mono text-[#00d4ff]">{calculateProfileCompleteness()}%</span>
            </div>
            <div className="w-full bg-[#050507] rounded-full h-1.5 overflow-hidden ring-1 ring-inset ring-[#252535]" role="progressbar" aria-valuenow={calculateProfileCompleteness()} aria-valuemin={0} aria-valuemax={100} aria-label="Profile completeness">
              <div 
                className="bg-gradient-to-r from-[#6366f1] to-[#00d4ff] h-1.5 rounded-full transition-all duration-700 ease-out" 
                style={{ width: `${calculateProfileCompleteness()}%` }}
              />
            </div>
          </div>

          <button
            onClick={() => setActiveTab('docs')}
            aria-current={activeTab === 'docs'}
            className={`nav-item ${activeTab === 'docs' ? 'nav-item-active' : ''}`}
          >
            <FileText size={17} aria-hidden="true" />
            <span>Documents Grid</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            aria-current={activeTab === 'profile'}
            className={`nav-item ${activeTab === 'profile' ? 'nav-item-active' : ''}`}
          >
            <User size={17} aria-hidden="true" />
            <span>Master Profile</span>
          </button>

          <button
            onClick={() => setActiveTab('portfolio')}
            aria-current={activeTab === 'portfolio'}
            className={`nav-item ${activeTab === 'portfolio' ? 'nav-item-active' : ''}`}
          >
            <Layout size={17} aria-hidden="true" />
            <span>Portfolio Setup</span>
          </button>
        </aside>

        {/* Right Dashboard Area */}
        <main className="flex-1 min-w-0">
          
          {/* DOCUMENTS TAB */}
          {activeTab === 'docs' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Your Career Documents</h1>
                  <p className="text-sm text-[#9898b3] mt-1">Generate dynamic CVs, Resumes, and Portfolio sites from your Canonical Profile.</p>
                </div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn btn-primary btn-sm"
                >
                  <Plus size={15} aria-hidden="true" />
                  <span>Create New</span>
                </button>
              </div>

              {/* Documents Grid */}
              {documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 surface-card border-dashed !border-[#252535] text-center">
                  <div className="w-14 h-14 rounded-xl bg-[#111118] border border-[#252535] flex items-center justify-center text-[#5c5c7a] mb-4">
                    <FileText size={26} aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No documents found</h3>
                  <p className="text-sm text-[#9898b3] max-w-sm mb-6">Create a resume or curriculum vitae to get started. All outputs automatically fetch data from your Canonical Profile.</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn btn-secondary btn-sm"
                  >
                    Create a Document
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {documents.map(doc => (
                    <div key={doc.id} className="surface-card surface-card-hover accent-hairline p-5 group flex flex-col h-48 justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2.5">
                          <span className={`chip !rounded-md !px-2 !py-0.5 text-[10px] font-extrabold uppercase tracking-widest ${
                            doc.type === 'resume' ? 'chip-indigo' : doc.type === 'cv' ? 'chip-cyan' : 'chip-success'
                          }`}>
                            {doc.type}
                          </span>
                          <span className="text-xs text-[#5c5c7a] font-mono">
                            {new Date(doc.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="font-bold text-base text-[#f2f2f7] group-hover:text-[#00d4ff] transition-colors truncate">{doc.title}</h3>
                        <p className="text-xs text-[#9898b3] mt-1 capitalize">Template: {doc.settings.template}</p>
                      </div>

                      <div className="flex items-center justify-between border-t border-[#1e1e2e]/60 pt-3.5">
                        <button
                          onClick={() => router.push(`/editor?id=${doc.id}`)}
                          className="flex items-center gap-1.5 text-xs font-bold text-[#6366f1] hover:text-[#00d4ff] transition-colors"
                        >
                          <Edit size={13} aria-hidden="true" />
                          <span>Open Editor</span>
                        </button>

                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="p-1.5 rounded-md text-[#5c5c7a] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors"
                          title="Delete Document"
                          aria-label={`Delete document ${doc.title}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MASTER CANONICAL PROFILE TAB */}
          {activeTab === 'profile' && profile && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Canonical Master Profile</h1>
                  <p className="text-sm text-[#9898b3] mt-1">This structured data is the single source of truth. All resumes and portfolio pages derive details directly from here.</p>
                </div>
              </div>

              {/* Document Ingestion / File Drop uploader */}
              <div className="p-5 bg-[#0c0c10]/80 border border-dashed border-[#252535] hover:border-[#6366f1]/50 rounded-xl transition-all relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[#6366f1] flex items-center justify-center shrink-0">
                    <Upload size={18} className={isIngesting ? "animate-pulse" : ""} />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-200">Import existing Resume / CV</h3>
                    <p className="text-[11px] text-[#9898b3] mt-0.5">Drag & drop or upload a PDF/DOCX file. Envoy AI extracts and structures your profile automatically.</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                  {isIngesting ? (
                    <div className="flex items-center gap-2 text-xs text-[#00d4ff] font-bold">
                      <Loader className="animate-spin text-[#00d4ff]" size={13} />
                      <span>Parsing document with AI...</span>
                    </div>
                  ) : (
                    <>
                      <input
                        type="file"
                        id="resume-upload"
                        accept=".pdf,.docx,.txt"
                        onChange={handleIngestFile}
                        className="hidden"
                      />
                      <label
                        htmlFor="resume-upload"
                        className="bg-[#16161f] border border-[#252535] hover:border-[#6366f1] text-[#f2f2f7] hover:text-[#6366f1] transition-all px-4 py-2 rounded-md font-bold text-xs cursor-pointer inline-flex items-center gap-2"
                      >
                        <span>Upload File</span>
                      </label>
                    </>
                  )}
                </div>
              </div>

              {/* Sub-tabs — segmented control */}
              <div className="segmented w-full overflow-x-auto" role="tablist" aria-label="Profile sections">
                <button
                  role="tab"
                  aria-selected={profileTab === 'identity'}
                  onClick={() => setProfileTab('identity')}
                  className={`segmented-item ${profileTab === 'identity' ? 'segmented-item-active' : ''}`}
                >
                  <User size={13} aria-hidden="true" />
                  <span>Identity</span>
                </button>
                <button
                  role="tab"
                  aria-selected={profileTab === 'experience'}
                  onClick={() => setProfileTab('experience')}
                  className={`segmented-item ${profileTab === 'experience' ? 'segmented-item-active' : ''}`}
                >
                  <Briefcase size={13} aria-hidden="true" />
                  <span>Experience ({profile.experience.length})</span>
                </button>
                <button
                  role="tab"
                  aria-selected={profileTab === 'education'}
                  onClick={() => setProfileTab('education')}
                  className={`segmented-item ${profileTab === 'education' ? 'segmented-item-active' : ''}`}
                >
                  <GraduationCap size={13} aria-hidden="true" />
                  <span>Education ({profile.education.length})</span>
                </button>
                <button
                  role="tab"
                  aria-selected={profileTab === 'skills'}
                  onClick={() => setProfileTab('skills')}
                  className={`segmented-item ${profileTab === 'skills' ? 'segmented-item-active' : ''}`}
                >
                  <Code size={13} aria-hidden="true" />
                  <span>Skills ({profile.skills.length})</span>
                </button>
                <button
                  role="tab"
                  aria-selected={profileTab === 'projects'}
                  onClick={() => setProfileTab('projects')}
                  className={`segmented-item ${profileTab === 'projects' ? 'segmented-item-active' : ''}`}
                >
                  <FolderGit size={13} aria-hidden="true" />
                  <span>Projects ({profile.projects.length})</span>
                </button>
              </div>

              {/* Sub-tab content */}
              <div className="bg-[#0c0c10]/40 border border-[#1e1e2e] rounded-xl p-6">
                
                {/* 1. IDENTITY FORM */}
                {profileTab === 'identity' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="identity-name" className="block text-xs font-semibold text-[#9898b3] uppercase tracking-wider mb-2">Full Name</label>
                      <input 
                        id="identity-name"
                        type="text"
                        value={profile.identity.name}
                        onChange={(e) => handleIdentityChange('name', e.target.value)}
                        className="w-full bg-[#111118]/80 border border-[#252535] rounded-md py-2 px-3 text-sm text-[#f2f2f7] focus:outline-none focus:border-[#6366f1]"
                      />
                    </div>
                    <div>
                      <label htmlFor="identity-headline" className="block text-xs font-semibold text-[#9898b3] uppercase tracking-wider mb-2">Headline / Job Title</label>
                      <input 
                        id="identity-headline"
                        type="text"
                        value={profile.identity.headline}
                        onChange={(e) => handleIdentityChange('headline', e.target.value)}
                        className="w-full bg-[#111118]/80 border border-[#252535] rounded-md py-2 px-3 text-sm text-[#f2f2f7] focus:outline-none focus:border-[#6366f1]"
                      />
                    </div>
                    <div>
                      <label htmlFor="identity-email" className="block text-xs font-semibold text-[#9898b3] uppercase tracking-wider mb-2">Email Address</label>
                      <input 
                        id="identity-email"
                        type="email"
                        value={profile.identity.email}
                        onChange={(e) => handleIdentityChange('email', e.target.value)}
                        className="w-full bg-[#111118]/80 border border-[#252535] rounded-md py-2 px-3 text-sm text-[#f2f2f7] focus:outline-none focus:border-[#6366f1]"
                      />
                    </div>
                    <div>
                      <label htmlFor="identity-phone" className="block text-xs font-semibold text-[#9898b3] uppercase tracking-wider mb-2">Phone Number</label>
                      <input 
                        id="identity-phone"
                        type="text"
                        value={profile.identity.phone || ''}
                        onChange={(e) => handleIdentityChange('phone', e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        className="w-full bg-[#111118]/80 border border-[#252535] rounded-md py-2 px-3 text-sm text-[#f2f2f7] focus:outline-none focus:border-[#6366f1]"
                      />
                    </div>
                    <div>
                      <label htmlFor="identity-location" className="block text-xs font-semibold text-[#9898b3] uppercase tracking-wider mb-2">Location</label>
                      <input 
                        id="identity-location"
                        type="text"
                        value={profile.identity.location || ''}
                        onChange={(e) => handleIdentityChange('location', e.target.value)}
                        placeholder="San Francisco, CA"
                        className="w-full bg-[#111118]/80 border border-[#252535] rounded-md py-2 px-3 text-sm text-[#f2f2f7] focus:outline-none focus:border-[#6366f1]"
                      />
                    </div>
                    <div>
                      <label htmlFor="identity-linkedin" className="block text-xs font-semibold text-[#9898b3] uppercase tracking-wider mb-2">LinkedIn URL</label>
                      <input 
                        id="identity-linkedin"
                        type="text"
                        value={profile.identity.linkedin || ''}
                        onChange={(e) => handleIdentityChange('linkedin', e.target.value)}
                        placeholder="https://linkedin.com/in/username"
                        className="w-full bg-[#111118]/80 border border-[#252535] rounded-md py-2 px-3 text-sm text-[#f2f2f7] focus:outline-none focus:border-[#6366f1]"
                      />
                    </div>
                    <div>
                      <label htmlFor="identity-github" className="block text-xs font-semibold text-[#9898b3] uppercase tracking-wider mb-2">GitHub URL</label>
                      <input 
                        id="identity-github"
                        type="text"
                        value={profile.identity.github || ''}
                        onChange={(e) => handleIdentityChange('github', e.target.value)}
                        placeholder="https://github.com/username"
                        className="w-full bg-[#111118]/80 border border-[#252535] rounded-md py-2 px-3 text-sm text-[#f2f2f7] focus:outline-none focus:border-[#6366f1]"
                      />
                    </div>
                    <div>
                      <label htmlFor="identity-website" className="block text-xs font-semibold text-[#9898b3] uppercase tracking-wider mb-2">Website URL</label>
                      <input 
                        id="identity-website"
                        type="text"
                        value={profile.identity.website || ''}
                        onChange={(e) => handleIdentityChange('website', e.target.value)}
                        placeholder="https://yourwebsite.com"
                        className="w-full bg-[#111118]/80 border border-[#252535] rounded-md py-2 px-3 text-sm text-[#f2f2f7] focus:outline-none focus:border-[#6366f1]"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="identity-summary" className="block text-xs font-semibold text-[#9898b3] uppercase tracking-wider mb-2">Professional Summary</label>
                      <textarea 
                        id="identity-summary"
                        value={profile.summary || ''}
                        onChange={(e) => {
                          const updated = { ...profile, summary: e.target.value, updatedAt: new Date().toISOString() }
                          saveProfile(updated)
                        }}
                        rows={4}
                        placeholder="A short summary detailing your professional career background, key competencies, and career goals."
                        className="w-full bg-[#111118]/80 border border-[#252535] rounded-md py-2 px-3 text-sm text-[#f2f2f7] focus:outline-none focus:border-[#6366f1] resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* 2. EXPERIENCE LIST */}
                {profileTab === 'experience' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[#9898b3]">Document entries are ordered in reverse chronological sorting automatically.</span>
                      <button
                        onClick={addExperience}
                        className="btn btn-secondary btn-sm"
                      >
                        <Plus size={13} aria-hidden="true" />
                        <span>Add Position</span>
                      </button>
                    </div>

                    {profile.experience.length === 0 ? (
                      <p className="text-center py-6 text-sm text-[#5c5c7a]">No work experience entries added yet.</p>
                    ) : (
                      <div className="space-y-4">
                        {profile.experience.map(exp => (
                          <div key={exp.id} className="border border-[#1e1e2e] bg-[#111118]/50 p-4 rounded-lg space-y-4">
                            <div className="flex justify-between items-start gap-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 flex-1">
                                <div>
                                  <label className="block text-[10px] font-semibold text-[#5c5c7a] uppercase mb-1">Company</label>
                                  <input 
                                    type="text"
                                    value={exp.company}
                                    onChange={(e) => updateExperience(exp.id, 'company', e.target.value)}
                                    className="w-full bg-[#050507] border border-[#252535] rounded px-2 py-1 text-xs text-[#f2f2f7]"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold text-[#5c5c7a] uppercase mb-1">Role / Job Title</label>
                                  <input 
                                    type="text"
                                    value={exp.role}
                                    onChange={(e) => updateExperience(exp.id, 'role', e.target.value)}
                                    className="w-full bg-[#050507] border border-[#252535] rounded px-2 py-1 text-xs text-[#f2f2f7]"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold text-[#5c5c7a] uppercase mb-1">Start Date</label>
                                  <input 
                                    type="text"
                                    value={exp.startDate}
                                    onChange={(e) => updateExperience(exp.id, 'startDate', e.target.value)}
                                    placeholder="YYYY-MM"
                                    className="w-full bg-[#050507] border border-[#252535] rounded px-2 py-1 text-xs text-[#f2f2f7]"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold text-[#5c5c7a] uppercase mb-1">End Date / Current</label>
                                  <div className="flex items-center gap-2">
                                    <input 
                                      type="text"
                                      value={exp.current ? '' : exp.endDate || ''}
                                      onChange={(e) => updateExperience(exp.id, 'endDate', e.target.value)}
                                      disabled={exp.current}
                                      placeholder="YYYY-MM"
                                      className="flex-1 bg-[#050507] border border-[#252535] rounded px-2 py-1 text-xs text-[#f2f2f7] disabled:opacity-50"
                                    />
                                    <label className="flex items-center gap-1 text-[10px] font-semibold text-[#5c5c7a]">
                                      <input 
                                        type="checkbox"
                                        checked={exp.current}
                                        onChange={(e) => updateExperience(exp.id, 'current', e.target.checked)}
                                        className="rounded border-[#252535]"
                                      />
                                      <span>Current</span>
                                    </label>
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => deleteExperience(exp.id)}
                                className="p-1.5 rounded hover:bg-[#ef4444]/10 text-[#5c5c7a] hover:text-[#ef4444] transition-colors shrink-0 mt-5"
                                aria-label={`Delete experience at ${exp.company}`}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                            
                            <div>
                              <label className="block text-[10px] font-semibold text-[#5c5c7a] uppercase mb-1">Bullets & Accomplishments</label>
                              <textarea 
                                value={exp.bullets.join('\n')}
                                onChange={(e) => updateExperience(exp.id, 'bullets', e.target.value.split('\n'))}
                                rows={3}
                                className="w-full bg-[#050507] border border-[#252535] rounded p-2 text-xs text-[#f2f2f7] resize-none"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. EDUCATION LIST */}
                {profileTab === 'education' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[#9898b3]">Add university degree or credential entries.</span>
                      <button
                        onClick={addEducation}
                        className="btn btn-secondary btn-sm"
                      >
                        <Plus size={13} aria-hidden="true" />
                        <span>Add Education</span>
                      </button>
                    </div>

                    {profile.education.length === 0 ? (
                      <p className="text-center py-6 text-sm text-[#5c5c7a]">No education credentials added yet.</p>
                    ) : (
                      <div className="space-y-4">
                        {profile.education.map(edu => (
                          <div key={edu.id} className="border border-[#1e1e2e] bg-[#111118]/50 p-4 rounded-lg space-y-4">
                            <div className="flex justify-between items-start gap-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 flex-1">
                                <div>
                                  <label className="block text-[10px] font-semibold text-[#5c5c7a] uppercase mb-1">Institution</label>
                                  <input 
                                    type="text"
                                    value={edu.institution}
                                    onChange={(e) => updateEducation(edu.id, 'institution', e.target.value)}
                                    className="w-full bg-[#050507] border border-[#252535] rounded px-2 py-1 text-xs text-[#f2f2f7]"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold text-[#5c5c7a] uppercase mb-1">Degree & Major</label>
                                  <input 
                                    type="text"
                                    value={edu.degree}
                                    onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)}
                                    className="w-full bg-[#050507] border border-[#252535] rounded px-2 py-1 text-xs text-[#f2f2f7]"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold text-[#5c5c7a] uppercase mb-1">Start Date</label>
                                  <input 
                                    type="text"
                                    value={edu.startDate}
                                    onChange={(e) => updateEducation(edu.id, 'startDate', e.target.value)}
                                    placeholder="YYYY-MM"
                                    className="w-full bg-[#050507] border border-[#252535] rounded px-2 py-1 text-xs text-[#f2f2f7]"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold text-[#5c5c7a] uppercase mb-1">End Date / Current</label>
                                  <div className="flex items-center gap-2">
                                    <input 
                                      type="text"
                                      value={edu.current ? '' : edu.endDate || ''}
                                      onChange={(e) => updateEducation(edu.id, 'endDate', e.target.value)}
                                      disabled={edu.current}
                                      placeholder="YYYY-MM"
                                      className="flex-1 bg-[#050507] border border-[#252535] rounded px-2 py-1 text-xs text-[#f2f2f7] disabled:opacity-50"
                                    />
                                    <label className="flex items-center gap-1 text-[10px] font-semibold text-[#5c5c7a]">
                                      <input 
                                        type="checkbox"
                                        checked={edu.current}
                                        onChange={(e) => updateEducation(edu.id, 'current', e.target.checked)}
                                        className="rounded border-[#252535]"
                                      />
                                      <span>Current</span>
                                    </label>
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => deleteEducation(edu.id)}
                                className="p-1.5 rounded hover:bg-[#ef4444]/10 text-[#5c5c7a] hover:text-[#ef4444] transition-colors shrink-0 mt-5"
                                aria-label={`Delete education at ${edu.institution}`}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. SKILLS LIST */}
                {profileTab === 'skills' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[#9898b3]">Define structured groups of technical competencies.</span>
                      <button
                        onClick={addSkillGroup}
                        className="btn btn-secondary btn-sm"
                      >
                        <Plus size={13} aria-hidden="true" />
                        <span>Add Category</span>
                      </button>
                    </div>

                    {profile.skills.length === 0 ? (
                      <p className="text-center py-6 text-sm text-[#5c5c7a]">No skills groups added yet.</p>
                    ) : (
                      <div className="space-y-4">
                        {profile.skills.map(group => (
                          <div key={group.id} className="border border-[#1e1e2e] bg-[#111118]/50 p-4 rounded-lg space-y-4">
                            <div className="flex justify-between items-start gap-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                                <div>
                                  <label className="block text-[10px] font-semibold text-[#5c5c7a] uppercase mb-1">Category / Group Name</label>
                                  <input 
                                    type="text"
                                    value={group.category}
                                    onChange={(e) => updateSkillGroup(group.id, 'category', e.target.value)}
                                    className="w-full bg-[#050507] border border-[#252535] rounded px-2 py-1 text-xs text-[#f2f2f7]"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold text-[#5c5c7a] uppercase mb-1">Skills (comma-separated)</label>
                                  <input 
                                    type="text"
                                    value={group.skills.join(', ')}
                                    onChange={(e) => updateSkillGroup(group.id, 'skills', e.target.value.split(',').map(s => s.trim()))}
                                    className="w-full bg-[#050507] border border-[#252535] rounded px-2 py-1 text-xs text-[#f2f2f7]"
                                  />
                                </div>
                              </div>
                              <button
                                onClick={() => deleteSkillGroup(group.id)}
                                className="p-1.5 rounded hover:bg-[#ef4444]/10 text-[#5c5c7a] hover:text-[#ef4444] transition-colors shrink-0 mt-5"
                                aria-label={`Delete skill group ${group.category}`}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 5. PROJECTS LIST */}
                {profileTab === 'projects' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[#9898b3]">Detail projects you have built and showcase them.</span>
                      <button
                        onClick={addProject}
                        className="btn btn-secondary btn-sm"
                      >
                        <Plus size={13} aria-hidden="true" />
                        <span>Add Project</span>
                      </button>
                    </div>

                    {profile.projects.length === 0 ? (
                      <p className="text-center py-6 text-sm text-[#5c5c7a]">No projects added yet.</p>
                    ) : (
                      <div className="space-y-4">
                        {profile.projects.map(proj => (
                          <div key={proj.id} className="border border-[#1e1e2e] bg-[#111118]/50 p-4 rounded-lg space-y-4">
                            <div className="flex justify-between items-start gap-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 flex-1">
                                <div>
                                  <label className="block text-[10px] font-semibold text-[#5c5c7a] uppercase mb-1">Project Name</label>
                                  <input 
                                    type="text"
                                    value={proj.name}
                                    onChange={(e) => updateProject(proj.id, 'name', e.target.value)}
                                    className="w-full bg-[#050507] border border-[#252535] rounded px-2 py-1 text-xs text-[#f2f2f7]"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold text-[#5c5c7a] uppercase mb-1">GitHub Link (optional)</label>
                                  <input 
                                    type="text"
                                    value={proj.github || ''}
                                    onChange={(e) => updateProject(proj.id, 'github', e.target.value)}
                                    className="w-full bg-[#050507] border border-[#252535] rounded px-2 py-1 text-xs text-[#f2f2f7]"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold text-[#5c5c7a] uppercase mb-1">Live URL (optional)</label>
                                  <input 
                                    type="text"
                                    value={proj.url || ''}
                                    onChange={(e) => updateProject(proj.id, 'url', e.target.value)}
                                    className="w-full bg-[#050507] border border-[#252535] rounded px-2 py-1 text-xs text-[#f2f2f7]"
                                  />
                                </div>
                              </div>
                              <button
                                onClick={() => deleteProject(proj.id)}
                                className="p-1.5 rounded hover:bg-[#ef4444]/10 text-[#5c5c7a] hover:text-[#ef4444] transition-colors shrink-0 mt-5"
                                aria-label={`Delete project ${proj.name}`}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                            
                            <div>
                              <label className="block text-[10px] font-semibold text-[#5c5c7a] uppercase mb-1">Project Description</label>
                              <textarea 
                                value={proj.description}
                                onChange={(e) => updateProject(proj.id, 'description', e.target.value)}
                                rows={2}
                                className="w-full bg-[#050507] border border-[#252535] rounded p-2 text-xs text-[#f2f2f7] resize-none"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PORTFOLIO SETTINGS TAB */}
          {activeTab === 'portfolio' && portfolio && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Portfolio Settings</h1>
                <p className="text-sm text-[#9898b3] mt-1">Deploy a beautiful, responsive portfolio site showcasing your projects and background with a single command.</p>
              </div>

              <div className="bg-[#0c0c10]/40 border border-[#1e1e2e] rounded-xl p-6 space-y-6">
                
                {/* Visibility status banner */}
                <div className={`p-4 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  portfolio.visibility === 'private'
                    ? 'bg-[#111118]/60 border-[#252535]'
                    : 'bg-emerald-500/[0.06] border-emerald-500/20'
                }`}>
                  <div className="flex items-start gap-3">
                    {portfolio.visibility === 'private' ? (
                      <AlertCircle size={17} className="text-[#9898b3] shrink-0 mt-0.5" aria-hidden="true" />
                    ) : (
                      <CheckCircle size={17} className="text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                    )}
                    <div className="text-xs text-[#9898b3] leading-relaxed">
                      {portfolio.visibility === 'private' ? (
                        <>
                          <span className={`chip chip-neutral !py-0.5 mr-2 align-middle`}>Private</span>
                          <span className="font-semibold text-[#f2f2f7]">Only you can see this site.</span>{' '}
                          Switch visibility to Public or Unlisted and save to publish.
                        </>
                      ) : (
                        <>
                          <span className={`chip chip-success !py-0.5 mr-2 align-middle`}>
                            {portfolio.visibility === 'public' ? 'Public' : 'Unlisted'}
                          </span>
                          <span className="font-semibold text-[#f2f2f7]">Your portfolio is live.</span> Any
                          changes saved below are instantly published.
                        </>
                      )}
                    </div>
                  </div>
                  <a 
                    href={`/p/${portfolio.slug}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-[#00d4ff] hover:underline font-bold whitespace-nowrap"
                  >
                    View Published Site →
                  </a>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {/* Slug input */}
                  <div>
                    <label className="block text-xs font-semibold text-[#9898b3] uppercase tracking-wider mb-2">Custom Slug</label>
                    <div className="flex">
                      <span className="bg-[#111118] border border-[#252535] border-r-0 rounded-l-md px-3 py-2 text-xs text-[#5c5c7a] select-none flex items-center">
                        /p/
                      </span>
                      <input 
                        type="text"
                        value={portfolio.slug}
                        onChange={(e) => setPortfolioState({ ...portfolio, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                        className="flex-1 bg-[#111118]/80 border border-[#252535] rounded-r-md py-2 px-3 text-xs text-[#f2f2f7] focus:outline-none focus:border-[#6366f1]"
                      />
                    </div>
                  </div>

                  {/* Theme Select */}
                  <div>
                    <label className="block text-xs font-semibold text-[#9898b3] uppercase tracking-wider mb-2">Portfolio Theme</label>
                    <select 
                      value={portfolio.theme}
                      onChange={(e) => setPortfolioState({ ...portfolio, theme: e.target.value as PortfolioTheme })}
                      className="w-full bg-[#111118]/80 border border-[#252535] rounded-md py-2 px-3 text-xs text-[#f2f2f7] focus:outline-none focus:border-[#6366f1]"
                    >
                      <option value="minimal">Minimal (Elegant Editorial)</option>
                      <option value="developer">Developer (IDE Console Layout)</option>
                      <option value="bold">Creative Grid (Vibrant Blocks)</option>
                    </select>
                  </div>

                  {/* Visibility Select */}
                  <div>
                    <label htmlFor="portfolio-visibility" className="block text-xs font-semibold text-[#9898b3] uppercase tracking-wider mb-2">Visibility Status</label>
                    <select 
                      id="portfolio-visibility"
                      value={portfolio.visibility}
                      onChange={(e) => setPortfolioState({ ...portfolio, visibility: e.target.value as PortfolioVisibility })}
                      className="w-full bg-[#111118]/80 border border-[#252535] rounded-md py-2 px-3 text-xs text-[#f2f2f7] focus:outline-none focus:border-[#6366f1]"
                    >
                      <option value="public">Public (Indexed & Searchable)</option>
                      <option value="unlisted">Unlisted (Direct Link Only)</option>
                      <option value="private">Private (Owner Only Access)</option>
                    </select>
                    {portfolio.visibility !== 'private' && (
                      <p className="text-[10px] text-amber-400 mt-2 leading-relaxed" role="note">
                        Publishing makes this portfolio viewable by anyone{portfolio.visibility === 'public' ? ', including search engines' : ' with the direct link'}. Your name, contact details, and career history will be exposed.
                      </p>
                    )}
                  </div>
                </div>

                {/* Section Visibility Controls */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-[#f2f2f7] uppercase tracking-wider">Visible Sections & Order</h3>
                  <div className="space-y-2">
                    {portfolio.sections.map((sec, idx) => (
                      <div key={sec.id} className="flex items-center justify-between p-3 bg-[#111118]/40 border border-[#1e1e2e] rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[#5c5c7a] font-mono">#{idx + 1}</span>
                          <span className="text-xs font-bold text-gray-200 capitalize">{sec.title || sec.type}</span>
                        </div>
                        <button
                          onClick={() => {
                            const updated = [...portfolio.sections]
                            updated[idx] = { ...sec, visible: !sec.visible }
                            setPortfolioState({ ...portfolio, sections: updated })
                          }}
                          className={`text-[10px] px-2.5 py-1 rounded font-bold uppercase transition-all ${
                            sec.visible 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                          }`}
                        >
                          {sec.visible ? 'Visible' : 'Hidden'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Save action button — publishing is an explicit user action
                    (audit finding S7): saving with a non-private visibility
                    stamps publishedAt the first time the site goes live. */}
                <button
                  onClick={async () => {
                    try {
                      const siteToSave = {
                        ...portfolio,
                        publishedAt: resolvePublishedAt({
                          visibility: portfolio.visibility,
                          currentPublishedAt: portfolio.publishedAt,
                        }),
                        updatedAt: new Date().toISOString(),
                      }
                      setPortfolioState(siteToSave)
                      await dbPortfolios.save(siteToSave)
                      showNotification(
                        portfolio.visibility === 'private'
                          ? 'Portfolio settings saved (site is private).'
                          : 'Portfolio settings saved and published!',
                        'success'
                      )
                    } catch (err) {
                      console.error('Save portfolio failed:', err)
                      showNotification('Save failed', 'error')
                    }
                  }}
                  className="btn btn-primary btn-sm"
                >
                  {portfolio.visibility === 'private' ? 'Save Portfolio Settings' : 'Save & Publish Portfolio'}
                </button>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* CREATE DOCUMENT MODAL */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-[#000000]/70 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateModal(false)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-doc-title"
            className="surface-card accent-hairline w-full max-w-md p-6 space-y-6 animate-scale-in"
          >
            <div>
              <h3 id="create-doc-title" className="text-lg font-bold text-[#f2f2f7]">Create New Career Document</h3>
              <p className="text-xs text-[#9898b3] mt-1">This document will draw elements from your Canonical Profile.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="create-doc-name" className="block text-xs font-semibold text-[#9898b3] uppercase tracking-wider mb-2">Document Title</label>
                <input 
                  id="create-doc-name"
                  type="text"
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  placeholder="e.g. Senior Backend Resume"
                  autoFocus
                  className="w-full bg-[#111118]/80 border border-[#252535] rounded-md py-2 px-3 text-sm text-[#f2f2f7] focus:outline-none focus:border-[#6366f1]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="create-doc-type" className="block text-xs font-semibold text-[#9898b3] uppercase tracking-wider mb-2">Output Type</label>
                  <select 
                    id="create-doc-type"
                    value={newDocType}
                    onChange={(e) => setNewDocType(e.target.value as DocumentType)}
                    className="w-full bg-[#111118]/80 border border-[#252535] rounded-md py-2 px-3 text-sm text-[#f2f2f7] focus:outline-none"
                  >
                    <option value="resume">Resume (A4)</option>
                    <option value="cv">Academic CV</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="create-doc-template" className="block text-xs font-semibold text-[#9898b3] uppercase tracking-wider mb-2">Base Layout</label>
                  <select 
                    id="create-doc-template"
                    value={newDocTemplate}
                    onChange={(e) => setNewDocTemplate(e.target.value as TemplateId)}
                    className="w-full bg-[#111118]/80 border border-[#252535] rounded-md py-2 px-3 text-sm text-[#f2f2f7] focus:outline-none"
                  >
                    <option value="minimal">Minimal</option>
                    <option value="modern">Modern</option>
                    <option value="developer">Developer</option>
                    <option value="academic">Academic</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDocument}
                className="btn btn-primary btn-sm"
              >
                Create Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
