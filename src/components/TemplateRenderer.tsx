import React from 'react'
import type { ProfessionalProfile, EnvoyDocument, SectionType } from '@/types'
import { Mail, Phone, MapPin, Linkedin, Github } from 'lucide-react'

interface TemplateRendererProps {
  profile: ProfessionalProfile
  document: EnvoyDocument
  onSelectSection?: (sectionId: string) => void
}

// Section types that render inside the narrow sidebar column of the
// 'sidebar' template. Everything else renders in the main column, in the
// same visible-section order as every other template.
const SIDEBAR_SECTION_TYPES: SectionType[] = ['skills', 'certifications']

/**
 * Memoized: the resume sheet only re-renders when its actual inputs change.
 * Prevents full-document re-renders triggered by unrelated editor state
 * (zoom changes, toolbar toggles, overlay panels).
 */
function TemplateRendererImpl({ profile, document, onSelectSection }: TemplateRendererProps) {
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
          <div className="space-y-5">
            {profile.experience.map(exp => (
              <div key={exp.id} className="group/item relative">
                <div className="flex justify-between items-start gap-3 font-medium text-envoy-doc-text">
                  <div className="min-w-0">
                    <span className="font-bold text-gray-900">{exp.role}</span>
                    <span className="mx-1.5 text-gray-400">@</span>
                    <span className="font-semibold" style={{ color: accentColor }}>{exp.company}</span>
                  </div>
                  <span className="text-xs text-envoy-doc-text-secondary shrink-0 font-medium tabular-nums">
                    {formatDate(exp.startDate)} – {exp.current ? 'Present' : formatDate(exp.endDate)}
                  </span>
                </div>
                {exp.location && (
                  <div className="text-xs text-envoy-doc-text-secondary mb-1">{exp.location}</div>
                )}
                {exp.bullets && exp.bullets.length > 0 && (
                  <ul className="list-disc marker:text-gray-300 pl-5 mt-1.5 text-envoy-doc-text-secondary space-y-1.5">
                    {exp.bullets.map((b, idx) => (
                      <li key={idx} className="text-justify pl-0.5">{b}</li>
                    ))}
                  </ul>
                )}
                {exp.technologies && exp.technologies.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider mr-0.5">Stack:</span>
                    {exp.technologies.map((t, idx) => (
                      <span key={idx} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-50 text-gray-700 font-medium border border-gray-200">
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
          <div className="space-y-3.5">
            {profile.education.map(edu => (
              <div key={edu.id} className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <div className="font-bold text-gray-900">{edu.institution}</div>
                  <div className="text-xs text-envoy-doc-text-secondary font-medium">
                    {edu.degree}{edu.field ? ` in ${edu.field}` : ''}
                  </div>
                  {edu.gpa && <div className="text-[11px] text-envoy-doc-text-secondary mt-0.5">GPA: {edu.gpa}</div>}
                </div>
                <span className="text-xs text-envoy-doc-text-secondary shrink-0 font-medium tabular-nums">
                  {formatDate(edu.startDate)} – {edu.current ? 'Present' : formatDate(edu.endDate)}
                </span>
              </div>
            ))}
          </div>
        )

      case 'skills':
        if (profile.skills.length === 0) return null
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5">
            {profile.skills.map(group => (
              <div key={group.id} className="text-xs">
                <div className="font-bold text-gray-800 uppercase tracking-wide border-b border-gray-100 pb-1 mb-1.5">
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
                <div className="flex justify-between items-center gap-3 font-medium">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-gray-900 truncate">{proj.name}</span>
                    {proj.github && (
                      <a href={proj.github} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600 transition-colors shrink-0">
                        <Github size={12} aria-hidden="true" />
                      </a>
                    )}
                  </div>
                  <span className="text-xs text-envoy-doc-text-secondary shrink-0 tabular-nums">
                    {proj.startDate && formatDate(proj.startDate)}
                  </span>
                </div>
                <p className="text-xs text-envoy-doc-text-secondary mt-1 text-justify">{proj.description}</p>
                {proj.technologies && proj.technologies.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {proj.technologies.map((t, idx) => (
                      <span key={idx} className="text-[9px] px-1.5 py-0.5 bg-gray-50 border border-gray-200 rounded-full text-gray-600 font-medium">
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
          <ul className="list-disc marker:text-gray-300 pl-5 text-envoy-doc-text-secondary space-y-1.5">
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

  // Shared section wrapper: click-to-edit affordance is identical across
  // every template so the editing behavior stays consistent even as each
  // template's visual language differs.
  const SectionShell = ({
    id,
    className,
    children,
  }: {
    id: string
    className?: string
    children: React.ReactNode
  }) => (
    <section
      onClick={() => onSelectSection?.(id)}
      className={`cursor-pointer hover:bg-gray-50/80 rounded px-2 py-1.5 -mx-2 transition-all duration-150 border border-transparent hover:border-dashed hover:border-gray-300 relative group/section ${className || ''}`}
    >
      {children}
    </section>
  )

  // ─────────────────────────────────────────
  // TEMPLATES
  // ─────────────────────────────────────────

  // 1. MINIMAL TEMPLATE — centered, quiet, generous whitespace
  if (settings.template === 'minimal') {
    return (
      <div className={`${fontClass} ${sizeClass} ${marginClass} text-envoy-doc-text bg-envoy-doc-bg max-w-full h-full flex flex-col justify-start`}>
        {/* Header */}
        <header className="text-center pb-6 mb-7">
          <h1 className="text-[2.1rem] font-extrabold tracking-tight text-gray-900 mb-1.5 leading-none">
            {identity.name}
          </h1>
          {identity.headline && (
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-4" style={{ color: accentColor }}>
              {identity.headline}
            </p>
          )}
          <div
            className="w-10 h-[3px] rounded-full mx-auto mb-4"
            style={{ backgroundColor: accentColor }}
            aria-hidden="true"
          />

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-envoy-doc-text-secondary font-medium">
            <span className="flex items-center gap-1.5"><Mail size={12} aria-hidden="true" /> {identity.email}</span>
            {identity.phone && <span className="flex items-center gap-1.5"><Phone size={12} aria-hidden="true" /> {identity.phone}</span>}
            {identity.location && <span className="flex items-center gap-1.5"><MapPin size={12} aria-hidden="true" /> {identity.location}</span>}
            {identity.linkedin && <span className="flex items-center gap-1.5"><Linkedin size={12} aria-hidden="true" /> LinkedIn</span>}
            {identity.github && <span className="flex items-center gap-1.5"><Github size={12} aria-hidden="true" /> GitHub</span>}
          </div>
        </header>

        {/* Content sections */}
        <div className="space-y-7">
          {visibleSections.map(sec => {
            const hasContent = renderSectionContent(sec.type)
            if (!hasContent) return null

            return (
              <SectionShell key={sec.id} id={sec.id}>
                <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] border-b-2 pb-1.5 mb-3.5 text-gray-900" style={{ borderColor: accentColor }}>
                  {sec.title}
                </h2>
                {hasContent}
              </SectionShell>
            )
          })}
        </div>
      </div>
    )
  }

  // 2. MODERN TEMPLATE — left rule header, rule-led section headers
  if (settings.template === 'modern') {
    return (
      <div className={`${fontClass} ${sizeClass} ${marginClass} text-envoy-doc-text bg-envoy-doc-bg max-w-full h-full flex flex-col justify-start`}>
        {/* Header */}
        <header className="border-l-[3px] pl-4 mb-7" style={{ borderColor: accentColor }}>
          <h1 className="text-[2.1rem] font-black tracking-tight text-gray-900 mb-1 leading-none">
            {identity.name}
          </h1>
          {identity.headline && (
            <p className="text-sm font-bold tracking-wide uppercase mb-2.5" style={{ color: accentColor }}>
              {identity.headline}
            </p>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-envoy-doc-text-secondary font-medium">
            <span>{identity.email}</span>
            {identity.phone && <span>· {identity.phone}</span>}
            {identity.location && <span>· {identity.location}</span>}
            {identity.linkedin && <span>· LinkedIn</span>}
            {identity.github && <span>· GitHub</span>}
          </div>
        </header>

        {/* Content Sections */}
        <div className="space-y-7">
          {visibleSections.map(sec => {
            const hasContent = renderSectionContent(sec.type)
            if (!hasContent) return null

            return (
              <SectionShell key={sec.id} id={sec.id}>
                <h2 className="text-sm font-extrabold tracking-wide mb-3.5 flex items-center gap-3" style={{ color: accentColor }}>
                  <span className="shrink-0">{sec.title}</span>
                  <div className="flex-1 h-px bg-gray-200" aria-hidden="true" />
                </h2>
                {hasContent}
              </SectionShell>
            )
          })}
        </div>
      </div>
    )
  }

  // 3. DEVELOPER TEMPLATE — bracket motif, monospace, terminal header block
  if (settings.template === 'developer') {
    return (
      <div className={`font-mono ${sizeClass} ${marginClass} text-[#0f0f14] bg-white max-w-full h-full flex flex-col justify-start`}>
        {/* Header */}
        <header className="border border-[#0f0f14] p-4 mb-7 relative">
          <span className="absolute -top-2.5 left-3 bg-white px-1.5 text-[9px] font-bold text-gray-400 tracking-widest">RESUME.SH</span>
          <h1 className="text-2xl font-black text-gray-900 mb-1">
            <span style={{ color: accentColor }}>&gt;</span> {identity.name.toUpperCase()}
          </h1>
          {identity.headline && (
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
              {'// ' + identity.headline}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] font-semibold text-gray-600">
            <span>EMAIL: {identity.email}</span>
            {identity.phone && <span>PHONE: {identity.phone}</span>}
            {identity.location && <span>LOCATION: {identity.location}</span>}
            {identity.linkedin && <span>LINKEDIN: linkedin.com/in/...</span>}
            {identity.github && <span>GITHUB: github.com/...</span>}
          </div>
        </header>

        {/* Content sections */}
        <div className="space-y-6">
          {visibleSections.map(sec => {
            const hasContent = renderSectionContent(sec.type)
            if (!hasContent) return null

            return (
              <SectionShell key={sec.id} id={sec.id}>
                <h2 className="text-xs font-black uppercase text-gray-900 mb-3 flex items-center gap-1.5">
                  <span style={{ color: accentColor }}>[</span>
                  <span>{sec.title.toUpperCase()}</span>
                  <span style={{ color: accentColor }}>]</span>
                </h2>
                <div className="pl-4 border-l-2 border-gray-200">
                  {hasContent}
                </div>
              </SectionShell>
            )
          })}
        </div>
      </div>
    )
  }

  // 4. ACADEMIC TEMPLATE — classic formal CV, centered serif, dense
  if (settings.template === 'academic') {
    return (
      <div className={`font-serif ${sizeClass} ${marginClass} text-gray-950 bg-white max-w-full h-full flex flex-col justify-start`}>
        {/* Header */}
        <header className="text-center mb-9 pb-5 border-b border-gray-300 relative">
          <h1 className="text-[1.6rem] tracking-[0.08em] uppercase font-light text-gray-900 mb-2.5">
            {identity.name}
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-gray-700 italic font-light">
            <span>{identity.email}</span>
            {identity.phone && <span>&middot; {identity.phone}</span>}
            {identity.location && <span>&middot; {identity.location}</span>}
          </div>
        </header>

        {/* Content sections */}
        <div className="space-y-7">
          {visibleSections.map(sec => {
            const hasContent = renderSectionContent(sec.type)
            if (!hasContent) return null

            return (
              <SectionShell key={sec.id} id={sec.id}>
                <h2 className="text-xs tracking-[0.12em] font-extrabold uppercase border-b border-gray-200 pb-1.5 mb-2.5 text-gray-900">
                  {sec.title}
                </h2>
                {hasContent}
              </SectionShell>
            )
          })}
        </div>
      </div>
    )
  }

  // 5. EXECUTIVE TEMPLATE — asymmetric serif header, formal small-caps
  // section rules, generous margins. Aimed at senior/leadership roles.
  if (settings.template === 'executive') {
    return (
      <div className={`font-serif ${sizeClass} ${marginClass} text-envoy-doc-text bg-envoy-doc-bg max-w-full h-full flex flex-col justify-start`}>
        {/* Header */}
        <header className="flex items-start justify-between gap-6 pb-6 mb-8 border-b" style={{ borderColor: '#e5e7eb' }}>
          <div className="min-w-0">
            <h1 className="text-[2rem] font-normal tracking-tight text-gray-900 mb-1.5 leading-tight">
              {identity.name}
            </h1>
            {identity.headline && (
              <p className="text-[11px] font-sans font-semibold tracking-[0.18em] uppercase" style={{ color: accentColor }}>
                {identity.headline}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 text-[11px] font-sans text-envoy-doc-text-secondary shrink-0 text-right pt-1">
            <span className="flex items-center gap-1.5">{identity.email} <Mail size={11} aria-hidden="true" /></span>
            {identity.phone && <span className="flex items-center gap-1.5">{identity.phone} <Phone size={11} aria-hidden="true" /></span>}
            {identity.location && <span className="flex items-center gap-1.5">{identity.location} <MapPin size={11} aria-hidden="true" /></span>}
            {identity.linkedin && <span className="flex items-center gap-1.5">LinkedIn <Linkedin size={11} aria-hidden="true" /></span>}
            {identity.github && <span className="flex items-center gap-1.5">GitHub <Github size={11} aria-hidden="true" /></span>}
          </div>
        </header>

        {/* Content sections */}
        <div className="space-y-8">
          {visibleSections.map(sec => {
            const hasContent = renderSectionContent(sec.type)
            if (!hasContent) return null

            return (
              <SectionShell key={sec.id} id={sec.id}>
                <h2 className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500 mb-3 pb-2 border-b border-gray-200">
                  {sec.title}
                </h2>
                {hasContent}
              </SectionShell>
            )
          })}
        </div>
      </div>
    )
  }

  // 6. SIDEBAR TEMPLATE — two-column layout: a tinted sidebar carries
  // contact details plus compact reference sections (skills,
  // certifications); the main column carries narrative sections in the
  // user's chosen order. Note: multi-column layouts can alter the text
  // order some ATS parsers extract, so this is offered alongside — not in
  // place of — the single-column templates.
  const sidebarSections = visibleSections.filter(s => SIDEBAR_SECTION_TYPES.includes(s.type))
  const mainSections = visibleSections.filter(s => !SIDEBAR_SECTION_TYPES.includes(s.type))

  return (
    <div className={`${fontClass} ${sizeClass} text-envoy-doc-text bg-envoy-doc-bg max-w-full h-full flex`}>
      {/* Sidebar column */}
      <aside className="w-[34%] shrink-0 bg-gray-50 border-r border-gray-200 p-6 flex flex-col gap-7">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-gray-900 mb-1 leading-tight">
            {identity.name}
          </h1>
          {identity.headline && (
            <p className="text-[10px] font-semibold tracking-[0.12em] uppercase" style={{ color: accentColor }}>
              {identity.headline}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 text-[11px] text-envoy-doc-text-secondary font-medium">
          <span className="flex items-center gap-2 break-all"><Mail size={12} className="shrink-0" aria-hidden="true" /> {identity.email}</span>
          {identity.phone && <span className="flex items-center gap-2"><Phone size={12} className="shrink-0" aria-hidden="true" /> {identity.phone}</span>}
          {identity.location && <span className="flex items-center gap-2"><MapPin size={12} className="shrink-0" aria-hidden="true" /> {identity.location}</span>}
          {identity.linkedin && <span className="flex items-center gap-2"><Linkedin size={12} className="shrink-0" aria-hidden="true" /> LinkedIn</span>}
          {identity.github && <span className="flex items-center gap-2"><Github size={12} className="shrink-0" aria-hidden="true" /> GitHub</span>}
        </div>

        {sidebarSections.map(sec => {
          const hasContent = renderSectionContent(sec.type)
          if (!hasContent) return null
          return (
            <section
              key={sec.id}
              onClick={() => onSelectSection?.(sec.id)}
              className="cursor-pointer hover:bg-white/80 rounded px-2 py-1.5 -mx-2 transition-all duration-150 border border-transparent hover:border-dashed hover:border-gray-300"
            >
              <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] mb-2.5" style={{ color: accentColor }}>
                {sec.title}
              </h2>
              {hasContent}
            </section>
          )
        })}
      </aside>

      {/* Main column */}
      <div className={`flex-1 min-w-0 ${marginClass}`}>
        <div className="space-y-7">
          {mainSections.map(sec => {
            const hasContent = renderSectionContent(sec.type)
            if (!hasContent) return null

            return (
              <SectionShell key={sec.id} id={sec.id}>
                <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] border-b-2 pb-1.5 mb-3.5 text-gray-900" style={{ borderColor: accentColor }}>
                  {sec.title}
                </h2>
                {hasContent}
              </SectionShell>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export const TemplateRenderer = React.memo(TemplateRendererImpl)