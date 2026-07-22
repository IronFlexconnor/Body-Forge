-- Long-term memory for Coach Forge: one evolving summary per user,
-- written by edge functions (service role), readable by the owner.
CREATE TABLE public.coach_memories (
  user_id uuid PRIMARY KEY,
  summary text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coach_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own memory" ON public.coach_memories
  FOR SELECT USING (auth.uid() = user_id);
