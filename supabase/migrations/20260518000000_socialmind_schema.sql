-- ============================================================
-- SocialMind - Schema Completo
-- Multi-tenant SaaS para automação de carrosséis no Instagram
-- ============================================================

-- Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. COMPANIES
-- ============================================================
CREATE TABLE public.companies (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name             TEXT NOT NULL,
    email            TEXT NOT NULL UNIQUE,
    phone            TEXT,
    plan             TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'agency')),
    posts_limit      INTEGER NOT NULL DEFAULT 12,
    posts_used_this_month INTEGER NOT NULL DEFAULT 0,
    reset_date       DATE NOT NULL DEFAULT (date_trunc('month', NOW() AT TIME ZONE 'UTC') + INTERVAL '1 month')::DATE,
    active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 2. COMPANY_CONTEXT
-- ============================================================
CREATE TABLE public.company_context (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id       UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    business_name    TEXT NOT NULL,
    niche            TEXT,
    city             TEXT,
    what_sells       TEXT,
    target_audience  TEXT,
    differentials    TEXT,
    tone_of_voice    TEXT,
    forbidden_words  TEXT,
    brand_colors     JSONB DEFAULT '{}',
    logo_url         TEXT,
    system_prompt    TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_company_context_company UNIQUE (company_id)
);

CREATE TRIGGER trg_company_context_updated_at
    BEFORE UPDATE ON public.company_context
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 3. INSTAGRAM_TOKENS
-- ============================================================
CREATE TABLE public.instagram_tokens (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id              UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    access_token            TEXT NOT NULL,
    token_expires_at        TIMESTAMPTZ,
    instagram_account_id    TEXT,
    instagram_username      TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_instagram_tokens_company UNIQUE (company_id)
);

CREATE TRIGGER trg_instagram_tokens_updated_at
    BEFORE UPDATE ON public.instagram_tokens
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 4. MEDIA_LIBRARY
-- ============================================================
CREATE TABLE public.media_library (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    url         TEXT NOT NULL,
    category    TEXT NOT NULL CHECK (category IN ('testimony', 'product', 'team', 'structure', 'brand')),
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. CONTENT_THEMES
-- ============================================================
CREATE TABLE public.content_themes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    theme_name  TEXT NOT NULL,
    tone        TEXT NOT NULL CHECK (tone IN ('educational', 'motivational', 'promotional')),
    slides_count INTEGER NOT NULL DEFAULT 7,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 6. POST_SCHEDULES
-- ============================================================
CREATE TABLE public.post_schedules (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id     UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    theme_id       UUID REFERENCES public.content_themes(id) ON DELETE SET NULL,
    type           TEXT NOT NULL CHECK (type IN ('recurring', 'one_time')),
    day_of_week    TEXT CHECK (day_of_week IN ('monday','tuesday','wednesday','thursday','friday','saturday','sunday')),
    scheduled_date DATE,
    scheduled_time TIME NOT NULL,
    publish_mode   TEXT NOT NULL DEFAULT 'review' CHECK (publish_mode IN ('automatic', 'review')),
    status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
    repeat         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_post_schedules_updated_at
    BEFORE UPDATE ON public.post_schedules
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 7. POSTS
-- ============================================================
CREATE TABLE public.posts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    schedule_id         UUID REFERENCES public.post_schedules(id) ON DELETE SET NULL,
    content             JSONB DEFAULT '[]',
    slides_html         JSONB DEFAULT '[]',
    slides_images       JSONB DEFAULT '[]',
    caption             TEXT,
    instagram_post_id   TEXT,
    status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','waiting','approved','published','failed','rejected')),
    approved_at         TIMESTAMPTZ,
    published_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_posts_updated_at
    BEFORE UPDATE ON public.posts
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 8. NOTIFICATIONS
-- ============================================================
CREATE TABLE public.notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    type        TEXT NOT NULL CHECK (type IN ('post_ready', 'post_published', 'post_failed')),
    message     TEXT NOT NULL,
    read        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX idx_company_context_company_id    ON public.company_context(company_id);
CREATE INDEX idx_instagram_tokens_company_id   ON public.instagram_tokens(company_id);
CREATE INDEX idx_media_library_company_id      ON public.media_library(company_id);
CREATE INDEX idx_media_library_category        ON public.media_library(category);
CREATE INDEX idx_content_themes_company_id     ON public.content_themes(company_id);
CREATE INDEX idx_post_schedules_company_id     ON public.post_schedules(company_id);
CREATE INDEX idx_post_schedules_status         ON public.post_schedules(status);
CREATE INDEX idx_post_schedules_day_of_week    ON public.post_schedules(day_of_week);
CREATE INDEX idx_posts_company_id              ON public.posts(company_id);
CREATE INDEX idx_posts_status                  ON public.posts(status);
CREATE INDEX idx_posts_schedule_id             ON public.posts(schedule_id);
CREATE INDEX idx_posts_published_at            ON public.posts(published_at);
CREATE INDEX idx_notifications_company_id      ON public.notifications(company_id);
CREATE INDEX idx_notifications_read            ON public.notifications(company_id, read);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE public.companies          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_context    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_tokens   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_library      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_themes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_schedules     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications      ENABLE ROW LEVEL SECURITY;

-- Políticas: cada usuário enxerga apenas dados da sua própria empresa
-- O app deve armazenar o company_id no JWT (app_metadata) ou usar uma
-- tabela de mapeamento usuário→empresa. Exemplo com app_metadata:

-- companies: só quem é dono da empresa
CREATE POLICY "companies_tenant_isolation" ON public.companies
    FOR ALL USING (
        id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::UUID
    );

-- Tabelas filhas: isolamento via company_id no token
CREATE POLICY "company_context_tenant_isolation" ON public.company_context
    FOR ALL USING (
        company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::UUID
    );

CREATE POLICY "instagram_tokens_tenant_isolation" ON public.instagram_tokens
    FOR ALL USING (
        company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::UUID
    );

CREATE POLICY "media_library_tenant_isolation" ON public.media_library
    FOR ALL USING (
        company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::UUID
    );

CREATE POLICY "content_themes_tenant_isolation" ON public.content_themes
    FOR ALL USING (
        company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::UUID
    );

CREATE POLICY "post_schedules_tenant_isolation" ON public.post_schedules
    FOR ALL USING (
        company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::UUID
    );

CREATE POLICY "posts_tenant_isolation" ON public.posts
    FOR ALL USING (
        company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::UUID
    );

CREATE POLICY "notifications_tenant_isolation" ON public.notifications
    FOR ALL USING (
        company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::UUID
    );

-- ============================================================
-- FUNÇÃO: Gerar system_prompt automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_system_prompt(ctx public.company_context)
RETURNS TEXT AS $$
DECLARE
    prompt TEXT;
BEGIN
    prompt := format(
        E'Você é um especialista em marketing digital e copywriting para Instagram.\n\n'
        '## Empresa\n'
        'Nome: %s\n'
        'Nicho: %s\n'
        'Cidade: %s\n\n'
        '## O que vendemos\n%s\n\n'
        '## Público-alvo\n%s\n\n'
        '## Diferenciais\n%s\n\n'
        '## Tom de voz\n%s\n\n'
        '## Palavras proibidas\n%s\n\n'
        '## Instruções gerais\n'
        '- Crie conteúdo envolvente e adequado ao tom de voz especificado.\n'
        '- Nunca use as palavras proibidas listadas acima.\n'
        '- Foque sempre no público-alvo descrito.\n'
        '- Destaque os diferenciais da empresa de forma natural.\n'
        '- Os textos devem ser otimizados para carrosséis do Instagram.',
        COALESCE(ctx.business_name, ''),
        COALESCE(ctx.niche, 'não informado'),
        COALESCE(ctx.city, 'não informado'),
        COALESCE(ctx.what_sells, 'não informado'),
        COALESCE(ctx.target_audience, 'não informado'),
        COALESCE(ctx.differentials, 'não informado'),
        COALESCE(ctx.tone_of_voice, 'profissional e amigável'),
        COALESCE(ctx.forbidden_words, 'nenhuma')
    );
    RETURN prompt;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger: regenerar system_prompt ao inserir ou atualizar company_context
CREATE OR REPLACE FUNCTION public.trg_fn_auto_system_prompt()
RETURNS TRIGGER AS $$
BEGIN
    -- Só regenera se system_prompt não foi fornecido explicitamente
    IF NEW.system_prompt IS NULL OR NEW.system_prompt = '' THEN
        NEW.system_prompt := public.generate_system_prompt(NEW);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_system_prompt
    BEFORE INSERT OR UPDATE ON public.company_context
    FOR EACH ROW EXECUTE FUNCTION public.trg_fn_auto_system_prompt();

-- ============================================================
-- FUNÇÃO: Resetar posts_used_this_month mensalmente
-- ============================================================
CREATE OR REPLACE FUNCTION public.reset_monthly_posts()
RETURNS VOID AS $$
BEGIN
    UPDATE public.companies
    SET
        posts_used_this_month = 0,
        reset_date = (date_trunc('month', NOW() AT TIME ZONE 'UTC') + INTERVAL '1 month')::DATE
    WHERE
        reset_date <= (NOW() AT TIME ZONE 'UTC')::DATE
        AND active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- AGENDAMENTO AUTOMÁTICO via pg_cron
-- (Requer extensão pg_cron habilitada no Supabase)
-- Execute no SQL Editor com permissão de superuser:
--
-- SELECT cron.schedule(
--     'reset-monthly-posts',
--     '0 0 1 * *',           -- todo dia 1 de cada mês à meia-noite UTC
--     'SELECT public.reset_monthly_posts();'
-- );
-- ============================================================

-- ============================================================
-- FUNÇÃO HELPER: Incrementar posts_used_this_month com checagem de limite
-- ============================================================
CREATE OR REPLACE FUNCTION public.increment_posts_used(p_company_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_limit   INTEGER;
    v_used    INTEGER;
BEGIN
    SELECT posts_limit, posts_used_this_month
    INTO v_limit, v_used
    FROM public.companies
    WHERE id = p_company_id AND active = TRUE
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    IF v_used >= v_limit THEN
        RETURN FALSE;  -- limite atingido
    END IF;

    UPDATE public.companies
    SET posts_used_this_month = posts_used_this_month + 1
    WHERE id = p_company_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNÇÃO HELPER: Atualizar posts_limit ao trocar de plano
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_plan_limit()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.plan = 'starter' THEN
        NEW.posts_limit := 12;
    ELSIF NEW.plan = 'pro' THEN
        NEW.posts_limit := 30;
    ELSIF NEW.plan = 'agency' THEN
        NEW.posts_limit := 90;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_plan_limit
    BEFORE INSERT OR UPDATE OF plan ON public.companies
    FOR EACH ROW EXECUTE FUNCTION public.update_plan_limit();
