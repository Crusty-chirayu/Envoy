// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ENVOY — Core Domain Types
// This is the ONE SOURCE OF TRUTH for all data structures.
// All document renderers, AI tools, and export engines consume
// these types. Never duplicate or fork these types.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ─────────────────────────────────────────
// Identity
// ─────────────────────────────────────────

export interface ProfileIdentity {
  name: string
  headline: string
  email: string
  phone?: string
  location?: string
  website?: string
  linkedin?: string
  github?: string
  twitter?: string
  socials?: SocialLink[]
}

export interface SocialLink {
  platform: string
  url: string
  label?: string
}

// ─────────────────────────────────────────
// Experience
// ─────────────────────────────────────────

export interface ExperienceEntry {
  id: string
  company: string
  role: string
  location?: string
  startDate: string         // ISO date string: "2022-06"
  endDate?: string          // undefined = "Present"
  current: boolean
  bullets: string[]
  technologies?: string[]
  url?: string
}

// ─────────────────────────────────────────
// Education
// ─────────────────────────────────────────

export interface EducationEntry {
  id: string
  institution: string
  degree: string
  field?: string
  location?: string
  startDate: string
  endDate?: string
  current: boolean
  gpa?: string
  honors?: string
  coursework?: string[]
  activities?: string[]
}

// ─────────────────────────────────────────
// Skills
// ─────────────────────────────────────────

export interface SkillGroup {
  id: string
  category: string
  skills: string[]
  proficiency?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
}

// ─────────────────────────────────────────
// Projects
// ─────────────────────────────────────────

export interface ProjectEntry {
  id: string
  name: string
  description: string
  bullets?: string[]
  technologies: string[]
  url?: string
  github?: string
  startDate?: string
  endDate?: string
  current?: boolean
  featured?: boolean
  imageUrl?: string
}

// ─────────────────────────────────────────
// Other sections
// ─────────────────────────────────────────

export interface CertificationEntry {
  id: string
  name: string
  issuer: string
  date: string
  expiryDate?: string
  credentialId?: string
  url?: string
}

export interface AchievementEntry {
  id: string
  title: string
  description: string
  date?: string
  organization?: string
}

export interface PublicationEntry {
  id: string
  title: string
  authors: string[]
  journal?: string
  conference?: string
  date: string
  doi?: string
  url?: string
  abstract?: string
}

export interface AwardEntry {
  id: string
  title: string
  issuer: string
  date?: string
  description?: string
}

export interface VolunteerEntry {
  id: string
  organization: string
  role: string
  startDate: string
  endDate?: string
  current: boolean
  description?: string
  bullets?: string[]
}

export interface LanguageEntry {
  id: string
  language: string
  proficiency: 'native' | 'fluent' | 'professional' | 'conversational' | 'elementary'
}

export interface InterestEntry {
  id: string
  interest: string
}

export interface CustomSectionEntry {
  id: string
  title: string
  content: string
  bullets?: string[]
}

// ─────────────────────────────────────────
// Canonical Professional Profile
// THE ONE SOURCE OF TRUTH
// ─────────────────────────────────────────

export interface ProfessionalProfile {
  id: string
  userId: string
  createdAt: string
  updatedAt: string

  identity: ProfileIdentity
  summary?: string

  experience: ExperienceEntry[]
  education: EducationEntry[]
  skills: SkillGroup[]
  projects: ProjectEntry[]
  certifications: CertificationEntry[]
  achievements: AchievementEntry[]
  publications: PublicationEntry[]
  awards: AwardEntry[]
  volunteering: VolunteerEntry[]
  languages: LanguageEntry[]
  interests: InterestEntry[]
  customSections: CustomSection[]
}

export interface CustomSection {
  id: string
  title: string
  entries: CustomSectionEntry[]
  visible: boolean
  order: number
}

// ─────────────────────────────────────────
// Document Model
// ─────────────────────────────────────────

export type DocumentType = 'resume' | 'cv' | 'portfolio'

export type TemplateId = 'minimal' | 'modern' | 'academic' | 'developer'

export type SectionType =
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'certifications'
  | 'achievements'
  | 'publications'
  | 'awards'
  | 'volunteering'
  | 'languages'
  | 'interests'
  | 'custom'

export interface DocumentSectionConfig {
  id: string
  type: SectionType
  title: string        // overrideable display title
  visible: boolean
  order: number
  customSectionId?: string   // only for type='custom'
}

export interface DocumentSettings {
  template: TemplateId
  accentColor: string         // hex
  fontFamily: 'inter' | 'georgia' | 'roboto' | 'merriweather' | 'source-code-pro'
  fontSize: 'compact' | 'normal' | 'spacious'
  pageMargin: 'narrow' | 'normal' | 'wide'
  showPhoto: boolean
}

export interface EnvoyDocument {
  id: string
  userId: string
  profileId: string
  type: DocumentType
  title: string
  sections: DocumentSectionConfig[]
  settings: DocumentSettings
  targetJobId?: string     // linked job target
  createdAt: string
  updatedAt: string
  lastExportedAt?: string
}

// ─────────────────────────────────────────
// Document Version
// ─────────────────────────────────────────

export type VersionTrigger = 'manual' | 'ai_accept' | 'import' | 'auto'

export interface DocumentVersion {
  id: string
  documentId: string
  label: string
  trigger: VersionTrigger
  profileSnapshot: ProfessionalProfile
  documentSnapshot: EnvoyDocument
  changedSections: string[]
  aiOrigin: boolean
  createdAt: string
  description?: string
}

// ─────────────────────────────────────────
// AI Conversation
// ─────────────────────────────────────────

export type AIRole = 'user' | 'assistant' | 'system'

export interface AIMessage {
  id: string
  conversationId: string
  role: AIRole
  content: string
  toolCalls?: AIToolCall[]
  toolResults?: AIToolResult[]
  pending?: boolean
  error?: string
  createdAt: string
}

export interface AIToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface AIToolResult {
  toolCallId: string
  result: unknown
  error?: string
}

export interface AIConversation {
  id: string
  userId: string
  documentId?: string
  title: string
  messages: AIMessage[]
  createdAt: string
  updatedAt: string
}

// ─────────────────────────────────────────
// AI Document Diff
// ─────────────────────────────────────────

export type DiffStatus = 'pending' | 'accepted' | 'rejected' | 'edited'

export interface DocumentDiff {
  id: string
  conversationMessageId: string
  sectionId: string          // which section/field changed
  fieldPath: string          // dot-notation path e.g. "experience[0].bullets[1]"
  before: string
  after: string
  status: DiffStatus
  editedContent?: string     // if user chose 'edit' instead of accept/reject
  createdAt: string
}

export interface DiffBatch {
  id: string
  messageId: string
  diffs: DocumentDiff[]
  summary: string
  appliedAt?: string
  versionId?: string
}

// ─────────────────────────────────────────
// Job Target
// ─────────────────────────────────────────

export interface JobTarget {
  id: string
  userId: string
  documentId?: string
  title: string
  company?: string
  description: string
  url?: string

  // Extracted by AI
  extracted?: JobExtraction

  createdAt: string
  updatedAt: string
}

export interface JobExtraction {
  role: string
  seniority: string
  requiredSkills: string[]
  preferredSkills: string[]
  keywords: string[]
  responsibilities: string[]
  qualifications: string[]
  technologies: string[]
  softSkills: string[]
}

// ─────────────────────────────────────────
// ATS Analysis
// ─────────────────────────────────────────

export type ATSIssueSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info'

export interface ATSIssue {
  id: string
  category: 'structure' | 'keywords' | 'content' | 'readability' | 'risk'
  severity: ATSIssueSeverity
  title: string
  description: string
  suggestion?: string
  affectedSection?: string
}

export interface ATSReport {
  id: string
  documentId: string
  userId: string
  jobTargetId?: string

  overallScore: number        // 0-100
  structureScore: number
  keywordScore: number
  contentScore: number
  readabilityScore: number
  riskScore: number           // lower = more risk

  issues: ATSIssue[]

  keywordMatches: string[]
  missingKeywords: string[]
  matchPercentage?: number

  pageCount: number
  wordCount: number

  createdAt: string
}

// ─────────────────────────────────────────
// Portfolio
// ─────────────────────────────────────────

export type PortfolioTheme = 'minimal' | 'bold' | 'creative' | 'developer'
export type PortfolioVisibility = 'public' | 'unlisted' | 'private'

export interface PortfolioSite {
  id: string
  userId: string
  profileId: string
  slug: string
  title: string
  description?: string
  theme: PortfolioTheme
  accentColor: string
  visibility: PortfolioVisibility

  seoTitle?: string
  seoDescription?: string
  socialImageUrl?: string

  sections: PortfolioSectionConfig[]
  publishedAt?: string
  customDomain?: string

  createdAt: string
  updatedAt: string
}

export interface PortfolioSectionConfig {
  id: string
  type: 'hero' | 'about' | 'experience' | 'projects' | 'skills' | 'education' | 'contact' | 'custom'
  visible: boolean
  order: number
  title?: string
}

// ─────────────────────────────────────────
// Share Links
// ─────────────────────────────────────────

export type ShareVisibility = 'public' | 'unlisted' | 'private'

export interface ShareLink {
  id: string
  userId: string
  resourceType: 'document' | 'portfolio'
  resourceId: string
  slug: string
  visibility: ShareVisibility
  allowIndexing: boolean
  expiresAt?: string
  accessCount: number
  createdAt: string
}

// ─────────────────────────────────────────
// Uploads
// ─────────────────────────────────────────

export type UploadStatus = 'uploading' | 'processing' | 'ready' | 'error'

export interface Upload {
  id: string
  userId: string
  filename: string
  fileType: 'pdf' | 'docx' | 'txt' | 'json'
  fileSize: number
  storagePath: string
  status: UploadStatus
  extractedText?: string
  parsedProfile?: Partial<ProfessionalProfile>
  errorMessage?: string
  createdAt: string
}

// ─────────────────────────────────────────
// Export
// ─────────────────────────────────────────

export type ExportFormat = 'pdf' | 'docx' | 'json' | 'txt'
export type ExportStatus = 'pending' | 'generating' | 'ready' | 'error'

export interface ExportRecord {
  id: string
  userId: string
  documentId: string
  format: ExportFormat
  status: ExportStatus
  downloadUrl?: string
  errorMessage?: string
  createdAt: string
}

// ─────────────────────────────────────────
// User Preferences
// ─────────────────────────────────────────

export interface UserPreferences {
  userId: string

  // Document defaults
  defaultTemplate: TemplateId
  defaultAccentColor: string
  defaultFontSize: 'compact' | 'normal' | 'spacious'

  // AI preferences
  aiProvider: 'openai' | 'anthropic' | 'gemini' | 'openrouter'
  aiModel?: string
  aiTone: 'professional' | 'confident' | 'academic' | 'concise'

  // Privacy
  allowPublicPortfolio: boolean
  allowAnalytics: boolean
  dataRetentionDays?: number

  // UI
  theme: 'dark' | 'light' | 'system'
  reducedMotion: boolean
  editorZoom: number

  updatedAt: string
}

// ─────────────────────────────────────────
// Application State (Zustand)
// ─────────────────────────────────────────

export interface AppUser {
  id: string
  email: string
  name?: string
  avatarUrl?: string
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'unsaved'

export interface ActiveDocument {
  document: EnvoyDocument
  profile: ProfessionalProfile
  saveStatus: SaveStatus
  lastSavedAt?: string
}

// ─────────────────────────────────────────
// API Response Types
// ─────────────────────────────────────────

export interface APISuccess<T> {
  success: true
  data: T
}

export interface APIError {
  success: false
  error: string
  code?: string
  details?: Record<string, unknown>
}

export type APIResponse<T> = APISuccess<T> | APIError

// ─────────────────────────────────────────
// AI Tool Types
// ─────────────────────────────────────────

export interface AIToolDefinition {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, unknown>
    required: string[]
  }
}

export type AIProviderName = 'openai' | 'anthropic' | 'gemini' | 'openrouter'
