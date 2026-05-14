-- App roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "users see own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "admins see all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Perf events: page-load + AI first-token latency telemetry
CREATE TABLE public.perf_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  event_type text NOT NULL,           -- 'fcp' | 'lcp' | 'ttfb' | 'load' | 'ai_first_token' | 'ai_total'
  value_ms integer NOT NULL,
  route text,
  device text,                         -- 'phone' | 'tablet' | 'desktop'
  release text,                        -- app version / git sha
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_perf_events_created_at ON public.perf_events (created_at DESC);
CREATE INDEX idx_perf_events_type_created ON public.perf_events (event_type, created_at DESC);

ALTER TABLE public.perf_events ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can insert their own telemetry
CREATE POLICY "insert own perf events" ON public.perf_events
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Only admins can read
CREATE POLICY "admins read perf events" ON public.perf_events
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));