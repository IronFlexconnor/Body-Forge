-- Adaptive macros: weekly calorie auto-tuning from the user's real weight trend.
-- The adaptive-macros edge function (service role) writes one row per adjustment;
-- users can read their own history so the UI can show "why my target changed".

CREATE TABLE public.macro_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  old_calories int,
  new_calories int NOT NULL,
  weight_trend_kg_per_week numeric,          -- observed trend (negative = losing)
  target_trend_kg_per_week numeric,          -- goal-implied trend
  rationale text NOT NULL,                   -- human-readable explanation shown to the user
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.macro_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own macro adjustments" ON public.macro_adjustments
  FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX idx_macro_adjustments_user_time
  ON public.macro_adjustments (user_id, created_at DESC);
