import React, { useCallback } from 'react'
import type { ProfessionalProfile, EnvoyDocument, DocumentSectionConfig } from '@/types'
import { TemplateRenderer } from './TemplateRenderer'
import { ArrowUp, ArrowDown, EyeOff, Eye, Edit2, ZoomIn, ZoomOut } from 'lucide-react'

interface A4CanvasProps {
  profile: ProfessionalProfile
  document: EnvoyDocument
  zoom: number
  setZoom: (z: number) => void
  onEditSection: (section: DocumentSectionConfig) => void
  onToggleVisibility: (sectionId: string) => void
  onReorder: (from: number, to: number) => void
}

export function A4Canvas({
  profile,
  document,
  zoom,
  setZoom,
  onEditSection,
  onToggleVisibility,
  onReorder,
}: A4CanvasProps) {
  // Sort sections by order
  const sortedSections = [...document.sections].sort((a, b) => a.order - b.order)

  const handleZoomIn = () => setZoom(Math.min(2.0, zoom + 0.1))
  const handleZoomOut = () => setZoom(Math.max(0.5, zoom - 0.1))
  const handleFitPage = () => setZoom(0.7)
  const handleFitWidth = () => setZoom(1.0)

  // Reorder up/down helper
  const moveSection = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      onReorder(index, index - 1)
    } else if (direction === 'down' && index < sortedSections.length - 1) {
      onReorder(index, index + 1)
    }
  }

  // Stable reference so the memoized TemplateRenderer skips re-renders
  // caused by unrelated editor state changes.
  const handleSelectSection = useCallback(
    (sectionId: string) => {
      const section = document.sections.find(s => s.id === sectionId)
      if (section) onEditSection(section)
    },
    [document.sections, onEditSection]
  )

  return (
    <div className="flex flex-col items-center h-full bg-[#111118]/40 border-l border-[#1e1e2e] flex-1">
      {/* Canvas Toolbars */}
      <div className="w-full bg-[#0c0c10]/80 border-b border-[#1e1e2e] px-6 py-2.5 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
        <div className="flex items-center gap-2 text-xs text-[#9898b3] min-w-0">
          <span className="font-semibold text-[#f2f2f7] truncate">{document.title}</span>
          <span className="text-[#333349]" aria-hidden="true">•</span>
          <span className="capitalize shrink-0">{document.type}</span>
          <span className="text-[#333349]" aria-hidden="true">•</span>
          <span className="shrink-0">Page 1 of 1</span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-[#050507]/60 border border-[#1e1e2e]" role="group" aria-label="Zoom controls">
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded-md text-[#9898b3] hover:text-[#f2f2f7] hover:bg-[#16161f] active:scale-90 transition-all duration-150"
              title="Zoom Out"
              aria-label="Zoom Out"
            >
              <ZoomOut size={13} aria-hidden="true" />
            </button>
            <span className="text-xs text-[#9898b3] font-mono tabular-nums select-none w-11 text-center" aria-live="polite">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded-md text-[#9898b3] hover:text-[#f2f2f7] hover:bg-[#16161f] active:scale-90 transition-all duration-150"
              title="Zoom In"
              aria-label="Zoom In"
            >
              <ZoomIn size={13} aria-hidden="true" />
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={handleFitPage}
              className="btn btn-secondary !px-2.5 !py-1 !text-[11px] active:scale-95 transition-transform duration-150"
            >
              Fit Page
            </button>
            <button
              onClick={handleFitWidth}
              className="btn btn-secondary !px-2.5 !py-1 !text-[11px] active:scale-95 transition-transform duration-150"
            >
              Fit Width
            </button>
          </div>
        </div>
      </div>

      {/* Page Canvas Frame Container */}
      <div className="flex-1 w-full overflow-auto flex justify-center items-start p-8 relative">
        {/* Ambient stage glow behind the sheet — quiet depth cue, not decoration */}
        <div
          className="pointer-events-none absolute top-16 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-[#00d4ff]/[0.04] blur-[100px]"
          aria-hidden="true"
        />
        <div
          className="relative transition-transform duration-200 origin-top shadow-[0_8px_48px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.03]"
          style={{ transform: `scale(${zoom})` }}
        >
          {/* A4 Sheet Dimensions: 210mm x 297mm (Standard resolution equivalent ~794px x 1123px) */}
          <div id="envoy-a4-sheet" className="w-[794px] min-h-[1123px] bg-white text-gray-900 overflow-hidden relative print:shadow-none">

            {/* Active Template Render */}
            <TemplateRenderer
              profile={profile}
              document={document}
              onSelectSection={handleSelectSection}
            />

            {/* Visual Section Hovers (Only visible on screen in editor) */}
            <div className="absolute inset-0 pointer-events-none">
              {document.sections.map((sec) => {
                // Determine order position in rendered output
                return (
                  <div key={sec.id} className="relative group/canvas-hover">
                    {/* The canvas hover borders will project on active elements */}
                  </div>
                )
              })}
            </div>

          </div>
        </div>
      </div>

      {/* Editor Section Overlays HUD */}
      <div className="w-full border-t border-[#1e1e2e] bg-[#0c0c10]/40 p-4 flex flex-wrap gap-3 items-center justify-between text-xs">
        <span className="text-[#9898b3]">Hover over any section inside the sheet to edit, hide, or arrange its layout.</span>

        <div className="flex flex-wrap gap-2">
          {sortedSections.map((sec, idx) => (
            <div
              key={sec.id}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-colors duration-150 ${
                sec.visible
                  ? 'bg-[#16161f] border-[#252535] text-[#f2f2f7] hover:border-[#333349]'
                  : 'bg-[#0c0c10] border-[#1e1e2e]/40 text-[#5c5c7a]'
              }`}
            >
              <span className={!sec.visible ? 'line-through decoration-[#333349]' : ''}>{sec.title}</span>
              <div className="flex items-center gap-1 ml-1.5 border-l border-[#252535] pl-1.5 shrink-0">
                <button
                  onClick={() => onEditSection(sec)}
                  className="hover:text-[#00d4ff] text-[#9898b3] transition-colors duration-150"
                  title="Edit Settings"
                  aria-label={`Edit settings for section ${sec.title}`}
                >
                  <Edit2 size={10} aria-hidden="true" />
                </button>
                <button
                  onClick={() => onToggleVisibility(sec.id)}
                  className="hover:text-[#6366f1] transition-colors duration-150"
                  title={sec.visible ? 'Hide Section' : 'Show Section'}
                  aria-label={sec.visible ? `Hide section ${sec.title}` : `Show section ${sec.title}`}
                >
                  {sec.visible ? <Eye size={10} aria-hidden="true" /> : <EyeOff size={10} aria-hidden="true" />}
                </button>
                <button
                  onClick={() => moveSection(idx, 'up')}
                  disabled={idx === 0}
                  className="hover:text-[#00d4ff] disabled:opacity-40 transition-colors duration-150"
                  aria-label={`Move section ${sec.title} up`}
                >
                  <ArrowUp size={10} aria-hidden="true" />
                </button>
                <button
                  onClick={() => moveSection(idx, 'down')}
                  disabled={idx === sortedSections.length - 1}
                  className="hover:text-[#00d4ff] disabled:opacity-40 transition-colors duration-150"
                  aria-label={`Move section ${sec.title} down`}
                >
                  <ArrowDown size={10} aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}