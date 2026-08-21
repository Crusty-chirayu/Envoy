import React from 'react'
import type { ProfessionalProfile, EnvoyDocument, SectionType } from '@/types'
import { Mail, Phone, MapPin, Linkedin, Github } from 'lucide-react'

interface TemplateRendererProps {
  profile: ProfessionalProfile
  document: EnvoyDocument
  onSelectSection?: (sectionId: string) => void
}

export function TemplateRenderer({ profile, document, onSelectSection }: TemplateRendererProps) {
  const { settings, sections } = document
  const { identity } = profile

  // Apply theme settings
  const fontClass = {
    inter: 'font-sans',
    georgia: 'font-serif',
    roboto: 'font-sans',
    merriweather: 'font-serif',
    'source-code-pro': 'font-mono',
  }[settings.fontFamily]

  const sizeClass = {
    compact: 'text-xs leading-relaxed',
    normal: 'text-sm leading-relaxed',
    spacious: 'text-base leading-loose',
  }[settings.fontSize]

  const marginClass = {
    narrow: 'p-6',
    normal: 'p-10',
    wide: 'p-14',
  }[settings.pageMargin]

  const accentColor = settings.accentColor || '#6366f1'

  // Format date helper
  const formatDate = (dateStr: string | undefined): string => {
    if (!dateStr) return 'Present'
    const [year, month] = dateStr.split('-')
    if (!year || !month) return dateStr
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  // Sort visible sections
  const visibleSections = [...sections]
    .filter(s => s.visible)
    .sort((a, b) => a.order - b.order)

  // Render individual sections based on type
  const renderSectionContent = (type: SectionType) => {
    switch (type) {
      case 'summary':
        if (!profile.summary) return null
        return (
          <p className="text-envoy-doc-text-secondary whitespace-pre-line text-justify">
            {profile.summary}
          </p>
        )

      case 'experience':
        if (profile.experience.length === 0) return <p className="text-xs text-gray-400 italic">No experience added yet.</p>
        return (
          <div className="space-y-4">
            {profile.experience.map(exp => (
              <div key={exp.id} className="group/item relative">
                <div className="flex justify-between items-start font-medium text-envoy-doc-text">
                  <div>
                    <span className="font-bold text-gray-900">{exp.role}</span>
                    <span className="mx-1.5 text-gray-400">@</span>
                    <span className="font-semibold" style={{ color: accentColor }}>{exp.company}</span>
                  </div>
                  <span className="text-xs text-envoy-doc-text-secondary shrink-0 font-medium">
                    {formatDate(exp.startDate)} – {exp.current ? 'Present' : formatDate(exp.endDate)}
                  </span>
                </div>
                {exp.location && (
                  <div className="text-xs text-envoy-doc-text-secondary mb-1">{exp.location}</div>
                )}
                {exp.bullets && exp.bullets.length > 0 && (
                  <ul className="list-disc pl-5 mt-1 text-envoy-doc-text-secondary space-y-1">
                    {exp.bullets.map((b, idx) => (
                      <li key={idx} className="text-justify">{b}</li>
                    ))}
                  </ul>
                )}
                {exp.technologies && exp.technologies.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1 items-center">
                    <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider mr-1">Stack:</span>
                    {exp.technologies.map((t, idx) => (
                      <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 font-medium border border-gray-200">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )

      case 'education':
        if (profile.education.length === 0) return null
        return (
          <div className="space-y-3">
            {profile.education.map(edu => (
              <div key={edu.id} className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-gray-900">{edu.institution}</div>
                  <div className="text-xs text-envoy-doc-text-secondary font-medium">
                    {edu.degree}{edu.field ? ` in ${edu.field}` : ''}
                  </div>
                  {edu.gpa && <div className="text-[11px] text-envoy-doc-text-secondary">GPA: {edu.gpa}</div>}
                </div>
                <span className="text-xs text-envoy-doc-text-secondary shrink-0 font-medium">
                  {formatDate(edu.startDate)} – {edu.current ? 'Present' : formatDate(edu.endDate)}
                </span>
              </div>
            ))}
          </div>
        )

      case 'skills':
        if (profile.skills.length === 0) return null
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            {profile.skills.map(group => (
              <div key={group.id} className="text-xs">
                <div className="font-bold text-gray-800 uppercase tracking-wide border-b border-gray-100 pb-0.5 mb-1.5">
                  {group.category}
                </div>
                <div className="text-envoy-doc-text-secondary leading-relaxed font-medium">
                  {group.skills.join(', ')}
                </div>
              </div>
            ))}
          </div>
        )

      case 'projects':
        if (profile.projects.length === 0) return null
        return (
          <div className="space-y-4">
            {profile.projects.map(proj => (
              <div key={proj.id}>
                <div className="flex justify-between items-center font-medium">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{proj.name}</span>
                    {proj.github && (
                      <a href={proj.github} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600 transition-colors">
                        <Github size={12} />
                      </a>
                    )}
                  </div>
                  <span className="text-xs text-envoy-doc-text-secondary shrink-0">
                    {proj.startDate && formatDate(proj.startDate)}
                  </span>
                </div>
                <p className="text-xs text-envoy-doc-text-secondary mt-1 text-justify">{proj.description}</p>
                {proj.technologies && proj.technologies.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {proj.technologies.map((t, idx) => (
                      <span key={idx} className="text-[9px] px-1 py-0.2 bg-gray-100 border border-gray-200 rounded text-gray-600 font-medium">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )

      case 'certifications':
        if (profile.certifications.length === 0) return null
        return (
          <ul className="list-disc pl-5 text-envoy-doc-text-secondary space-y-1.5">
            {profile.certifications.map(cert => (
              <li key={cert.id} className="text-xs">
                <span className="font-bold text-gray-900">{cert.name}</span>
                <span className="mx-1">—</span>
                <span>{cert.issuer}</span>
                <span className="text-[10px] text-gray-400 ml-1.5">({cert.date})</span>
              </li>
            ))}
          </ul>
        )

      default:
        return null
    }
  }

  // ─────────────────────────────────────────
  // TEMPLATES
  // ─────────────────────────────────────────

  // 1. MINIMAL TEMPLATE
  if (settings.template === 'minimal') {
    return (
      <div className={`${fontClass} ${sizeClass} ${marginClass} text-envoy-doc-text bg-envoy-doc-bg max-w-full h-full flex flex-col justify-start`}>
        {/* Header */}
        <header className="text-center border-b border-gray-200 pb-5 mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-1">
            {identity.name}
          </h1>
          {identity.headline && (
            <p className="text-sm font-semibold tracking-wider uppercase mb-3" style={{ color: accentColor }}>
              {identity.headline}
            </p>
          )}
          
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-envoy-doc-text-secondary font-medium">
            <span className="flex items-center gap-1"><Mail size={12} /> {identity.email}</span>
            {identity.phone && <span className="flex items-center gap-1"><Phone size={12} /> {identity.phone}</span>}
            {identity.location && <span className="flex items-center gap-1"><MapPin size={12} /> {identity.location}</span>}
            {identity.linkedin && <span className="flex items-center gap-1"><Linkedin size={12} /> LinkedIn</span>}
            {identity.github && <span className="flex items-center gap-1"><Github size={12} /> GitHub</span>}
          </div>
        </header>

        {/* Content sections */}
        <div className="space-y-6">
          {visibleSections.map(sec => {
            const hasContent = renderSectionContent(sec.type)
            if (!hasContent) return null

            return (
              <section 
                key={sec.id} 
                onClick={() => onSelectSection?.(sec.id)}
                className="cursor-pointer hover:bg-gray-50/80 rounded px-2 py-1.5 -mx-2 transition-all border border-transparent hover:border-dashed hover:border-gray-300 relative group/section"
              >
                <h2 className="text-xs font-bold uppercase tracking-widest border-b-2 pb-1 mb-3 text-gray-900" style={{ borderColor: accentColor }}>
                  {sec.title}
                </h2>
                {hasContent}
              </section>
            )
          })}
        </div>
      </div>
    )
  }

  // 2. MODERN TEMPLATE (Split layout with side-header / border accent)
  if (settings.template === 'modern') {
    return (
      <div className={`${fontClass} ${sizeClass} ${marginClass} text-envoy-doc-text bg-envoy-doc-bg max-w-full h-full flex flex-col justify-start`}>
        {/* Header */}
        <header className="border-l-4 pl-4 mb-6" style={{ borderColor: accentColor }}>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 mb-0.5">
            {identity.name}
          </h1>
          {identity.headline && (
            <p className="text-sm font-bold tracking-wider uppercase mb-2" style={{ color: accentColor }}>
              {identity.headline}
            </p>
          )}
          
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-envoy-doc-text-secondary font-medium">
            <span>{identity.email}</span>
            {identity.phone && <span>• {identity.phone}</span>}
            {identity.location && <span>• {identity.location}</span>}
            {identity.linkedin && <span>• LinkedIn</span>}
            {identity.github && <span>• GitHub</span>}
          </div>
        </header>

        {/* Content Sections */}
        <div className="space-y-6">
          {visibleSections.map(sec => {
            const hasContent = renderSectionContent(sec.type)
            if (!hasContent) return null

            return (
              <section 
                key={sec.id} 
                onClick={() => onSelectSection?.(sec.id)}
                className="cursor-pointer hover:bg-gray-50/80 rounded px-2 py-1.5 -mx-2 transition-all border border-transparent hover:border-dashed hover:border-gray-300 relative"
              >
                <h2 className="text-sm font-extrabold tracking-wide mb-3 flex items-center gap-2" style={{ color: accentColor }}>
                  <span>{sec.title}</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </h2>
                {hasContent}
              </section>
            )
          })}
        </div>
      </div>
    )
  }

  // 3. DEVELOPER TEMPLATE (Brackets and tech tags, monospace accents)
  if (settings.template === 'developer') {
    return (
      <div className={`font-mono ${sizeClass} ${marginClass} text-[#0f0f14] bg-white max-w-full h-full flex flex-col justify-start`}>
        {/* Header */}
        <header className="border border-[#0f0f14] p-4 mb-6">
          <h1 className="text-2xl font-black text-gray-900 mb-1">
            &gt; {identity.name.toUpperCase()}
          </h1>
          {identity.headline && (
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
              {'// ' + identity.headline}
            </p>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] font-semibold text-gray-600">
            <span>EMAIL: {identity.email}</span>
            {identity.phone && <span>PHONE: {identity.phone}</span>}
            {identity.location && <span>LOCATION: {identity.location}</span>}
            {identity.linkedin && <span>LINKEDIN: linkedin.com/in/...</span>}
            {identity.github && <span>GITHUB: github.com/...</span>}
          </div>
        </header>

        {/* Content sections */}
        <div className="space-y-5">
          {visibleSections.map(sec => {
            const hasContent = renderSectionContent(sec.type)
            if (!hasContent) return null

            return (
              <section 
                key={sec.id} 
                onClick={() => onSelectSection?.(sec.id)}
                className="cursor-pointer hover:bg-gray-50/80 rounded px-2 py-1.5 -mx-2 transition-all border border-transparent hover:border-dashed hover:border-gray-300 relative"
              >
                <h2 className="text-xs font-black uppercase text-gray-900 mb-2.5">
                  [ {sec.title.toUpperCase()} ]
                </h2>
                <div className="pl-4 border-l border-gray-300">
                  {hasContent}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    )
  }

  // 4. ACADEMIC TEMPLATE (Classic formal CV format, dense, wider spacing)
  return (
    <div className={`font-serif ${sizeClass} ${marginClass} text-gray-950 bg-white max-w-full h-full flex flex-col justify-start`}>
      {/* Header */}
      <header className="text-center mb-8 border-b border-gray-300 pb-4">
        <h1 className="text-2xl tracking-wide uppercase font-light text-gray-900 mb-2">
          {identity.name}
        </h1>
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-gray-700 italic font-light">
          <span>{identity.email}</span>
          {identity.phone && <span>• {identity.phone}</span>}
          {identity.location && <span>• {identity.location}</span>}
        </div>
      </header>

      {/* Content sections */}
      <div className="space-y-6">
        {visibleSections.map(sec => {
          const hasContent = renderSectionContent(sec.type)
          if (!hasContent) return null

          return (
            <section 
              key={sec.id} 
              onClick={() => onSelectSection?.(sec.id)}
              className="cursor-pointer hover:bg-gray-50/80 rounded px-2 py-1.5 -mx-2 transition-all border border-transparent hover:border-dashed hover:border-gray-300 relative"
            >
              <h2 className="text-xs tracking-wider font-extrabold uppercase border-b border-gray-200 pb-1 mb-2 text-gray-900">
                {sec.title}
              </h2>
              {hasContent}
            </section>
          )
        })}
      </div>
    </div>
  )
}
