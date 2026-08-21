import React from 'react'
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

  return (
    <div className="flex flex-col items-center h-full bg-[#111118]/40 border-l border-[#1e1e2e] flex-1">
      {/* Canvas Toolbars */}
      <div className="w-full bg-[#0c0c10]/80 border-b border-[#1e1e2e] px-6 py-2.5 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
        <div className="flex items-center gap-1.5 text-xs text-[#9898b3]">
          <span className="font-semibold text-[#f2f2f7]">{document.title}</span>
          <span>•</span>
          <span className="capitalize">{document.type}</span>
          <span>•</span>
          <span>Page 1 of 1</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded bg-[#16161f] border border-[#252535] hover:bg-[#1c1c28] text-[#9898b3] hover:text-[#f2f2f7]"
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>
          <span className="text-xs text-[#9898b3] font-mono select-none w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded bg-[#16161f] border border-[#252535] hover:bg-[#1c1c28] text-[#9898b3] hover:text-[#f2f2f7]"
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>

          <div className="h-4 w-px bg-[#252535]" />

          <button
            onClick={handleFitPage}
            className="px-2 py-1 rounded bg-[#16161f] border border-[#252535] hover:bg-[#1c1c28] text-xs text-[#9898b3] hover:text-[#f2f2f7]"
          >
            Fit Page
          </button>
          <button
            onClick={handleFitWidth}
            className="px-2 py-1 rounded bg-[#16161f] border border-[#252535] hover:bg-[#1c1c28] text-xs text-[#9898b3] hover:text-[#f2f2f7]"
          >
            Fit Width
          </button>
        </div>
      </div>

      {/* Page Canvas Frame Container */}
      <div className="flex-1 w-full overflow-auto flex justify-center items-start p-8 relative">
        <div 
          className="relative transition-transform duration-200 origin-top shadow-[0_4px_32px_rgba(0,0,0,0.4)]"
          style={{ transform: `scale(${zoom})` }}
        >
          {/* A4 Sheet Dimensions: 210mm x 297mm (Standard resolution equivalent ~794px x 1123px) */}
          <div className="w-[794px] min-h-[1123px] bg-white text-gray-900 overflow-hidden relative print:shadow-none">
            
            {/* Active Template Render */}
            <TemplateRenderer 
              profile={profile} 
              document={document} 
              onSelectSection={(sectionId) => {
                const section = document.sections.find(s => s.id === sectionId)
                if (section) onEditSection(section)
              }}
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
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${
                sec.visible 
                  ? 'bg-[#16161f] border-[#252535] text-[#f2f2f7]' 
                  : 'bg-[#0c0c10] border-[#1e1e2e]/40 text-[#5c5c7a]'
              }`}
            >
              <span>{sec.title}</span>
              <div className="flex items-center gap-1 ml-1.5 border-l border-[#252535] pl-1.5 shrink-0">
                <button
                  onClick={() => onEditSection(sec)}
                  className="hover:text-[#00d4ff] text-[#9898b3]"
                  title="Edit Settings"
                >
                  <Edit2 size={10} />
                </button>
                <button
                  onClick={() => onToggleVisibility(sec.id)}
                  className="hover:text-[#6366f1]"
                  title={sec.visible ? 'Hide Section' : 'Show Section'}
                >
                  {sec.visible ? <Eye size={10} /> : <EyeOff size={10} />}
                </button>
                <button
                  onClick={() => moveSection(idx, 'up')}
                  disabled={idx === 0}
                  className="hover:text-[#00d4ff] disabled:opacity-40"
                >
                  <ArrowUp size={10} />
                </button>
                <button
                  onClick={() => moveSection(idx, 'down')}
                  disabled={idx === sortedSections.length - 1}
                  className="hover:text-[#00d4ff] disabled:opacity-40"
                >
                  <ArrowDown size={10} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
