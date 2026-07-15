-- MultiContenu AI - Schéma final optimisé anti-spam
-- À exécuter dans Supabase SQL Editor.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tables principales
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  credits_remaining INTEGER NOT NULL DEFAULT 10 CHECK (credits_remaining >= 0),
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  source_content TEXT NOT NULL CHECK (char_length(source_content) BETWEEN 1 AND 20000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'twitter', 'instagram', 'tiktok', 'newsletter')),
  content TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  tokens_used INTEGER CHECK (tokens_used IS NULL OR tokens_used >= 0),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive', 'active', 'trialing', 'canceled', 'past_due', 'unpaid', 'incomplete', 'incomplete_expired', 'paused')),
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('generation', 'checkout_started', 'subscription_updated', 'subscription_deleted')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tables anti-spam / anti-coût IA
CREATE TABLE IF NOT EXISTS public.generation_daily_limits (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL,
  generation_count INTEGER NOT NULL DEFAULT 0 CHECK (generation_count >= 0),
  last_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, usage_date)
);

CREATE TABLE IF NOT EXISTS public.ip_rate_limits (
  ip_hash TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  last_request_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (ip_hash, window_start)
);

CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('generation_blocked', 'rate_limit_error')),
  reason TEXT NOT NULL,
  ip_hash TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generations_project_id ON public.generations(project_id);
CREATE INDEX IF NOT EXISTS idx_generations_platform ON public.generations(platform);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_user_id ON public.usage_events(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_created_at ON public.usage_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generation_daily_limits_date ON public.generation_daily_limits(usage_date DESC);
CREATE INDEX IF NOT EXISTS idx_ip_rate_limits_window ON public.ip_rate_limits(window_start DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON public.security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON public.security_events(user_id);

-- Fonctions utilitaires
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
    updated_at = NOW();

  INSERT INTO public.subscriptions (user_id, status, plan)
  VALUES (NEW.id, 'inactive', 'free')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_credit(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan TEXT;
  v_credits INTEGER;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  SELECT plan, credits_remaining
  INTO v_plan, v_credits
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF v_plan IN ('pro', 'enterprise') THEN
    RETURN TRUE;
  END IF;

  IF v_credits <= 0 THEN
    RETURN FALSE;
  END IF;

  UPDATE public.profiles
  SET credits_remaining = credits_remaining - 1
  WHERE id = p_user_id;

  RETURN TRUE;
END;
$$;

-- Réservation atomique anti-spam.
-- À appeler uniquement depuis le serveur avec la service role Supabase.
CREATE OR REPLACE FUNCTION public.reserve_generation_guard(
  p_user_id UUID,
  p_plan TEXT,
  p_daily_limit INTEGER,
  p_cooldown_seconds INTEGER,
  p_ip_hash TEXT,
  p_ip_hourly_limit INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_today DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
  v_window_start TIMESTAMPTZ := DATE_TRUNC('hour', NOW());
  v_user_limit public.generation_daily_limits%ROWTYPE;
  v_ip_count INTEGER;
  v_new_count INTEGER;
  v_retry_after INTEGER;
BEGIN
  IF p_user_id IS NULL OR p_daily_limit IS NULL OR p_daily_limit < 1 OR p_cooldown_seconds IS NULL OR p_cooldown_seconds < 1 OR p_ip_hourly_limit IS NULL OR p_ip_hourly_limit < 1 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'invalid_limit', 'retry_after_seconds', 60);
  END IF;

  INSERT INTO public.ip_rate_limits (ip_hash, window_start, request_count, last_request_at)
  VALUES (COALESCE(p_ip_hash, 'unknown'), v_window_start, 1, v_now)
  ON CONFLICT (ip_hash, window_start)
  DO UPDATE SET
    request_count = public.ip_rate_limits.request_count + 1,
    last_request_at = EXCLUDED.last_request_at,
    updated_at = v_now
  RETURNING request_count INTO v_ip_count;

  IF v_ip_count > p_ip_hourly_limit THEN
    INSERT INTO public.security_events (user_id, event_type, reason, ip_hash, metadata)
    VALUES (
      p_user_id,
      'generation_blocked',
      'ip_hourly_limit',
      p_ip_hash,
      jsonb_build_object('plan', p_plan, 'ip_hourly_limit', p_ip_hourly_limit, 'ip_count', v_ip_count)
    );

    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'ip_hourly_limit',
      'retry_after_seconds', GREATEST(1, EXTRACT(EPOCH FROM (v_window_start + INTERVAL '1 hour' - v_now))::INTEGER),
      'daily_limit', p_daily_limit
    );
  END IF;

  INSERT INTO public.generation_daily_limits (user_id, usage_date, generation_count, last_generated_at)
  VALUES (p_user_id, v_today, 0, NULL)
  ON CONFLICT (user_id, usage_date) DO NOTHING;

  SELECT * INTO v_user_limit
  FROM public.generation_daily_limits
  WHERE user_id = p_user_id AND usage_date = v_today
  FOR UPDATE;

  IF v_user_limit.last_generated_at IS NOT NULL AND v_now < v_user_limit.last_generated_at + MAKE_INTERVAL(secs => p_cooldown_seconds) THEN
    v_retry_after := GREATEST(
      1,
      EXTRACT(EPOCH FROM (v_user_limit.last_generated_at + MAKE_INTERVAL(secs => p_cooldown_seconds) - v_now))::INTEGER
    );

    INSERT INTO public.security_events (user_id, event_type, reason, ip_hash, metadata)
    VALUES (
      p_user_id,
      'generation_blocked',
      'cooldown',
      p_ip_hash,
      jsonb_build_object('plan', p_plan, 'cooldown_seconds', p_cooldown_seconds, 'retry_after_seconds', v_retry_after)
    );

    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'cooldown',
      'retry_after_seconds', v_retry_after,
      'remaining_today', GREATEST(p_daily_limit - v_user_limit.generation_count, 0),
      'daily_limit', p_daily_limit
    );
  END IF;

  IF v_user_limit.generation_count >= p_daily_limit THEN
    INSERT INTO public.security_events (user_id, event_type, reason, ip_hash, metadata)
    VALUES (
      p_user_id,
      'generation_blocked',
      'daily_limit',
      p_ip_hash,
      jsonb_build_object('plan', p_plan, 'daily_limit', p_daily_limit, 'generation_count', v_user_limit.generation_count)
    );

    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'daily_limit',
      'retry_after_seconds', GREATEST(1, EXTRACT(EPOCH FROM (((v_today + 1)::TIMESTAMPTZ) - v_now))::INTEGER),
      'remaining_today', 0,
      'daily_limit', p_daily_limit
    );
  END IF;

  UPDATE public.generation_daily_limits
  SET
    generation_count = generation_count + 1,
    last_generated_at = v_now,
    updated_at = v_now
  WHERE user_id = p_user_id AND usage_date = v_today
  RETURNING generation_count INTO v_new_count;

  RETURN jsonb_build_object(
    'allowed', true,
    'reason', 'ok',
    'remaining_today', GREATEST(p_daily_limit - v_new_count, 0),
    'daily_limit', p_daily_limit
  );
END;
$$;

-- Triggers
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS set_projects_updated_at ON public.projects;
DROP TRIGGER IF EXISTS set_subscriptions_updated_at ON public.subscriptions;
DROP TRIGGER IF EXISTS set_generation_daily_limits_updated_at ON public.generation_daily_limits;
DROP TRIGGER IF EXISTS set_ip_rate_limits_updated_at ON public.ip_rate_limits;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_generation_daily_limits_updated_at
BEFORE UPDATE ON public.generation_daily_limits
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_ip_rate_limits_updated_at
BEFORE UPDATE ON public.ip_rate_limits
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_daily_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own_public_fields" ON public.profiles;
DROP POLICY IF EXISTS "projects_select_own" ON public.projects;
DROP POLICY IF EXISTS "projects_insert_own" ON public.projects;
DROP POLICY IF EXISTS "projects_update_own" ON public.projects;
DROP POLICY IF EXISTS "projects_delete_own" ON public.projects;
DROP POLICY IF EXISTS "generations_select_own" ON public.generations;
DROP POLICY IF EXISTS "generations_insert_own" ON public.generations;
DROP POLICY IF EXISTS "generations_update_own" ON public.generations;
DROP POLICY IF EXISTS "subscriptions_select_own" ON public.subscriptions;
DROP POLICY IF EXISTS "usage_events_select_own" ON public.usage_events;
DROP POLICY IF EXISTS "usage_events_insert_own" ON public.usage_events;
DROP POLICY IF EXISTS "generation_daily_limits_select_own" ON public.generation_daily_limits;

CREATE POLICY "profiles_select_own"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "profiles_update_own_public_fields"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "projects_select_own"
ON public.projects FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "projects_insert_own"
ON public.projects FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "projects_update_own"
ON public.projects FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "projects_delete_own"
ON public.projects FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "generations_select_own"
ON public.generations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = generations.project_id
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "generations_insert_own"
ON public.generations FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = generations.project_id
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "generations_update_own"
ON public.generations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = generations.project_id
    AND projects.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = generations.project_id
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "subscriptions_select_own"
ON public.subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "usage_events_select_own"
ON public.usage_events FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "usage_events_insert_own"
ON public.usage_events FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "generation_daily_limits_select_own"
ON public.generation_daily_limits FOR SELECT
USING (auth.uid() = user_id);

-- Droits fins côté client Supabase
GRANT USAGE ON SCHEMA public TO anon, authenticated;

REVOKE ALL ON public.profiles FROM anon, authenticated;
REVOKE ALL ON public.projects FROM anon, authenticated;
REVOKE ALL ON public.generations FROM anon, authenticated;
REVOKE ALL ON public.subscriptions FROM anon, authenticated;
REVOKE ALL ON public.usage_events FROM anon, authenticated;
REVOKE ALL ON public.generation_daily_limits FROM anon, authenticated;
REVOKE ALL ON public.ip_rate_limits FROM anon, authenticated;
REVOKE ALL ON public.security_events FROM anon, authenticated;

GRANT SELECT ON public.profiles, public.projects, public.generations, public.usage_events TO authenticated;
GRANT SELECT (id, status, plan, current_period_end) ON public.subscriptions TO authenticated;
GRANT SELECT (user_id, usage_date, generation_count, last_generated_at) ON public.generation_daily_limits TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT INSERT, UPDATE ON public.generations TO authenticated;
GRANT INSERT ON public.usage_events TO authenticated;
GRANT UPDATE(full_name, avatar_url) ON public.profiles TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_credit(UUID) TO authenticated;

-- La fonction anti-spam est réservée au serveur via service role.
REVOKE ALL ON FUNCTION public.reserve_generation_guard(UUID, TEXT, INTEGER, INTEGER, TEXT, INTEGER) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_generation_guard(UUID, TEXT, INTEGER, INTEGER, TEXT, INTEGER) TO service_role;
