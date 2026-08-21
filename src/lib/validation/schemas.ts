import { z } from 'zod'

// ─────────────────────────────────────────
// Identity
// ─────────────────────────────────────────

export const SocialLinkSchema = z.object({
  platform: z.string().min(1),
  url: z.string().url(),
  label: z.string().optional(),
})

export const ProfileIdentitySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  headline: z.string().max(200).default(''),
  email: z.string().email('Invalid email address'),
  phone: z.string().max(30).optional(),
  location: z.string().max(100).optional(),
  website: z.string().url().optional().or(z.literal('')),
  linkedin: z.string().url().optional().or(z.literal('')),
  github: z.string().url().optional().or(z.literal('')),
  twitter: z.string().url().optional().or(z.literal('')),
  socials: z.array(SocialLinkSchema).default([]),
})

// ─────────────────────────────────────────
// Experience
// ─────────────────────────────────────────

export const ExperienceEntrySchema = z.object({
  id: z.string().uuid(),
  company: z.string().min(1, 'Company name is required').max(100),
  role: z.string().min(1, 'Role is required').max(100),
  location: z.string().max(100).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}$/, 'Date must be YYYY-MM format'),
  endDate: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  current: z.boolean(),
  bullets: z.array(z.string().max(500)).max(10),
  technologies: z.array(z.string().max(50)).max(20).optional(),
  url: z.string().url().optional().or(z.literal('')),
})

// ─────────────────────────────────────────
// Education
// ─────────────────────────────────────────

export const EducationEntrySchema = z.object({
  id: z.string().uuid(),
  institution: z.string().min(1).max(150),
  degree: z.string().min(1).max(150),
  field: z.string().max(100).optional(),
  location: z.string().max(100).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  current: z.boolean(),
  gpa: z.string().max(10).optional(),
  honors: z.string().max(200).optional(),
  coursework: z.array(z.string()).max(15).optional(),
  activities: z.array(z.string()).max(10).optional(),
})

// ─────────────────────────────────────────
// Skills
// ─────────────────────────────────────────

export const SkillGroupSchema = z.object({
  id: z.string().uuid(),
  category: z.string().min(1).max(50),
  skills: z.array(z.string().min(1).max(50)).min(1).max(30),
  proficiency: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
})

// ─────────────────────────────────────────
// Projects
// ─────────────────────────────────────────

export const ProjectEntrySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  bullets: z.array(z.string().max(300)).max(6).optional(),
  technologies: z.array(z.string().max(50)).max(20),
  url: z.string().url().optional().or(z.literal('')),
  github: z.string().url().optional().or(z.literal('')),
  startDate: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  current: z.boolean().optional(),
  featured: z.boolean().optional(),
  imageUrl: z.string().url().optional(),
})

// ─────────────────────────────────────────
// Other sections
// ─────────────────────────────────────────

export const CertificationEntrySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(150),
  issuer: z.string().min(1).max(100),
  date: z.string(),
  expiryDate: z.string().optional(),
  credentialId: z.string().max(100).optional(),
  url: z.string().url().optional().or(z.literal('')),
})

export const AchievementEntrySchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(150),
  description: z.string().max(500),
  date: z.string().optional(),
  organization: z.string().max(100).optional(),
})

export const PublicationEntrySchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(300),
  authors: z.array(z.string()).min(1),
  journal: z.string().max(200).optional(),
  conference: z.string().max(200).optional(),
  date: z.string(),
  doi: z.string().max(100).optional(),
  url: z.string().url().optional().or(z.literal('')),
  abstract: z.string().max(1000).optional(),
})

export const AwardEntrySchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(150),
  issuer: z.string().min(1).max(100),
  date: z.string().optional(),
  description: z.string().max(500).optional(),
})

export const VolunteerEntrySchema = z.object({
  id: z.string().uuid(),
  organization: z.string().min(1).max(150),
  role: z.string().min(1).max(100),
  startDate: z.string().regex(/^\d{4}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  current: z.boolean(),
  description: z.string().max(500).optional(),
  bullets: z.array(z.string().max(300)).max(6).optional(),
})

export const LanguageEntrySchema = z.object({
  id: z.string().uuid(),
  language: z.string().min(1).max(50),
  proficiency: z.enum(['native', 'fluent', 'professional', 'conversational', 'elementary']),
})

export const InterestEntrySchema = z.object({
  id: z.string().uuid(),
  interest: z.string().min(1).max(50),
})

export const CustomSectionEntrySchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(100),
  content: z.string().max(1000),
  bullets: z.array(z.string().max(300)).max(10).optional(),
})

export const CustomSectionSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(100),
  entries: z.array(CustomSectionEntrySchema),
  visible: z.boolean(),
  order: z.number().int().min(0),
})

// ─────────────────────────────────────────
// Full Profile
// ─────────────────────────────────────────

export const ProfessionalProfileSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  identity: ProfileIdentitySchema,
  summary: z.string().max(2000).optional(),
  experience: z.array(ExperienceEntrySchema).max(20),
  education: z.array(EducationEntrySchema).max(10),
  skills: z.array(SkillGroupSchema).max(15),
  projects: z.array(ProjectEntrySchema).max(20),
  certifications: z.array(CertificationEntrySchema).max(20),
  achievements: z.array(AchievementEntrySchema).max(20),
  publications: z.array(PublicationEntrySchema).max(30),
  awards: z.array(AwardEntrySchema).max(20),
  volunteering: z.array(VolunteerEntrySchema).max(10),
  languages: z.array(LanguageEntrySchema).max(10),
  interests: z.array(InterestEntrySchema).max(20),
  customSections: z.array(CustomSectionSchema).max(5),
})

// ─────────────────────────────────────────
// Document
// ─────────────────────────────────────────

export const DocumentSettingsSchema = z.object({
  template: z.enum(['minimal', 'modern', 'academic', 'developer']),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  fontFamily: z.enum(['inter', 'georgia', 'roboto', 'merriweather', 'source-code-pro']),
  fontSize: z.enum(['compact', 'normal', 'spacious']),
  pageMargin: z.enum(['narrow', 'normal', 'wide']),
  showPhoto: z.boolean(),
})

export const DocumentSectionConfigSchema = z.object({
  id: z.string(),
  type: z.enum(['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'achievements', 'publications', 'awards', 'volunteering', 'languages', 'interests', 'custom']),
  title: z.string().min(1).max(100),
  visible: z.boolean(),
  order: z.number().int().min(0),
  customSectionId: z.string().optional(),
})

export const EnvoyDocumentSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  profileId: z.string().uuid(),
  type: z.enum(['resume', 'cv', 'portfolio']),
  title: z.string().min(1).max(150),
  sections: z.array(DocumentSectionConfigSchema),
  settings: DocumentSettingsSchema,
  targetJobId: z.string().uuid().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastExportedAt: z.string().optional(),
})

// ─────────────────────────────────────────
// Job Target
// ─────────────────────────────────────────

export const JobDescriptionSchema = z.object({
  title: z.string().min(1).max(200),
  company: z.string().max(100).optional(),
  description: z.string().min(10).max(50000),
  url: z.string().url().optional().or(z.literal('')),
})

// ─────────────────────────────────────────
// Auth
// ─────────────────────────────────────────

export const SignUpSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must include an uppercase letter')
    .regex(/[0-9]/, 'Must include a number'),
})

export const SignInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const ResetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

// ─────────────────────────────────────────
// API Request Schemas
// ─────────────────────────────────────────

export const AIMessageRequestSchema = z.object({
  conversationId: z.string().uuid().optional(),
  documentId: z.string().uuid().optional(),
  message: z.string().min(1).max(10000),
  context: z.object({
    sectionId: z.string().optional(),
    selectedText: z.string().max(5000).optional(),
    targetJobId: z.string().uuid().optional(),
  }).optional(),
})

export const FileUploadSchema = z.object({
  fileType: z.enum(['pdf', 'docx', 'txt', 'json']),
  fileSize: z.number().int().max(10 * 1024 * 1024, 'File must be under 10MB'),
})

export const ATSAnalysisRequestSchema = z.object({
  documentId: z.string().uuid(),
  jobTargetId: z.string().uuid().optional(),
})

export const ExportRequestSchema = z.object({
  documentId: z.string().uuid(),
  format: z.enum(['pdf', 'docx', 'json', 'txt']),
})
