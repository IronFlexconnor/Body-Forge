
-- coach_pulses (proactive coach)
CREATE TABLE IF NOT EXISTS public.coach_pulses (
  user_id uuid NOT NULL,
  pulse_date date NOT NULL,
  message text NOT NULL,
  cta text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, pulse_date)
);
GRANT SELECT ON public.coach_pulses TO authenticated;
GRANT ALL ON public.coach_pulses TO service_role;
ALTER TABLE public.coach_pulses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users read own pulses" ON public.coach_pulses;
CREATE POLICY "users read own pulses" ON public.coach_pulses
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- push_subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users manage own push subs" ON public.push_subscriptions;
CREATE POLICY "users manage own push subs" ON public.push_subscriptions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_user ON public.push_subscriptions (user_id);

-- Notification prefs on profile
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_prefs jsonb NOT NULL DEFAULT '{}'::jsonb;

-- macro_adjustments (adaptive macros)
CREATE TABLE IF NOT EXISTS public.macro_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  old_calories int,
  new_calories int NOT NULL,
  weight_trend_kg_per_week numeric,
  target_trend_kg_per_week numeric,
  rationale text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.macro_adjustments TO authenticated;
GRANT ALL ON public.macro_adjustments TO service_role;
ALTER TABLE public.macro_adjustments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users read own macro adjustments" ON public.macro_adjustments;
CREATE POLICY "users read own macro adjustments" ON public.macro_adjustments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_macro_adjustments_user_time
  ON public.macro_adjustments (user_id, created_at DESC);
