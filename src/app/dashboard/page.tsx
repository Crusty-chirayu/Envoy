'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/Logo'
import { authService } from '@/lib/auth'
import { dbProfile, dbDocuments, checkDemoMode } from '@/lib/db'
import type { ProfessionalProfile, EnvoyDocument, ExperienceEntry, EducationEntry, SkillGroup, ProjectEntry, AppUser, DocumentType, TemplateId } from '@/types'
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
        console.error('Workspace load error:', err)
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
    }
    setProfileState(userProfile)

    // 2. Get documents
    const userDocs = await dbDocuments.getAll(userId)
    setDocuments(userDocs)
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
      <div className="min-h-screen bg-[#050507] text-[#f2f2f7] flex items-center justify-center">
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
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
            isDemo 
              ? 'text-orange-400 bg-orange-500/10 border-orange-500/20' 
              : 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
          }`}>
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
              className="p-2 rounded-md hover:bg-[#16161f] text-[#9898b3] hover:text-[#f2f2f7] transition-colors"
              title="Sign Out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-md shadow-lg border bg-[#0c0c10] flex items-center gap-3 text-sm animate-fade-in border-[#252535]">
          <CheckCircle size={16} className="text-green-400" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto p-6 gap-6 relative z-10">
        
        {/* Left Nav Menu */}
        <aside className="w-64 shrink-0 flex flex-col gap-2 hidden md:flex">
          <div className="p-4 rounded-lg bg-[#0c0c10]/40 border border-[#1e1e2e] mb-4">
            <div className="flex justify-between items-center text-xs font-semibold text-[#9898b3] uppercase tracking-wider mb-2">
              <span>Profile Progress</span>
              <span>{calculateProfileCompleteness()}%</span>
            </div>
            <div className="w-full bg-[#16161f] rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-[#6366f1] to-[#00d4ff] h-1.5 rounded-full transition-all duration-500" 
                style={{ width: `${calculateProfileCompleteness()}%` }}
              />
            </div>
          </div>

          <button
            onClick={() => setActiveTab('docs')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm font-semibold transition-all ${
              activeTab === 'docs' 
                ? 'bg-[#16161f] text-[#00d4ff] border-l-2 border-[#00d4ff]' 
                : 'text-[#9898b3] hover:text-[#f2f2f7] hover:bg-[#0c0c10]/40'
            }`}
          >
            <FileText size={18} />
            <span>Documents Grid</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm font-semibold transition-all ${
              activeTab === 'profile' 
                ? 'bg-[#16161f] text-[#00d4ff] border-l-2 border-[#00d4ff]' 
                : 'text-[#9898b3] hover:text-[#f2f2f7] hover:bg-[#0c0c10]/40'
            }`}
          >
            <User size={18} />
            <span>Master Profile</span>
          </button>

          <button
            onClick={() => setActiveTab('portfolio')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm font-semibold transition-all ${
              activeTab === 'portfolio' 
                ? 'bg-[#16161f] text-[#00d4ff] border-l-2 border-[#00d4ff]' 
                : 'text-[#9898b3] hover:text-[#f2f2f7] hover:bg-[#0c0c10]/40'
            }`}
          >
            <Layout size={18} />
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
                  className="flex items-center gap-2 bg-[#6366f1] text-[#050507] hover:opacity-90 transition-opacity px-4 py-2 rounded-md font-bold text-sm shadow-[0_0_20px_rgba(99,102,241,0.2)]"
                >
                  <Plus size={16} />
                  <span>Create New</span>
                </button>
              </div>

              {/* Documents Grid */}
              {documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 bg-[#0c0c10]/40 border border-dashed border-[#252535] rounded-xl text-center">
                  <FileText size={48} className="text-[#5c5c7a] mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No documents found</h3>
                  <p className="text-sm text-[#9898b3] max-w-sm mb-6">Create a resume or curriculum vitae to get started. All outputs automatically fetch data from your Canonical Profile.</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 bg-[#16161f] border border-[#252535] text-[#f2f2f7] px-4 py-2 rounded-md font-semibold text-sm hover:bg-[#1c1c28] transition-all"
                  >
                    Create a Document
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {documents.map(doc => (
                    <div key={doc.id} className="bg-[#0c0c10]/60 border border-[#1e1e2e] rounded-xl p-5 hover:border-[#252535] transition-all group flex flex-col h-48 justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded ${
                            doc.type === 'resume' 
                              ? 'bg-blue-500/10 text-blue-400' 
                              : doc.type === 'cv' 
                              ? 'bg-purple-500/10 text-purple-400'
                              : 'bg-emerald-500/10 text-emerald-400'
                          }`}>
                            {doc.type}
                          </span>
                          <span className="text-xs text-[#5c5c7a]">
                            {new Date(doc.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="font-bold text-base text-[#f2f2f7] group-hover:text-[#00d4ff] transition-colors truncate">{doc.title}</h3>
                        <p className="text-xs text-[#9898b3] mt-1 capitalize">Template: {doc.settings.template}</p>
                      </div>

                      <div className="flex items-center justify-between border-t border-[#1e1e2e]/50 pt-4">
                        <button
                          onClick={() => router.push(`/editor?id=${doc.id}`)}
                          className="flex items-center gap-1.5 text-xs font-bold text-[#6366f1] hover:underline"
                        >
                          <Edit size={14} />
                          <span>Open Editor</span>
                        </button>

                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="text-[#5c5c7a] hover:text-[#ef4444] transition-colors"
                          title="Delete Document"
                        >
                          <Trash2 size={15} />
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

              {/* Sub-tabs horizontal bar */}
              <div className="flex items-center gap-2 border-b border-[#1e1e2e] pb-px overflow-x-auto">
                <button
                  onClick={() => setProfileTab('identity')}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                    profileTab === 'identity' 
                      ? 'border-[#00d4ff] text-[#00d4ff]' 
                      : 'border-transparent text-[#9898b3] hover:text-[#f2f2f7]'
                  }`}
                >
                  <User size={14} />
                  <span>Identity</span>
                </button>
                <button
                  onClick={() => setProfileTab('experience')}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                    profileTab === 'experience' 
                      ? 'border-[#00d4ff] text-[#00d4ff]' 
                      : 'border-transparent text-[#9898b3] hover:text-[#f2f2f7]'
                  }`}
                >
                  <Briefcase size={14} />
                  <span>Experience ({profile.experience.length})</span>
                </button>
                <button
                  onClick={() => setProfileTab('education')}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                    profileTab === 'education' 
                      ? 'border-[#00d4ff] text-[#00d4ff]' 
                      : 'border-transparent text-[#9898b3] hover:text-[#f2f2f7]'
                  }`}
                >
                  <GraduationCap size={14} />
                  <span>Education ({profile.education.length})</span>
                </button>
                <button
                  onClick={() => setProfileTab('skills')}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                    profileTab === 'skills' 
                      ? 'border-[#00d4ff] text-[#00d4ff]' 
                      : 'border-transparent text-[#9898b3] hover:text-[#f2f2f7]'
                  }`}
                >
                  <Code size={14} />
                  <span>Skills ({profile.skills.length})</span>
                </button>
                <button
                  onClick={() => setProfileTab('projects')}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                    profileTab === 'projects' 
                      ? 'border-[#00d4ff] text-[#00d4ff]' 
                      : 'border-transparent text-[#9898b3] hover:text-[#f2f2f7]'
                  }`}
                >
                  <FolderGit size={14} />
                  <span>Projects ({profile.projects.length})</span>
                </button>
              </div>

              {/* Sub-tab content */}
              <div className="bg-[#0c0c10]/40 border border-[#1e1e2e] rounded-xl p-6">
                
                {/* 1. IDENTITY FORM */}
                {profileTab === 'identity' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-semibold text-[#9898b3] uppercase tracking-wider mb-2">Full Name</label>
                      <input 
                        type="text"
                        value={profile.identity.name}
                        onChange={(e) => handleIdentityChange('name', e.target.value)}
                        className="w-full bg-[#111118]/80 border border-[#252535] rounded-md py-2 px-3 text-sm text-[#f2f2f7] focus:outline-none focus:border-[#6366f1]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#9898b3] uppercase tracking-wider mb-2">Headline / Job Title</label>
                      <input 
                        type="text"
                        value={profile.identity.headline}
                        onChange={(e) => handleIdentityChange('headline', e.target.value)}
                        className="w-full bg-[#111118]/80 border border-[#252535] rounded-md py-2 px-3 text-sm text-[#f2f2f7] focus:outline-none focus:border-[#6366f1]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#9898b3] uppercase tracking-wider mb-2">Email Address</label>
                      <input 
                        type="email"
                        value={profile.identity.email}
                        onChange={(e) => handleIdentityChange('email', e.target.value)}
                        className="w-full bg-[#111118]/80 border border-[#252535] rounded-md py-2 px-3 text-sm text-[#f2f2f7] focus:outline-none focus:border-[#6366f1]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#9898b3] uppercase tracking-wider mb-2">Phone Number</label>
                      <input 
                        type="text"
                        value={profile.identity.phone || ''}
                        onChange={(e) => handleIdentityChange('phone', e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        className="w-full bg-[#111118]/80 border border-[#252535] rounded-md py-2 px-3 text-sm text-[#f2f2f7] focus:outline-none focus:border-[#6366f1]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#9898b3] uppercase tracking-wider mb-2">Location</label>
                      <input 
                        type="text"
                        value={profile.identity.location || ''}
                        onChange={(e) => handleIdentityChange('location', e.target.value)}
                        placeholder="San Francisco, CA"
                        className="w-full bg-[#111118]/80 border border-[#252535] rounded-md py-2 px-3 text-sm text-[#f2f2f7] focus:outline-none focus:border-[#6366f1]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#9898b3] uppercase tracking-wider mb-2">LinkedIn URL</label>
                      <input 
                        type="text"
                        value={profile.identity.linkedin || ''}
                        onChange={(e) => handleIdentityChange('linkedin', e.target.value)}
                        placeholder="https://linkedin.com/in/username"
                        className="w-full bg-[#111118]/80 border border-[#252535] rounded-md py-2 px-3 text-sm text-[#f2f2f7] focus:outline-none focus:border-[#6366f1]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#9898b3] uppercase tracking-wider mb-2">GitHub URL</label>
                      <input 
                        type="text"
                        value={profile.identity.github || ''}
                        onChange={(e) => handleIdentityChange('github', e.target.value)}
                        placeholder="https://github.com/username"
                        className="w-full bg-[#111118]/80 border border-[#252535] rounded-md py-2 px-3 text-sm text-[#f2f2f7] focus:outline-none focus:border-[#6366f1]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#9898b3] uppercase tracking-wider mb-2">Website URL</label>
                      <input 
                        type="text"
                        value={profile.identity.website || ''}
                        onChange={(e) => handleIdentityChange('website', e.target.value)}
                        placeholder="https://yourwebsite.com"
                        className="w-full bg-[#111118]/80 border border-[#252535] rounded-md py-2 px-3 text-sm text-[#f2f2f7] focus:outline-none focus:border-[#6366f1]"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-[#9898b3] uppercase tracking-wider mb-2">Professional Summary</label>
                      <textarea 
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
                        className="flex items-center gap-1 text-xs bg-[#16161f] border border-[#252535] text-[#f2f2f7] px-3 py-1.5 rounded-md hover:bg-[#1c1c28]"
                      >
                        <Plus size={14} />
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
                        className="flex items-center gap-1 text-xs bg-[#16161f] border border-[#252535] text-[#f2f2f7] px-3 py-1.5 rounded-md hover:bg-[#1c1c28]"
                      >
                        <Plus size={14} />
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
                        className="flex items-center gap-1 text-xs bg-[#16161f] border border-[#252535] text-[#f2f2f7] px-3 py-1.5 rounded-md hover:bg-[#1c1c28]"
                      >
                        <Plus size={14} />
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
                        className="flex items-center gap-1 text-xs bg-[#16161f] border border-[#252535] text-[#f2f2f7] px-3 py-1.5 rounded-md hover:bg-[#1c1c28]"
                      >
                        <Plus size={14} />
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
          {activeTab === 'portfolio' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Portfolio Settings</h1>
                <p className="text-sm text-[#9898b3] mt-1">Deploy a beautiful, responsive portfolio site showcasing your projects and background with a single command.</p>
              </div>

              <div className="bg-[#0c0c10]/40 border border-[#1e1e2e] rounded-xl p-6 space-y-6">
                <div className="p-4 rounded-md bg-[#111118]/60 border border-[#252535] flex items-start gap-3">
                  <AlertCircle size={18} className="text-[#00d4ff] shrink-0 mt-0.5" />
                  <div className="text-xs text-[#9898b3]">
                    <span className="font-bold text-[#f2f2f7]">Live Portfolio builder integration is coming.</span> In Connected Mode, details are published to <code className="text-[#00d4ff]">/p/[slug]</code>. You can customize the path and template settings below.
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-[#9898b3] uppercase tracking-wider mb-2">Custom Slug</label>
                    <div className="flex">
                      <span className="bg-[#111118] border border-[#252535] border-r-0 rounded-l-md px-3 py-2 text-sm text-[#5c5c7a] select-none flex items-center">
                        envoy.app/p/
                      </span>
                      <input 
                        type="text"
                        defaultValue={profile?.identity.name.toLowerCase().replace(/\s+/g, '-') || 'john-doe'}
                        className="flex-1 bg-[#111118]/80 border border-[#252535] rounded-r-md py-2 px-3 text-sm text-[#f2f2f7] focus:outline-none focus:border-[#6366f1]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#9898b3] uppercase tracking-wider mb-2">Portfolio Theme</label>
                    <select className="w-full bg-[#111118]/80 border border-[#252535] rounded-md py-2 px-3 text-sm text-[#f2f2f7] focus:outline-none focus:border-[#6366f1]">
                      <option value="minimal">Minimal (Elegant Typography)</option>
                      <option value="developer">Developer (Sleek Console)</option>
                      <option value="bold">Creative Grid</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={() => showNotification('Portfolio site settings updated', 'success')}
                  className="bg-[#6366f1] text-[#050507] font-bold text-sm px-4 py-2 rounded-md hover:opacity-90 transition-opacity"
                >
                  Save Settings
                </button>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* CREATE DOCUMENT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-[#000000]/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-[#0c0c10]/95 border border-[#252535] w-full max-w-md rounded-xl p-6 shadow-2xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-[#f2f2f7]">Create New Career Document</h3>
              <p className="text-xs text-[#9898b3] mt-1">This document will draw elements from your Canonical Profile.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#9898b3] uppercase tracking-wider mb-2">Document Title</label>
                <input 
                  type="text"
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  placeholder="e.g. Senior Backend Resume"
                  className="w-full bg-[#111118]/80 border border-[#252535] rounded-md py-2 px-3 text-sm text-[#f2f2f7] focus:outline-none focus:border-[#6366f1]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#9898b3] uppercase tracking-wider mb-2">Output Type</label>
                  <select 
                    value={newDocType}
                    onChange={(e) => setNewDocType(e.target.value as DocumentType)}
                    className="w-full bg-[#111118]/80 border border-[#252535] rounded-md py-2 px-3 text-sm text-[#f2f2f7] focus:outline-none"
                  >
                    <option value="resume">Resume (A4)</option>
                    <option value="cv">Academic CV</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#9898b3] uppercase tracking-wider mb-2">Base Layout</label>
                  <select 
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
                className="px-4 py-2 border border-[#252535] rounded-md text-sm text-[#9898b3] hover:bg-[#16161f] transition-all font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDocument}
                className="bg-[#6366f1] text-[#050507] hover:opacity-90 transition-opacity px-4 py-2 rounded-md font-bold text-sm"
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
