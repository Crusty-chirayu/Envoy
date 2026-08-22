-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ENVOY — Supabase PostgreSQL Schema
-- Run this in the Supabase SQL editor, or use supabase db push
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────
-- PROFILES
-- The canonical professional profile (one per user for now)
-- ─────────────────────────────────────────

CREATE TABLE profiles (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data         JSONB NOT NULL DEFAULT '{}',  -- Full ProfessionalProfile JSON
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT profiles_user_id_unique UNIQUE (user_id)
);

CREATE INDEX idx_profiles_user_id ON profiles(user_id);

-- ─────────────────────────────────────────
-- DOCUMENTS
-- Resume, CV, or Portfolio documents
-- ─────────────────────────────────────────

CREATE TABLE documents (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('resume', 'cv', 'portfolio')),
  title        TEXT NOT NULL DEFAULT 'Untitled',
  sections     JSONB NOT NULL DEFAULT '[]',    -- DocumentSectionConfig[]
  settings     JSONB NOT NULL DEFAULT '{}',    -- DocumentSettings
  target_job_id UUID,                          -- references job_targets
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_exported_at TIMESTAMPTZ
);

CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_profile_id ON documents(profile_id);
CREATE INDEX idx_documents_type ON documents(type);

-- ─────────────────────────────────────────
-- DOCUMENT VERSIONS
-- Point-in-time snapshots of document + profile state
-- ─────────────────────────────────────────

CREATE TABLE document_versions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id         UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label               TEXT NOT NULL,
  trigger             TEXT NOT NULL CHECK (trigger IN ('manual', 'ai_accept', 'import', 'auto')),
  profile_snapshot    JSONB NOT NULL,    -- Full ProfessionalProfile at this point
  document_snapshot   JSONB NOT NULL,    -- Full EnvoyDocument at this point
  changed_sections    TEXT[] NOT NULL DEFAULT '{}',
  ai_origin           BOOLEAN NOT NULL DEFAULT FALSE,
  description         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX idx_document_versions_user_id ON document_versions(user_id);

-- ─────────────────────────────────────────
-- AI CONVERSATIONS
-- ─────────────────────────────────────────

CREATE TABLE ai_conversations (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id  UUID REFERENCES documents(id) ON DELETE SET NULL,
  title        TEXT NOT NULL DEFAULT 'New Conversation',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_document_id ON ai_conversations(document_id);

-- ─────────────────────────────────────────
-- AI MESSAGES
-- ─────────────────────────────────────────

CREATE TABLE ai_messages (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id  UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role             TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content          TEXT NOT NULL,
  tool_calls       JSONB,
  tool_results     JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_messages_conversation_id ON ai_messages(conversation_id);

-- ─────────────────────────────────────────
-- AI ACTIONS (Diffs)
-- ─────────────────────────────────────────

CREATE TABLE ai_actions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id  UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  message_id       UUID NOT NULL REFERENCES ai_messages(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id      UUID REFERENCES documents(id) ON DELETE CASCADE,
  diffs            JSONB NOT NULL,   -- DocumentDiff[]
  summary          TEXT NOT NULL,
  applied_at       TIMESTAMPTZ,
  version_id       UUID REFERENCES document_versions(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_actions_conversation_id ON ai_actions(conversation_id);
CREATE INDEX idx_ai_actions_user_id ON ai_actions(user_id);

-- ─────────────────────────────────────────
-- JOB TARGETS
-- ─────────────────────────────────────────

CREATE TABLE job_targets (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id  UUID REFERENCES documents(id) ON DELETE SET NULL,
  title        TEXT NOT NULL,
  company      TEXT,
  description  TEXT NOT NULL,
  url          TEXT,
  extracted    JSONB,    -- JobExtraction from AI
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_job_targets_user_id ON job_targets(user_id);

-- ─────────────────────────────────────────
-- ATS REPORTS
-- ─────────────────────────────────────────

CREATE TABLE ats_reports (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id      UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_target_id    UUID REFERENCES job_targets(id) ON DELETE SET NULL,
  overall_score    INTEGER NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  structure_score  INTEGER NOT NULL CHECK (structure_score BETWEEN 0 AND 100),
  keyword_score    INTEGER NOT NULL CHECK (keyword_score BETWEEN 0 AND 100),
  content_score    INTEGER NOT NULL CHECK (content_score BETWEEN 0 AND 100),
  readability_score INTEGER NOT NULL CHECK (readability_score BETWEEN 0 AND 100),
  risk_score       INTEGER NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
  issues           JSONB NOT NULL DEFAULT '[]',
  keyword_matches  TEXT[] NOT NULL DEFAULT '{}',
  missing_keywords TEXT[] NOT NULL DEFAULT '{}',
  match_percentage NUMERIC(5,2),
  page_count       INTEGER NOT NULL DEFAULT 1,
  word_count       INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ats_reports_document_id ON ats_reports(document_id);
CREATE INDEX idx_ats_reports_user_id ON ats_reports(user_id);

-- ─────────────────────────────────────────
-- UPLOADS
-- ─────────────────────────────────────────

CREATE TABLE uploads (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename        TEXT NOT NULL,
  file_type       TEXT NOT NULL CHECK (file_type IN ('pdf', 'docx', 'txt', 'json')),
  file_size       INTEGER NOT NULL,
  storage_path    TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'uploading' CHECK (status IN ('uploading', 'processing', 'ready', 'error')),
  extracted_text  TEXT,
  parsed_profile  JSONB,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_uploads_user_id ON uploads(user_id);

-- ─────────────────────────────────────────
-- EXPORTS
-- ─────────────────────────────────────────

CREATE TABLE exports (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id   UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  format        TEXT NOT NULL CHECK (format IN ('pdf', 'docx', 'json', 'txt')),
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'ready', 'error')),
  download_url  TEXT,
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exports_user_id ON exports(user_id);
CREATE INDEX idx_exports_document_id ON exports(document_id);

-- ─────────────────────────────────────────
-- PORTFOLIO SITES
-- ─────────────────────────────────────────

CREATE TABLE portfolio_sites (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  description     TEXT,
  theme           TEXT NOT NULL DEFAULT 'minimal' CHECK (theme IN ('minimal', 'bold', 'creative', 'developer')),
  accent_color    TEXT NOT NULL DEFAULT '#6366f1',
  visibility      TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'unlisted', 'private')),
  seo_title       TEXT,
  seo_description TEXT,
  social_image_url TEXT,
  sections        JSONB NOT NULL DEFAULT '[]',
  published_at    TIMESTAMPTZ,
  custom_domain   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_portfolio_sites_user_id ON portfolio_sites(user_id);
CREATE INDEX idx_portfolio_sites_slug ON portfolio_sites(slug);

-- ─────────────────────────────────────────
-- SHARE LINKS
-- ─────────────────────────────────────────

CREATE TABLE share_links (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_type   TEXT NOT NULL CHECK (resource_type IN ('document', 'portfolio')),
  resource_id     UUID NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  visibility      TEXT NOT NULL DEFAULT 'unlisted' CHECK (visibility IN ('public', 'unlisted', 'private')),
  allow_indexing  BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at      TIMESTAMPTZ,
  access_count    INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_share_links_user_id ON share_links(user_id);
CREATE INDEX idx_share_links_slug ON share_links(slug);

-- ─────────────────────────────────────────
-- USER PREFERENCES
-- ─────────────────────────────────────────

CREATE TABLE user_preferences (
  user_id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  default_template       TEXT NOT NULL DEFAULT 'minimal',
  default_accent_color   TEXT NOT NULL DEFAULT '#6366f1',
  default_font_size      TEXT NOT NULL DEFAULT 'normal',
  ai_provider            TEXT NOT NULL DEFAULT 'openai',
  ai_model               TEXT,
  ai_tone                TEXT NOT NULL DEFAULT 'professional',
  allow_public_portfolio BOOLEAN NOT NULL DEFAULT FALSE,
  allow_analytics        BOOLEAN NOT NULL DEFAULT FALSE,
  data_retention_days    INTEGER,
  theme                  TEXT NOT NULL DEFAULT 'dark',
  reduced_motion         BOOLEAN NOT NULL DEFAULT FALSE,
  editor_zoom            NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ROW LEVEL SECURITY
-- Every user can only see their own data
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ats_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Profiles: own data only
CREATE POLICY "Users can manage their own profile"
  ON profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Documents: own data only
CREATE POLICY "Users can manage their own documents"
  ON documents FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Document versions: own data only
CREATE POLICY "Users can manage their own versions"
  ON document_versions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- AI conversations: own data only
CREATE POLICY "Users can manage their own conversations"
  ON ai_conversations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- AI messages: through conversation ownership
CREATE POLICY "Users can access their conversation messages"
  ON ai_messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM ai_conversations
      WHERE id = ai_messages.conversation_id
      AND user_id = auth.uid()
    )
  );

-- AI actions: own data only
CREATE POLICY "Users can manage their own AI actions"
  ON ai_actions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Job targets: own data only
CREATE POLICY "Users can manage their own job targets"
  ON job_targets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ATS reports: own data only
CREATE POLICY "Users can manage their own ATS reports"
  ON ats_reports FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Uploads: own data only
CREATE POLICY "Users can manage their own uploads"
  ON uploads FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Exports: own data only
CREATE POLICY "Users can manage their own exports"
  ON exports FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Portfolio sites: own data + public access to public/unlisted
CREATE POLICY "Users can manage their own portfolios"
  ON portfolio_sites FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can view public/unlisted portfolios"
  ON portfolio_sites FOR SELECT
  USING (visibility IN ('public', 'unlisted'));

-- Share links: own data + public access
CREATE POLICY "Users can manage their own share links"
  ON share_links FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can read share links for access"
  ON share_links FOR SELECT
  USING (visibility IN ('public', 'unlisted'));

-- User preferences: own data only
CREATE POLICY "Users can manage their own preferences"
  ON user_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- AUTO-UPDATE TIMESTAMPS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_ai_conversations_updated_at
  BEFORE UPDATE ON ai_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_job_targets_updated_at
  BEFORE UPDATE ON job_targets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_portfolio_sites_updated_at
  BEFORE UPDATE ON portfolio_sites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- AUTO-CREATE PROFILE + PREFERENCES ON SIGNUP
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  new_profile_id UUID;
BEGIN
  -- Create empty profile
  INSERT INTO profiles (user_id, data)
  VALUES (
    NEW.id,
    jsonb_build_object(
      'id', uuid_generate_v4()::text,
      'userId', NEW.id::text,
      'identity', jsonb_build_object(
        'name', COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        'headline', '',
        'email', NEW.email
      ),
      'experience', '[]'::jsonb,
      'education', '[]'::jsonb,
      'skills', '[]'::jsonb,
      'projects', '[]'::jsonb,
      'certifications', '[]'::jsonb,
      'achievements', '[]'::jsonb,
      'publications', '[]'::jsonb,
      'awards', '[]'::jsonb,
      'volunteering', '[]'::jsonb,
      'languages', '[]'::jsonb,
      'interests', '[]'::jsonb,
      'customSections', '[]'::jsonb,
      'createdAt', NOW()::text,
      'updatedAt', NOW()::text
    )
  )
  RETURNING id INTO new_profile_id;

  -- Create default preferences
  INSERT INTO user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
