import React, { useState } from 'react'
import type { ProfessionalProfile, EnvoyDocument, AIConversation, JobTarget, ATSReport } from '@/types'
import { Send, Sparkles, Cpu, Award, Target, User, BrainCircuit, RefreshCw, Check, X, Edit3 } from 'lucide-react'
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
      <div className="flex items-center border-b border-[#1e1e2e] px-4 py-2 bg-[#050507]/40">
        <button
          onClick={() => setActivePane('chat')}
          aria-pressed={activePane === 'chat'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
            activePane === 'chat' 
              ? 'bg-[#16161f] text-[#00d4ff]' 
              : 'text-[#9898b3] hover:text-[#f2f2f7]'
          }`}
        >
          <BrainCircuit size={13} />
          <span>AI Agent</span>
        </button>
        <button
          onClick={() => setActivePane('job')}
          aria-pressed={activePane === 'job'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
            activePane === 'job' 
              ? 'bg-[#16161f] text-[#00d4ff]' 
              : 'text-[#9898b3] hover:text-[#f2f2f7]'
          }`}
        >
          <Target size={13} />
          <span>Job Target</span>
        </button>
        <button
          onClick={() => setActivePane('ats')}
          aria-pressed={activePane === 'ats'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
            activePane === 'ats' 
              ? 'bg-[#16161f] text-[#00d4ff]' 
              : 'text-[#9898b3] hover:text-[#f2f2f7]'
          }`}
        >
          <Award size={13} />
          <span>ATS Check</span>
        </button>
      </div>

      {/* 1. CHAT CONSOLE PANE */}
      {activePane === 'chat' && (
        <div className="flex-1 flex flex-col min-h-0 bg-[#0c0c10]">
          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4" aria-live="polite" aria-label="AI conversation">
            {(!conversation || conversation.messages.length === 0) && (
              <div className="flex flex-col items-center justify-center text-center p-6 h-full space-y-4">
                <div className="w-12 h-12 rounded-full bg-[#111118] border border-[#252535] flex items-center justify-center text-[#00d4ff]">
                  <Sparkles size={20} className="animate-pulse" />
                </div>
                <h4 className="text-sm font-bold text-[#f2f2f7]">Envoy Career Agent</h4>
                <p className="text-xs text-[#9898b3] max-w-[280px]">Ask the agent to rewrite sections, align bullets to outcomes, or analyze keyword signals.</p>
                
                <div className="w-full grid grid-cols-1 gap-2 pt-4 text-left">
                  {suggestedPrompts.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => setInputText(p.text)}
                      className="text-xs p-2.5 rounded-md bg-[#111118]/80 border border-[#252535] hover:border-[#6366f1]/40 text-[#9898b3] hover:text-[#f2f2f7] transition-all text-left"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

             {conversation && conversation.messages.map(msg => {
               const isUser = msg.role === 'user'

               // Extract + VALIDATE any embedded proposal block. Invalid or
               // malformed proposals return null and are rendered as plain
               // text — they can never reach the mutation boundary.
               const proposalMatch = msg.role === 'assistant' ? extractProposal(msg.content) : null

              return (
                <div key={msg.id} className="flex flex-col gap-3">
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
                      {isUser ? <User size={12} /> : <Cpu size={12} />}
                    </div>

                    <div className={`p-3 rounded-lg leading-relaxed whitespace-pre-line text-justify ${
                      isUser
                        ? 'bg-gradient-to-r from-[#6366f1] to-[#6366f1]/90 text-[#050507] font-semibold'
                        : 'bg-[#111118]/80 border border-[#1e1e2e] text-[#f2f2f7]'
                    }`}>
                      {proposalMatch ? proposalMatch.preText : msg.content}
                    </div>
                  </div>

                  {/* Render Diff Review card if proposal matches */}
                  {proposalMatch && (
                    <div className="ml-9 mr-auto max-w-[85%] bg-[#111118]/90 border border-[#252535] rounded-lg p-4 space-y-4 relative z-10 shadow-lg">
                      <div className="flex items-center justify-between border-b border-[#1e1e2e] pb-2">
                         <span className="font-extrabold uppercase text-[10px] text-[#00d4ff] tracking-widest flex items-center gap-1.5">
                           <Sparkles size={11} />
                           <span>Direct Proposal: {proposalMatch.proposal.sectionType} · {proposalMatch.proposal.field}</span>
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
                          <span className="text-[8px] font-extrabold text-emerald-400 uppercase tracking-wider block mb-1 font-bold">Proposed state</span>
                          
                          {editingProposalId === msg.id ? (
                            <textarea
                              value={editingProposalValue}
                              onChange={(e) => setEditingProposalValue(e.target.value)}
                              rows={5}
                              className="w-full bg-[#050507] border border-[#252535] rounded p-2 text-xs text-[#f2f2f7] focus:outline-none focus:border-[#6366f1] resize-none"
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
                              className="flex items-center gap-1.5 text-[9px] font-bold border border-[#252535] px-2.5 py-1.5 rounded hover:bg-[#16161f] text-[#9898b3] hover:text-[#f2f2f7]"
                            >
                              <X size={11} />
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
                              className="flex items-center gap-1.5 text-[9px] font-bold bg-[#6366f1] text-[#050507] px-2.5 py-1.5 rounded hover:opacity-95"
                            >
                              <Check size={11} />
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
                              className="flex items-center gap-1 text-[9px] font-bold border border-[#252535] text-[#9898b3] hover:text-[#f2f2f7] px-2.5 py-1.5 rounded hover:bg-[#16161f]"
                            >
                              <Edit3 size={11} />
                              <span>Edit suggestion</span>
                            </button>
                            <button
                              onClick={() => onAcceptProposal(proposalMatch.proposal)}
                              className="flex items-center gap-1 text-[9px] font-bold bg-emerald-500 text-[#050507] px-2.5 py-1.5 rounded hover:opacity-95 shadow-md"
                            >
                              <Check size={11} />
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
              <div className="flex gap-3 text-xs mr-auto max-w-[85%]">
                <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center bg-indigo-500/10 border-indigo-500/20 text-[#6366f1]">
                  <Cpu size={12} />
                </div>
                <div className="p-3 rounded-lg leading-relaxed bg-[#111118]/80 border border-[#1e1e2e] text-[#f2f2f7]">
                  {isThinking && !streamText ? (
                    <div className="flex gap-1 items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00d4ff] animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00d4ff] animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00d4ff] animate-bounce" style={{ animationDelay: '300ms' }} />
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
              className="flex-1 bg-[#111118] border border-[#252535] rounded-md px-3 py-2 text-xs text-[#f2f2f7] placeholder-[#5c5c7a] focus:outline-none focus:border-[#6366f1] resize-none"
            />
            <button
              onClick={handleSend}
              className="w-10 h-10 rounded-md bg-[#6366f1] hover:opacity-90 transition-opacity text-[#050507] flex items-center justify-center shrink-0 self-end shadow-md"
              aria-label="Send message"
              title="Send message"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}

      {/* 2. JOB TARGET PANE */}
      {activePane === 'job' && (
        <div className="flex-1 p-4 flex flex-col gap-4 min-h-0">
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#9898b3] mb-1.5">Target Job Description</h4>
            <p className="text-[11px] text-[#5c5c7a]">Paste the job posting description below. Envoy parses target skills, required seniority, and keywords automatically.</p>
          </div>

          <textarea
            value={jobInput}
            onChange={(e) => setJobInput(e.target.value)}
            rows={12}
            placeholder="Paste role requirements here..."
            className="flex-1 bg-[#111118]/80 border border-[#252535] rounded-md p-3 text-xs text-[#f2f2f7] placeholder-[#5c5c7a] focus:outline-none focus:border-[#6366f1] resize-none"
          />

          <button
            onClick={() => {
              onUpdateJobTarget(jobInput)
            }}
            className="w-full flex items-center justify-center gap-2 bg-[#6366f1] text-[#050507] font-bold text-xs py-2 rounded-md hover:opacity-95"
          >
            <span>Update Target Job</span>
          </button>
        </div>
      )}

      {/* 3. ATS CHECK PANE */}
      {activePane === 'ats' && (
        <div className="flex-1 p-4 flex flex-col gap-5 min-h-0 overflow-y-auto">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#9898b3] mb-1">ATS Scanner Gauge</h4>
              <p className="text-[10px] text-[#5c5c7a]">Real-time keyword coverage and readability scans.</p>
            </div>
            <button
              onClick={onRunATSAnalysis}
              className="p-1.5 rounded bg-[#16161f] border border-[#252535] text-[#9898b3] hover:text-[#00d4ff] flex items-center gap-1 text-[10px]"
              title="Refresh Analysis"
            >
              <RefreshCw size={11} />
              <span>Scan</span>
            </button>
          </div>

          {atsReport ? (
            <div className="space-y-5">
              {/* Overall Score */}
              <div className="p-4 bg-[#111118]/80 border border-[#252535] rounded-lg text-center flex flex-col items-center">
                <span className="text-3xl font-black text-[#00d4ff]">{atsReport.overallScore}/100</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#9898b3] mt-1.5">ATS Match Index</span>
              </div>

              {/* Subscores Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-[#111118]/40 border border-[#1e1e2e] p-2.5 rounded text-center">
                  <div className="text-sm font-bold text-gray-200">{atsReport.structureScore}%</div>
                  <div className="text-[9px] text-[#5c5c7a] uppercase tracking-wider">Structure</div>
                </div>
                <div className="bg-[#111118]/40 border border-[#1e1e2e] p-2.5 rounded text-center">
                  <div className="text-sm font-bold text-gray-200">{atsReport.keywordScore}%</div>
                  <div className="text-[9px] text-[#5c5c7a] uppercase tracking-wider">Keywords</div>
                </div>
                <div className="bg-[#111118]/40 border border-[#1e1e2e] p-2.5 rounded text-center">
                  <div className="text-sm font-bold text-gray-200">{atsReport.contentScore}%</div>
                  <div className="text-[9px] text-[#5c5c7a] uppercase tracking-wider">Content</div>
                </div>
                <div className="bg-[#111118]/40 border border-[#1e1e2e] p-2.5 rounded text-center">
                  <div className="text-sm font-bold text-gray-200">{atsReport.readabilityScore}%</div>
                  <div className="text-[9px] text-[#5c5c7a] uppercase tracking-wider">Readability</div>
                </div>
              </div>

              {/* Issues List */}
              <div className="space-y-2.5">
                <h5 className="text-[10px] font-extrabold uppercase tracking-widest text-[#9898b3]">Detected Issues</h5>
                {atsReport.issues.length === 0 ? (
                  <p className="text-[11px] text-[#5c5c7a] italic">No issues detected! Your resume is highly ATS-optimized.</p>
                ) : (
                  <div className="space-y-2">
                    {atsReport.issues.map(iss => (
                      <div key={iss.id} className="p-2.5 rounded bg-[#111118]/80 border border-[#1e1e2e] text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-gray-300">{iss.title}</span>
                          <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                            iss.severity === 'critical' || iss.severity === 'high'
                              ? 'bg-[#ef4444]/10 text-[#ef4444]'
                              : 'bg-amber-500/10 text-amber-500'
                          }`}>{iss.severity}</span>
                        </div>
                        <p className="text-[11px] text-[#9898b3]">{iss.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 bg-[#111118]/40 border border-dashed border-[#252535] rounded-xl text-center">
              <Sparkles size={28} className="text-[#5c5c7a] mb-2 animate-pulse" />
              <p className="text-xs text-[#9898b3] mb-4">Provide a target job post and run the scan to get automated ATS scoring feedback.</p>
              <button
                onClick={onRunATSAnalysis}
                className="bg-[#16161f] border border-[#252535] text-[#f2f2f7] font-semibold text-xs px-3.5 py-1.5 rounded hover:bg-[#1c1c28]"
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
