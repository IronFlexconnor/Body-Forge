-- Proactive coach: daily pulse tracking + web push subscriptions + reminder prefs.

-- One coach pulse per user per day (written by service role, readable by owner)
CREATE TABLE public.coach_pulses (
  user_id uuid NOT NULL,
  pulse_date date NOT NULL,
  message text NOT NULL,
  cta text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, pulse_date)
);
ALTER TABLE public.coach_pulses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own pulses" ON public.coach_pulses
  FOR SELECT USING (auth.uid() = user_id);

-- Web push subscriptions (owner-managed)
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own push subs" ON public.push_subscriptions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_push_subs_user ON public.push_subscriptions (user_id);

-- Reminder preferences on the profile
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_prefs jsonb NOT NULL DEFAULT '{}'::jsonb;
