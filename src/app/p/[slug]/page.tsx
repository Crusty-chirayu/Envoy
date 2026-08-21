'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { dbPortfolios, dbProfile } from '@/lib/db'
import type { PortfolioSite, ProfessionalProfile } from '@/types'
import { 
  Mail, Phone, MapPin, Linkedin, Github, ExternalLink
} from 'lucide-react'

export default function PublicPortfolioPage() {
  const params = useParams()
  const slug = typeof params?.slug === 'string' ? params.slug : ''

  const [loading, setLoading] = useState(true)
  const [site, setSite] = useState<PortfolioSite | null>(null)
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null)

  useEffect(() => {
    if (!slug) return
    const loadData = async () => {
      try {
        const portfolioSite = await dbPortfolios.getBySlug(slug)
        if (portfolioSite) {
          setSite(portfolioSite)
          const userProfile = await dbProfile.get(portfolioSite.userId)
          if (userProfile) {
            setProfile(userProfile)
          }
        }
      } catch (err) {
        console.error('Failed to load portfolio data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050507] text-[#f2f2f7] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#00d4ff]" />
      </div>
    )
  }

  if (!site || !profile || site.visibility === 'private') {
    return (
      <div className="min-h-screen bg-[#050507] text-[#f2f2f7] flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight mb-2">404 - Portfolio Not Found</h1>
        <p className="text-sm text-[#9898b3] max-w-md">This portfolio site does not exist or has been set to private by the owner.</p>
        <Link href="/" className="mt-6 text-xs text-[#00d4ff] hover:underline font-bold">Go Back Home →</Link>
      </div>
    )
  }

  const theme = site.theme || 'minimal'

  return (
    <div className={`min-h-screen ${
      theme === 'developer' 
        ? 'bg-[#050507] text-emerald-400 font-mono selection:bg-emerald-900 selection:text-emerald-300' 
        : theme === 'bold'
        ? 'bg-gradient-to-br from-[#0c0c15] via-[#050508] to-[#120a1c] text-[#f2f2f7]'
        : 'bg-[#0a0a0c] text-[#f2f2f7]'
    }`}>
      {theme === 'developer' && <DeveloperThemeView profile={profile} site={site} />}
      {theme === 'bold' && <BoldThemeView profile={profile} site={site} />}
      {theme === 'minimal' && <MinimalThemeView profile={profile} site={site} />}
    </div>
  )
}

function MinimalThemeView({ profile, site }: { profile: ProfessionalProfile; site: PortfolioSite }) {
  const visible = (type: string) => site.sections.find(s => s.type === type)?.visible !== false

  return (
    <div className="max-w-3xl mx-auto px-6 py-20 space-y-16">
      {visible('hero') && (
        <header className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold tracking-tight text-white">{profile.identity.name}</h1>
            {profile.identity.headline && (
              <p className="text-lg text-[#00d4ff] font-semibold">{profile.identity.headline}</p>
            )}
          </div>
          
          <div className="flex flex-wrap gap-4 text-xs text-[#9898b3] border-y border-[#1e1e2e] py-4">
            {profile.identity.email && <div className="flex items-center gap-1.5"><Mail size={13} /> {profile.identity.email}</div>}
            {profile.identity.phone && <div className="flex items-center gap-1.5"><Phone size={13} /> {profile.identity.phone}</div>}
            {profile.identity.location && <div className="flex items-center gap-1.5"><MapPin size={13} /> {profile.identity.location}</div>}
            {profile.identity.linkedin && (
              <a href={`https://linkedin.com/in/${profile.identity.linkedin}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-white transition-colors">
                <Linkedin size={13} /> LinkedIn
              </a>
            )}
            {profile.identity.github && (
              <a href={`https://github.com/${profile.identity.github}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-white transition-colors">
                <Github size={13} /> GitHub
              </a>
            )}
          </div>
        </header>
      )}

      {visible('about') && profile.summary && (
        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-widest text-[#5c5c7a] font-bold border-b border-[#1e1e2e] pb-2">About</h2>
          <p className="text-sm text-[#c5c5d2] leading-relaxed">{profile.summary}</p>
        </section>
      )}

      {visible('experience') && profile.experience.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-xs uppercase tracking-widest text-[#5c5c7a] font-bold border-b border-[#1e1e2e] pb-2">Experience</h2>
          <div className="space-y-6">
            {profile.experience.map(exp => (
              <div key={exp.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="font-bold text-white">{exp.role} <span className="font-normal text-[#9898b3]">at</span> {exp.company}</div>
                  <div className="text-xs text-[#5c5c7a] font-semibold">{exp.startDate} - {exp.current ? 'Present' : exp.endDate}</div>
                </div>
                {exp.technologies && exp.technologies.length > 0 && (
                  <div className="text-[10px] text-[#00d4ff] font-semibold">Technologies: {exp.technologies.join(', ')}</div>
                )}
                <ul className="list-disc pl-4 text-xs text-[#9898b3] space-y-1 leading-relaxed">
                  {exp.bullets.map((b, i) => <li key={i}>{b}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {visible('projects') && profile.projects.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-xs uppercase tracking-widest text-[#5c5c7a] font-bold border-b border-[#1e1e2e] pb-2">Projects</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {profile.projects.map(proj => (
              <div key={proj.id} className="p-5 rounded-lg border border-[#1e1e2e] bg-[#0c0c10]/40 space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-sm text-white">{proj.name}</h3>
                  <div className="flex gap-2">
                    {proj.github && (
                      <a href={`https://github.com/${proj.github}`} target="_blank" rel="noopener noreferrer" className="text-[#5c5c7a] hover:text-[#00d4ff]">
                        <Github size={13} />
                      </a>
                    )}
                    {proj.url && (
                      <a href={proj.url} target="_blank" rel="noopener noreferrer" className="text-[#5c5c7a] hover:text-[#00d4ff]">
                        <ExternalLink size={13} />
                      </a>
                    )}
                  </div>
                </div>
                <p className="text-xs text-[#9898b3] leading-relaxed">{proj.description}</p>
                <div className="flex flex-wrap gap-1">
                  {proj.technologies.map((t, idx) => (
                    <span key={idx} className="text-[9px] bg-[#161622] text-[#c5c5d2] px-1.5 py-0.5 rounded">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {visible('skills') && profile.skills.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xs uppercase tracking-widest text-[#5c5c7a] font-bold border-b border-[#1e1e2e] pb-2">Skills</h2>
          <div className="space-y-3">
            {profile.skills.map(group => (
              <div key={group.id} className="text-xs flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1e1e2e]/30 pb-2">
                <span className="font-bold text-white sm:w-1/4 mb-1 sm:mb-0">{group.category}</span>
                <span className="text-[#9898b3] sm:w-3/4">{group.skills.join(', ')}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {visible('education') && profile.education.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xs uppercase tracking-widest text-[#5c5c7a] font-bold border-b border-[#1e1e2e] pb-2">Education</h2>
          <div className="space-y-4">
            {profile.education.map(edu => (
              <div key={edu.id} className="flex justify-between items-start text-xs">
                <div>
                  <div className="font-bold text-white">{edu.degree} in {edu.field}</div>
                  <div className="text-[#9898b3] italic mt-0.5">{edu.institution}</div>
                </div>
                <span className="text-[#5c5c7a] font-semibold">{edu.startDate} - {edu.current ? 'Present' : edu.endDate}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function DeveloperThemeView({ profile, site }: { profile: ProfessionalProfile; site: PortfolioSite }) {
  const visible = (type: string) => site.sections.find(s => s.type === type)?.visible !== false

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-8 font-mono">
      <div className="rounded-lg border border-emerald-900 bg-[#0c0c10] overflow-hidden shadow-2xl">
        <div className="bg-[#111118] px-4 py-2 border-b border-emerald-950 flex items-center justify-between">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
          </div>
          <span className="text-[10px] text-emerald-600">bash - {profile.identity.name.toLowerCase().replace(/\s+/g, '')}@envoy</span>
          <div className="w-10" />
        </div>

        <div className="p-6 space-y-8 text-sm">
          <div>
            <div className="text-emerald-700">$ curl https://envoy.app/api/p/{site.slug}</div>
            <div className="mt-2 text-emerald-300">
              <span className="text-emerald-500 font-bold">{profile.identity.name}</span>
              {profile.identity.headline && <span className="text-emerald-600"> {'// ' + profile.identity.headline}</span>}
            </div>
            
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-emerald-600">
              {profile.identity.email && <div>email: {profile.identity.email}</div>}
              {profile.identity.phone && <div>phone: {profile.identity.phone}</div>}
              {profile.identity.location && <div>location: {profile.identity.location}</div>}
              {profile.identity.linkedin && (
                <a href={`https://linkedin.com/in/${profile.identity.linkedin}`} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-emerald-400">
                  linkedin: {profile.identity.linkedin}
                </a>
              )}
              {profile.identity.github && (
                <a href={`https://github.com/${profile.identity.github}`} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-emerald-400">
                  github: {profile.identity.github}
                </a>
              )}
            </div>
          </div>

          {visible('about') && profile.summary && (
            <div>
              <div className="text-emerald-700">$ cat about_me.md</div>
              <p className="mt-2 text-emerald-300/90 leading-relaxed pl-4 border-l border-emerald-900/50">{profile.summary}</p>
            </div>
          )}

          {visible('experience') && profile.experience.length > 0 && (
            <div>
              <div className="text-emerald-700">$ cat experience.json</div>
              <div className="mt-2 pl-4 border-l border-emerald-900/50 space-y-4">
                {profile.experience.map(exp => (
                  <div key={exp.id} className="space-y-1 text-emerald-300/80">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-emerald-400">&gt; {exp.role} @ {exp.company}</span>
                      <span className="text-emerald-600">{exp.startDate} - {exp.current ? 'Present' : exp.endDate}</span>
                    </div>
                    {exp.technologies && exp.technologies.length > 0 && (
                      <div className="text-[11px] text-emerald-500">Tech: {exp.technologies.join(', ')}</div>
                    )}
                    <div className="pl-4 text-xs space-y-0.5">
                      {exp.bullets.map((b, i) => <div key={i}>- {b}</div>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {visible('projects') && profile.projects.length > 0 && (
            <div>
              <div className="text-emerald-700">$ ls projects/</div>
              <div className="mt-2 pl-4 border-l border-emerald-900/50 grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.projects.map(proj => (
                  <div key={proj.id} className="p-4 border border-emerald-950 bg-[#050507] rounded space-y-2">
                    <div className="flex justify-between items-center text-emerald-400 font-bold">
                      <span>{proj.name}</span>
                      <div className="flex gap-2">
                        {proj.github && <a href={`https://github.com/${proj.github}`} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-200"><Github size={12} /></a>}
                        {proj.url && <a href={proj.url} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-200"><ExternalLink size={12} /></a>}
                      </div>
                    </div>
                    <p className="text-[11px] text-emerald-600/90 leading-normal">{proj.description}</p>
                    <div className="text-[10px] text-emerald-700">[{proj.technologies.join(', ')}]</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {visible('skills') && profile.skills.length > 0 && (
            <div>
              <div className="text-emerald-700">$ print_skills --verbose</div>
              <div className="mt-2 pl-4 border-l border-emerald-900/50 space-y-1">
                {profile.skills.map(group => (
                  <div key={group.id} className="text-xs text-emerald-300">
                    <span className="font-bold text-emerald-400">{group.category}:</span> {group.skills.join(', ')}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function BoldThemeView({ profile, site }: { profile: ProfessionalProfile; site: PortfolioSite }) {
  const visible = (type: string) => site.sections.find(s => s.type === type)?.visible !== false

  return (
    <div className="max-w-5xl mx-auto px-6 py-20 space-y-16">
      {visible('hero') && (
        <div className="p-8 md:p-12 rounded-2xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-xl shadow-2xl space-y-6 relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-[#6366f1]/10 blur-[100px] pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 w-80 h-80 rounded-full bg-[#00d4ff]/10 blur-[100px] pointer-events-none" />
          
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-white via-indigo-200 to-[#00d4ff] bg-clip-text text-transparent">
              {profile.identity.name}
            </h1>
            {profile.identity.headline && (
              <p className="text-lg md:text-xl text-[#00d4ff] font-extrabold uppercase tracking-wider">{profile.identity.headline}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-[#9898b3]">
            {profile.identity.email && <div className="px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.05] flex items-center gap-1.5"><Mail size={13} /> {profile.identity.email}</div>}
            {profile.identity.phone && <div className="px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.05] flex items-center gap-1.5"><Phone size={13} /> {profile.identity.phone}</div>}
            {profile.identity.location && <div className="px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.05] flex items-center gap-1.5"><MapPin size={13} /> {profile.identity.location}</div>}
            {profile.identity.linkedin && (
              <a href={`https://linkedin.com/in/${profile.identity.linkedin}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.05] flex items-center gap-1.5 hover:bg-[#6366f1]/20 hover:text-white transition-all">
                <Linkedin size={13} /> LinkedIn
              </a>
            )}
            {profile.identity.github && (
              <a href={`https://github.com/${profile.identity.github}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.05] flex items-center gap-1.5 hover:bg-[#00d4ff]/20 hover:text-white transition-all">
                <Github size={13} /> GitHub
              </a>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        <div className="md:col-span-1 space-y-6">
          {visible('about') && profile.summary && (
            <div className="p-6 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-4">
              <h2 className="text-xs uppercase tracking-widest text-[#00d4ff] font-extrabold">About Me</h2>
              <p className="text-xs text-[#9898b3] leading-relaxed">{profile.summary}</p>
            </div>
          )}

          {visible('skills') && profile.skills.length > 0 && (
            <div className="p-6 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-4">
              <h2 className="text-xs uppercase tracking-widest text-[#00d4ff] font-extrabold">Skills Stack</h2>
              <div className="space-y-4">
                {profile.skills.map(group => (
                  <div key={group.id} className="space-y-1.5">
                    <div className="text-xs font-bold text-white">{group.category}</div>
                    <div className="flex flex-wrap gap-1">
                      {group.skills.map((s, idx) => (
                        <span key={idx} className="text-[9px] bg-white/[0.04] text-gray-300 px-2 py-0.5 rounded border border-white/[0.03]">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="md:col-span-2 space-y-6">
          {visible('experience') && profile.experience.length > 0 && (
            <div className="p-6 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-6">
              <h2 className="text-xs uppercase tracking-widest text-[#00d4ff] font-extrabold">Professional Journey</h2>
              <div className="space-y-6">
                {profile.experience.map(exp => (
                  <div key={exp.id} className="space-y-2 border-l border-white/[0.05] pl-4 relative">
                    <div className="absolute -left-[4px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#6366f1]" />
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h3 className="font-bold text-sm text-white">{exp.role}</h3>
                        <p className="text-xs text-[#9898b3]">{exp.company}</p>
                      </div>
                      <span className="text-[10px] text-[#5c5c7a] font-bold uppercase">{exp.startDate} - {exp.current ? 'Present' : exp.endDate}</span>
                    </div>
                    <ul className="list-disc pl-4 text-xs text-[#9898b3] space-y-1">
                      {exp.bullets.map((b, i) => <li key={i}>{b}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {visible('projects') && profile.projects.length > 0 && (
            <div className="p-6 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-6">
              <h2 className="text-xs uppercase tracking-widest text-[#00d4ff] font-extrabold">Featured Releases</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {profile.projects.map(proj => (
                  <div key={proj.id} className="p-4 rounded-lg bg-white/[0.01] border border-white/[0.04] hover:border-[#6366f1]/50 transition-all flex flex-col justify-between h-40">
                    <div>
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-xs text-white truncate max-w-[80%]">{proj.name}</h4>
                        <div className="flex gap-2">
                          {proj.github && <a href={`https://github.com/${proj.github}`} target="_blank" rel="noopener noreferrer" className="text-[#5c5c7a] hover:text-[#00d4ff]"><Github size={12} /></a>}
                          {proj.url && <a href={proj.url} target="_blank" rel="noopener noreferrer" className="text-[#5c5c7a] hover:text-[#00d4ff]"><ExternalLink size={12} /></a>}
                        </div>
                      </div>
                      <p className="text-[11px] text-[#9898b3] mt-2 line-clamp-3 leading-relaxed">{proj.description}</p>
                    </div>
                    <div className="text-[9px] text-[#00d4ff] font-mono truncate">
                      {proj.technologies.join(' • ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
