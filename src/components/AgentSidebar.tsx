import React, { useState } from 'react'
import type { ProfessionalProfile, EnvoyDocument, AIConversation, JobTarget, ATSReport } from '@/types'
import {
  Send, Sparkles, Cpu, Award, Target, User, BrainCircuit, RefreshCw, Check, X, Edit3,
  ArrowRight, AlertTriangle, ShieldCheck,
} from 'lucide-react'
import { extractProposal, type ValidatedProposal } from '@/lib/validation/proposal'

interface AgentSidebarProps {
  profile: ProfessionalProfile
  document: EnvoyDocument
  conversation: AIConversation | null
  isThinking: boolean
  streamText: string
  jobTarget: JobTarget | null
  atsReport: ATSReport | null
   onSendMessage: (text: string) => void
   onUpdateJobTarget: (desc: string) => void
   onRunATSAnalysis: () => void
   onAcceptProposal: (proposal: ValidatedProposal) => void
 }

export function AgentSidebar({
  profile: _profile,
  document: _document,
  conversation,
  isThinking,
  streamText,
  jobTarget,
  atsReport,
  onSendMessage,
  onUpdateJobTarget,
  onRunATSAnalysis,
  onAcceptProposal,
}: AgentSidebarProps) {
  const [activePane, setActivePane] = useState<'chat' | 'job' | 'ats'>('chat')
  const [inputText, setInputText] = useState('')
  const [jobInput, setJobInput] = useState(jobTarget?.description || '')

  // Custom edits on proposals
  const [editingProposalId, setEditingProposalId] = useState<string | null>(null)
  const [editingProposalValue, setEditingProposalValue] = useState<string>('')

  const handleSend = () => {
    if (!inputText.trim()) return
    onSendMessage(inputText)
    setInputText('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const suggestedPrompts = [
    { label: 'Rewrite summary for backend role', text: 'Rewrite my professional summary to target a Senior Backend Engineer role.' },
    { label: 'Quantify achievements', text: 'Analyze my work experience bullets and suggest metrics to make them more achievement-oriented.' },
    { label: 'Shorten resume to 1 page', text: 'Help me compress this resume so it fits cleanly on a single page.' },
    { label: 'ATS optimization', text: 'Review my skills keyword coverage and list what terms are missing for a modern software role.' },
  ]

  return (
    <aside className="w-[420px] bg-[#0c0c10] border-r border-[#1e1e2e] flex flex-col h-full shrink-0 relative z-20">

      {/* Pane Switcher Bar */}
      <div className="border-b border-[#1e1e2e] px-3 py-2 bg-[#050507]/40">
        <div className="segmented w-full" role="group" aria-label="Agent panes">
          <button
            onClick={() => setActivePane('chat')}
            aria-pressed={activePane === 'chat'}
            className={`segmented-item flex-1 justify-center transition-all duration-150 ${activePane === 'chat' ? 'segmented-item-active' : ''}`}
          >
            <BrainCircuit size={13} aria-hidden="true" />
            <span>AI Agent</span>
          </button>
          <button
            onClick={() => setActivePane('job')}
            aria-pressed={activePane === 'job'}
            className={`segmented-item flex-1 justify-center transition-all duration-150 ${activePane === 'job' ? 'segmented-item-active' : ''}`}
          >
            <Target size={13} aria-hidden="true" />
            <span>Job Target</span>
          </button>
          <button
            onClick={() => setActivePane('ats')}
            aria-pressed={activePane === 'ats'}
            className={`segmented-item flex-1 justify-center transition-all duration-150 ${activePane === 'ats' ? 'segmented-item-active' : ''}`}
          >
            <Award size={13} aria-hidden="true" />
            <span>ATS Check</span>
          </button>
        </div>
      </div>

      {/* 1. CHAT CONSOLE PANE */}
      {activePane === 'chat' && (
        <div className="flex-1 flex flex-col min-h-0 bg-[#0c0c10]">
          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4" aria-live="polite" aria-label="AI conversation">
            {(!conversation || conversation.messages.length === 0) && (
              <div className="flex flex-col items-center justify-center text-center p-6 h-full space-y-4">
                <div className="w-12 h-12 rounded-xl bg-[#111118] border border-[#252535] flex items-center justify-center text-[#00d4ff] shadow-[0_0_28px_-10px_rgba(0,212,255,0.45)] animate-fade-in">
                  <Sparkles size={20} aria-hidden="true" />
                </div>
                <h4 className="text-sm font-bold text-[#f2f2f7]">Envoy Career Agent</h4>
                <p className="text-xs text-[#9898b3] max-w-[280px] leading-relaxed">Ask the agent to rewrite sections, align bullets to outcomes, or analyze keyword signals.</p>

                <div className="w-full grid grid-cols-1 gap-2 pt-4 text-left">
                  {suggestedPrompts.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => setInputText(p.text)}
                      style={{ animationDelay: `${idx * 45}ms` }}
                      className="group text-xs p-2.5 rounded-lg surface-inset hover:border-[#6366f1]/50 text-left text-[#9898b3] hover:text-[#f2f2f7] transition-all duration-150 animate-fade-in flex items-center justify-between gap-2"
                    >
                      <span>{p.label}</span>
                      <ArrowRight
                        size={12}
                        className="shrink-0 text-[#5c5c7a] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-[#6366f1] transition-all duration-150"
                        aria-hidden="true"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

             {conversation && conversation.messages.map((msg, msgIdx) => {
               const isUser = msg.role === 'user'

               // Extract + VALIDATE any embedded proposal block. Invalid or
               // malformed proposals return null and are rendered as plain
               // text — they can never reach the mutation boundary.
               const proposalMatch = msg.role === 'assistant' ? extractProposal(msg.content) : null

              return (
                <div key={msg.id} className="flex flex-col gap-3 animate-fade-in" style={{ animationDelay: msgIdx === 0 ? '0ms' : undefined }}>
                  <div
                    className={`flex gap-3 text-xs max-w-[85%] ${
                      isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center border text-[10px] ${
                      isUser
                        ? 'bg-[#16161f] border-[#252535] text-[#f2f2f7]'
                        : 'bg-indigo-500/10 border-indigo-500/20 text-[#6366f1]'
                    }`}>
                      {isUser ? <User size={12} aria-hidden="true" /> : <Cpu size={12} aria-hidden="true" />}
                    </div>

                    <div className={`p-3 rounded-lg leading-relaxed whitespace-pre-line ${
                      isUser
                        ? 'bg-indigo-500/[0.14] border border-indigo-500/30 text-[#dcdcf5]'
                        : 'bg-[#111118]/80 border border-[#1e1e2e] text-[#f2f2f7]'
                    }`}>
                      {proposalMatch ? proposalMatch.preText : msg.content}
                    </div>
                  </div>

                  {/* Render Diff Review card if proposal matches */}
                  {proposalMatch && (
                    <div className="ml-9 mr-auto max-w-[85%] surface-card !bg-[#111118]/90 rounded-lg p-4 space-y-4 relative z-10 shadow-elevation-2 animate-fade-in">
                      <div className="flex items-center justify-between border-b border-[#1e1e2e] pb-2.5">
                         <span className="chip chip-cyan !py-0.5 !px-2 !text-[9px] uppercase tracking-widest">
                           <Sparkles size={10} aria-hidden="true" />
                           <span>{proposalMatch.proposal.sectionType} · {proposalMatch.proposal.field}</span>
                         </span>
                         <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-[#5c5c7a] uppercase tracking-wide">
                           <ShieldCheck size={11} className="text-emerald-400" aria-hidden="true" />
                           Validated
                         </span>
                      </div>

                      <div className="text-[11px] text-[#9898b3] leading-relaxed text-justify">
                        {proposalMatch.proposal.explanation}
                      </div>

                      {/* Stacked before and after blocks */}
                      <div className="space-y-2 text-[11px] font-medium">
                        <div className="p-2.5 rounded bg-red-500/5 border border-red-500/10">
                          <span className="text-[8px] font-extrabold text-[#ef4444] uppercase tracking-wider block mb-1">Current state</span>
                          <span className="text-[#9898b3] whitespace-pre-line line-through decoration-red-500/30">
                            {Array.isArray(proposalMatch.proposal.originalValue)
                              ? proposalMatch.proposal.originalValue.join('\n')
                              : proposalMatch.proposal.originalValue}
                          </span>
                        </div>

                        <div className="p-2.5 rounded bg-emerald-500/5 border border-emerald-500/10">
                          <span className="text-[8px] font-extrabold text-emerald-400 uppercase tracking-wider block mb-1">Proposed state</span>

                          {editingProposalId === msg.id ? (
                            <textarea
                              value={editingProposalValue}
                              onChange={(e) => setEditingProposalValue(e.target.value)}
                              rows={5}
                              autoFocus
                              className="w-full bg-[#050507] border border-[#252535] rounded p-2 text-xs text-[#f2f2f7] focus:outline-none focus:border-[#6366f1] focus:ring-2 focus:ring-[#6366f1]/15 transition-all duration-150 resize-none"
                            />
                          ) : (
                            <span className="text-gray-200 whitespace-pre-line">
                              {Array.isArray(proposalMatch.proposal.newValue)
                                ? proposalMatch.proposal.newValue.join('\n')
                                : proposalMatch.proposal.newValue}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 justify-end border-t border-[#1e1e2e] pt-3">
                        {editingProposalId === msg.id ? (
                          <>
                            <button
                              onClick={() => setEditingProposalId(null)}
                              className="btn btn-secondary btn-sm !px-2.5 !py-1 !text-[10px] active:scale-95 transition-transform duration-150"
                            >
                              <X size={11} aria-hidden="true" />
                              <span>Cancel</span>
                            </button>
                            <button
                              onClick={() => {
                                const finalValue = proposalMatch.proposal.field === 'bullets' || Array.isArray(proposalMatch.proposal.newValue)
                                  ? editingProposalValue.split('\n').filter(l => l.trim())
                                  : editingProposalValue
                                onAcceptProposal({
                                  ...proposalMatch.proposal,
                                  newValue: finalValue
                                })
                                setEditingProposalId(null)
                              }}
                              className="btn btn-success btn-sm !px-2.5 !py-1 !text-[10px] active:scale-95 transition-transform duration-150"
                            >
                              <Check size={11} aria-hidden="true" />
                              <span>Apply Edit</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingProposalId(msg.id)
                                setEditingProposalValue(
                                  Array.isArray(proposalMatch.proposal.newValue)
                                    ? proposalMatch.proposal.newValue.join('\n')
                                    : proposalMatch.proposal.newValue
                                )
                              }}
                              className="btn btn-secondary btn-sm !px-2.5 !py-1 !text-[10px] active:scale-95 transition-transform duration-150"
                            >
                              <Edit3 size={11} aria-hidden="true" />
                              <span>Edit suggestion</span>
                            </button>
                            <button
                              onClick={() => onAcceptProposal(proposalMatch.proposal)}
                              className="btn btn-success btn-sm !px-2.5 !py-1 !text-[10px] active:scale-95 transition-transform duration-150"
                            >
                              <Check size={11} aria-hidden="true" />
                              <span>Accept suggestion</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Live stream block */}
            {(isThinking || streamText) && (
              <div className="flex gap-3 text-xs mr-auto max-w-[85%] animate-fade-in">
                <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center bg-indigo-500/10 border border-indigo-500/20 text-[#6366f1]">
                  <Cpu size={12} aria-hidden="true" />
                </div>
                <div className="p-3 rounded-lg leading-relaxed bg-[#111118]/80 border border-[#1e1e2e] text-[#f2f2f7]">
                  {isThinking && !streamText ? (
                    <div className="flex gap-1 items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00d4ff] animate-thinking-dots" style={{ animationDelay: '0ms' }} aria-hidden="true" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00d4ff] animate-thinking-dots" style={{ animationDelay: '200ms' }} aria-hidden="true" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00d4ff] animate-thinking-dots" style={{ animationDelay: '400ms' }} aria-hidden="true" />
                      <span className="text-[10px] text-[#5c5c7a] ml-1.5 uppercase font-bold tracking-wider">Analyzing Context...</span>
                    </div>
                  ) : (
                    streamText
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Console input block */}
          <div className="border-t border-[#1e1e2e] p-4 bg-[#050507]/40 flex gap-2">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask AI to improve experience bullet points or draft cover letters..."
              rows={2}
              className="flex-1 bg-[#111118] border border-[#252535] rounded-md px-3 py-2 text-xs text-[#f2f2f7] placeholder-[#5c5c7a] focus:outline-none focus:border-[#6366f1] focus:ring-2 focus:ring-[#6366f1]/15 transition-all duration-150 resize-none"
            />
            <button
              onClick={handleSend}
              className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 self-end shadow-md transition-all duration-150 active:scale-95 ${
                inputText.trim()
                  ? 'bg-[#6366f1] hover:opacity-90 hover:shadow-[0_0_20px_-6px_rgba(99,102,241,0.7)] text-[#050507]'
                  : 'bg-[#16161f] text-[#5c5c7a] cursor-default'
              }`}
              aria-label="Send message"
              title="Send message"
            >
              <Send size={15} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* 2. JOB TARGET PANE */}
      {activePane === 'job' && (
        <div className="flex-1 p-4 flex flex-col gap-4 min-h-0 animate-fade-in">
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#9898b3] mb-1.5">Target Job Description</h4>
            <p className="text-[11px] text-[#5c5c7a] leading-relaxed">Paste the job posting description below. Envoy parses target skills, required seniority, and keywords automatically.</p>
          </div>

          <textarea
            value={jobInput}
            onChange={(e) => setJobInput(e.target.value)}
            rows={12}
            placeholder="Paste role requirements here..."
            className="flex-1 bg-[#111118]/80 border border-[#252535] rounded-md p-3 text-xs text-[#f2f2f7] placeholder-[#5c5c7a] focus:outline-none focus:border-[#6366f1] focus:ring-2 focus:ring-[#6366f1]/15 transition-all duration-150 resize-none"
          />

          <button
            onClick={() => {
              onUpdateJobTarget(jobInput)
            }}
            disabled={!jobInput.trim()}
            className="btn btn-primary w-full !py-2 !text-xs active:scale-[0.98] transition-transform duration-150"
          >
            <Target size={13} aria-hidden="true" />
            <span>Update Target Job</span>
          </button>
        </div>
      )}

      {/* 3. ATS CHECK PANE */}
      {activePane === 'ats' && (
        <div className="flex-1 p-4 flex flex-col gap-5 min-h-0 overflow-y-auto animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#9898b3] mb-1">ATS Scanner Gauge</h4>
              <p className="text-[10px] text-[#5c5c7a]">Real-time keyword coverage and readability scans.</p>
            </div>
            <button
              onClick={onRunATSAnalysis}
              className="p-1.5 rounded bg-[#16161f] border border-[#252535] text-[#9898b3] hover:text-[#00d4ff] hover:border-[#00d4ff]/30 flex items-center gap-1 text-[10px] transition-colors duration-150 active:scale-95"
              title="Refresh Analysis"
            >
              <RefreshCw size={11} aria-hidden="true" />
              <span>Scan</span>
            </button>
          </div>

          {atsReport ? (
            <div className="space-y-5">
              {/* Overall Score — ring gauge presenting the deterministic score */}
              <div className="surface-inset p-5 flex flex-col items-center">
                <div className="relative w-28 h-28" role="img" aria-label={`Overall ATS match index ${atsReport.overallScore} out of 100`}>
                  <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90" aria-hidden="true">
                    <defs>
                      <linearGradient id="envoy-ats-ring" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#00d4ff" />
                      </linearGradient>
                    </defs>
                    <circle cx="40" cy="40" r="34" fill="none" stroke="#1e1e2e" strokeWidth="7" />
                    <circle
                      cx="40" cy="40" r="34" fill="none"
                      stroke="url(#envoy-ats-ring)" strokeWidth="7" strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 34}
                      strokeDashoffset={2 * Math.PI * 34 * (1 - Math.min(100, Math.max(0, atsReport.overallScore)) / 100)}
                      className="transition-all duration-700 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-[#f2f2f7] font-mono tabular-nums">{atsReport.overallScore}</span>
                    <span className="text-[9px] text-[#5c5c7a] font-bold uppercase tracking-widest">/ 100</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#9898b3] mt-3">ATS Match Index</span>
              </div>

              {/* Subscores Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                {([
                  ['Structure', atsReport.structureScore],
                  ['Keywords', atsReport.keywordScore],
                  ['Content', atsReport.contentScore],
                  ['Readability', atsReport.readabilityScore],
                ] as const).map(([label, value]) => (
                  <div key={label} className="surface-inset p-3">
                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className="text-sm font-bold text-[#f2f2f7] font-mono tabular-nums">{value}%</span>
                      <span className="text-[9px] text-[#5c5c7a] uppercase tracking-wider">{label}</span>
                    </div>
                    <div className="h-1 rounded-full bg-[#050507] overflow-hidden ring-1 ring-inset ring-[#1e1e2e]" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={`${label} score`}>
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#6366f1] to-[#00d4ff] transition-all duration-700 ease-out"
                        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Issues List */}
              <div className="space-y-2.5">
                <h5 className="text-[10px] font-extrabold uppercase tracking-widest text-[#9898b3]">Detected Issues</h5>
                {atsReport.issues.length === 0 ? (
                  <div className="flex items-center gap-2 p-2.5 rounded bg-emerald-500/5 border border-emerald-500/10">
                    <ShieldCheck size={14} className="text-emerald-400 shrink-0" aria-hidden="true" />
                    <p className="text-[11px] text-[#9898b3]">No issues detected — your resume is highly ATS-optimized.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {atsReport.issues.map(iss => {
                      const isSevere = iss.severity === 'critical' || iss.severity === 'high'
                      return (
                        <div key={iss.id} className="p-2.5 rounded bg-[#111118]/80 border border-[#1e1e2e] text-xs hover:border-[#252535] transition-colors duration-150">
                          <div className="flex items-center justify-between mb-1 gap-2">
                            <span className="font-bold text-gray-300 flex items-center gap-1.5 min-w-0">
                              <AlertTriangle
                                size={11}
                                className={`shrink-0 ${isSevere ? 'text-red-400' : 'text-amber-400'}`}
                                aria-hidden="true"
                              />
                              <span className="truncate">{iss.title}</span>
                            </span>
                            <span className={`chip !rounded-md !px-1.5 !py-0.5 !text-[8px] font-extrabold uppercase tracking-wider shrink-0 ${
                              isSevere ? 'chip-danger' : 'chip-warning'
                            }`}>{iss.severity}</span>
                          </div>
                          <p className="text-[11px] text-[#9898b3] leading-relaxed">{iss.description}</p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 surface-card border-dashed !border-[#252535] text-center">
              <div className="w-12 h-12 rounded-xl bg-[#111118] border border-[#252535] flex items-center justify-center text-[#5c5c7a] mb-3">
                <Award size={22} aria-hidden="true" />
              </div>
              <p className="text-xs text-[#9898b3] mb-4 max-w-[240px] leading-relaxed">Provide a target job post and run the scan to get automated ATS scoring feedback.</p>
              <button
                onClick={onRunATSAnalysis}
                className="btn btn-secondary btn-sm active:scale-95 transition-transform duration-150"
              >
                Scan Resume
              </button>
            </div>
          )}
        </div>
      )}

    </aside>
  )
}