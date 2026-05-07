create table if not exists public.daily_insights (
  id uuid primary key default gen_random_uuid(),
  insight_date date not null unique,
  cards jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.daily_insights enable row level security;

create policy "insights_read_all" on public.daily_insights
  for select to authenticated using (true);

create index if not exists daily_insights_date_idx on public.daily_insights(insight_date desc);